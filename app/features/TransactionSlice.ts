import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store/store';
import { getTransactions, getGlobal } from '../utils/httpRequests';
import { decryptAmounts } from '../utils/rustInterface';
import {
    getTransactionsOfAccount,
    insertTransactions,
    updateTransaction,
    getMaxTransactionsIdOfAccount,
} from '../database/TransactionDao';
import {
    TransferTransaction,
    TransactionStatus,
    TransactionKindString,
    OriginType,
    Account,
    AccountTransaction,
    IncomingTransaction,
    Dispatch,
    SimpleTransfer,
    instanceOfSimpleTransfer,
    TransactionEvent,
    ScheduledTransfer,
    instanceOfScheduledTransfer,
} from '../utils/types';
import {
    attachNames,
    getScheduledTransferAmount,
} from '../utils/transactionHelpers';

const transactionSlice = createSlice({
    name: 'transactions',
    initialState: {
        transactions: [],
        viewingShielded: false,
    },
    reducers: {
        setTransactions(state, transactions) {
            state.transactions = transactions.payload;
        },
        setViewingShielded(state, viewingShielded) {
            state.viewingShielded = viewingShielded.payload;
        },
    },
});

export const { setViewingShielded } = transactionSlice.actions;

const { setTransactions } = transactionSlice.actions;

// Decrypts the encrypted transfers in the given transacion list, using the prfKey.
// This function expects the prfKey to match the account's prfKey,
// and that the account is the receiver of the transactions.
export async function decryptTransactions(
    transactions: TransferTransaction[],
    prfKey: string,
    account: Account
) {
    const global = await getGlobal();
    const encryptedTransfers = transactions.filter(
        (t) =>
            t.transactionKind ===
                TransactionKindString.EncryptedAmountTransfer &&
            t.decryptedAmount === null
    );

    if (encryptedTransfers.length > 0) {
        return Promise.resolve();
    }

    const encryptedAmounts = encryptedTransfers.map((t) => {
        if (!t.encrypted) {
            throw new Error('Unexpected missing field');
        }
        return JSON.parse(t.encrypted).encryptedAmount;
    });

    const decryptedAmounts = await decryptAmounts(
        encryptedAmounts,
        account,
        global,
        prfKey
    );

    return Promise.all(
        encryptedTransfers.map(async (transaction, index) =>
            updateTransaction(
                { id: transaction.id },
                {
                    decryptedAmount: decryptedAmounts[index],
                }
            )
        )
    );
}

/**
 * We have to do it like this, because the data from the wallet proxy
 * doesn't contain the receiving address, except in the event string.
 */
function getScheduleReceiver(transaction: IncomingTransaction) {
    const event = transaction.details.events[0];
    return event.slice(event.lastIndexOf(' ') + 1);
}

/*
 * Converts the given transaction into the structure, which is used in the database.
 */
function convertIncomingTransaction(
    transaction: IncomingTransaction,
    accountAddress: string
): Partial<TransferTransaction> {
    let fromAddress;
    if (transaction.details.transferSource) {
        fromAddress = transaction.details.transferSource;
    } else if (
        transaction.origin.type === OriginType.Account &&
        transaction.origin.address
    ) {
        fromAddress = transaction.origin.address;
    } else if (transaction.origin.type === OriginType.Self) {
        fromAddress = accountAddress;
    }
    let toAddress;
    if (transaction.details.transferDestination) {
        toAddress = transaction.details.transferDestination;
    }
    let encrypted;
    if (transaction.encrypted) {
        encrypted = JSON.stringify(transaction.encrypted);
    }

    if (
        transaction.details.type === TransactionKindString.TransferWithSchedule
    ) {
        if (transaction.origin.type === OriginType.Account) {
            toAddress = getScheduleReceiver(transaction);
        }
    }

    return {
        remote: true,
        originType: transaction.origin.type,
        transactionKind: transaction.details.type,
        id: transaction.id,
        blockHash: transaction.blockHash,
        blockTime: transaction.blockTime,
        total: transaction.total,
        success: transaction.details.outcome === 'success',
        transactionHash: transaction.transactionHash,
        subtotal: transaction.subtotal,
        cost: transaction.cost,
        origin: JSON.stringify(transaction.origin),
        details: JSON.stringify(transaction.details),
        encrypted,
        fromAddress,
        toAddress,
        status: TransactionStatus.Finalized,
    };
}

/**
 * Determine whether the transaction affects unshielded balance.
 */
function filterUnShieldedBalanceTransaction(transaction: TransferTransaction) {
    switch (transaction.transactionKind) {
        case TransactionKindString.Transfer:
        case TransactionKindString.BakingReward:
        case TransactionKindString.TransferWithSchedule:
        case TransactionKindString.TransferToEncrypted:
        case TransactionKindString.TransferToPublic:
            return true;
        default:
            return false;
    }
}

/**
 * Determine whether the transaction affects shielded balance.
 */
function filterShieldedBalanceTransaction(transaction: TransferTransaction) {
    switch (transaction.transactionKind) {
        case TransactionKindString.EncryptedAmountTransfer:
        case TransactionKindString.TransferToEncrypted:
        case TransactionKindString.TransferToPublic:
            return true;
        default:
            return false;
    }
}

// Load transactions from storage.
// Filters according to viewingShielded parameter
export async function loadTransactions(
    account: Account,
    viewingShielded: boolean,
    dispatch: Dispatch
) {
    const filter = viewingShielded
        ? filterShieldedBalanceTransaction
        : filterUnShieldedBalanceTransaction;
    let transactions = await getTransactionsOfAccount(
        account,
        filter,
        'blockTime'
    );
    transactions = await attachNames(transactions);
    dispatch(setTransactions(transactions));
}

// Update the transaction from remote source.
export async function updateTransactions(account: Account) {
    const fromId = (await getMaxTransactionsIdOfAccount(account)) || 0;
    const transactions = await getTransactions(account.address, fromId);
    if (transactions.length > 0) {
        await insertTransactions(
            transactions.map((transaction) =>
                convertIncomingTransaction(transaction, account.address)
            )
        );
    }
}

type TypeSpecific = Pick<
    TransferTransaction,
    'transactionKind' | 'total' | 'subtotal' | 'schedule'
>;
function convertSimpleTransfer(transaction: SimpleTransfer): TypeSpecific {
    const amount = BigInt(transaction.payload.amount);
    const estimatedTotal = amount + BigInt(transaction.energyAmount); // Fix this: convert from energy to cost

    return {
        transactionKind: TransactionKindString.Transfer,
        total: (-estimatedTotal).toString(),
        subtotal: (-amount).toString(),
    };
}

function convertScheduledTransfer(
    transaction: ScheduledTransfer
): TypeSpecific {
    const amount = getScheduledTransferAmount(transaction);
    const estimatedTotal = amount + BigInt(transaction.energyAmount); // Fix this: convert from energy to cost

    return {
        transactionKind: TransactionKindString.TransferWithSchedule,
        total: (-estimatedTotal).toString(),
        subtotal: (-amount).toString(),
        schedule: JSON.stringify(transaction.payload.schedule),
    };
}

function convertAccountTransaction(
    transaction: AccountTransaction,
    hash: string
): TransferTransaction {
    let typeSpecific;
    if (instanceOfSimpleTransfer(transaction)) {
        typeSpecific = convertSimpleTransfer(transaction);
    } else if (instanceOfScheduledTransfer(transaction)) {
        typeSpecific = convertScheduledTransfer(transaction);
    } else {
        throw new Error('unsupported transaction type - please implement');
    }

    return {
        id: -1,
        blockHash: 'pending',
        remote: false,
        originType: OriginType.Self,
        transactionHash: hash,
        cost: transaction.energyAmount, // Fix this: convert from energy to cost
        fromAddress: transaction.sender,
        toAddress: transaction.payload.toAddress,
        blockTime: (Date.now() / 1000).toString(), // Temporary value, unless it fails
        status: TransactionStatus.Pending,
        ...typeSpecific,
    };
}

// Add a pending transaction to storage
export async function addPendingTransaction(
    transaction: AccountTransaction,
    hash: string
) {
    const convertedTransaction = convertAccountTransaction(transaction, hash);
    return insertTransactions([convertedTransaction]);
}

// Set the transaction's status to confirmed, update the cost and whether it succeded.
// TODO: update Total to reflect change in cost.
export async function confirmTransaction(
    transactionHash: string,
    dataObject: Record<string, TransactionEvent>
) {
    const outcomes = Object.values(dataObject.outcomes);
    const success = outcomes.reduce(
        (accu, event) => accu && event.result.outcome === 'success',
        true
    );
    const cost = outcomes.reduce((accu, event) => accu + event.cost, 0);
    let rejectReason;
    if (!success) {
        rejectReason = outcomes.find(
            (event) => event.result.outcome !== 'success'
        ).result.rejectReason.tag;
    }
    return updateTransaction(
        { transactionHash },
        {
            status: TransactionStatus.Finalized,
            cost: cost.toString(),
            success,
            rejectReason,
        }
    );
}

// Set the transaction's status to rejected.
export async function rejectTransaction(transactionHash: string) {
    return updateTransaction(
        { transactionHash },
        { status: TransactionStatus.Rejected }
    );
}

export const transactionsSelector = (state: RootState) =>
    state.transactions.transactions;

export const viewingShieldedSelector = (state: RootState) =>
    state.transactions.viewingShielded;

export default transactionSlice.reducer;
