import AccountTransactionDetails from '../../components/Transfers/AccountTransactionDetails';
import ConcordiumLedgerClient from '../../features/ledger/ConcordiumLedgerClient';
import { AccountPathInput, getAccountPath } from '../../features/ledger/Path';
import { AccountTransactionHandler } from '../transactionTypes';
import {
    UpdateAccountCredentials,
    AccountTransaction,
    TransactionPayload,
    instanceOfUpdateAccountCredentials,
    TransactionKindString,
} from '../types';
import { serializeTransferPayload } from '../transactionSerialization';
import routes from '~/constants/routes.json';
import { selectedProposalRoute } from '~/utils/routerHelper';

const TYPE = 'Update Account Credentials';

type TransactionType = UpdateAccountCredentials;

export default class UpdateAccountCredentialsHandler
    implements
        AccountTransactionHandler<TransactionType, ConcordiumLedgerClient> {
    confirmType(
        transaction: AccountTransaction<TransactionPayload>
    ): TransactionType {
        if (instanceOfUpdateAccountCredentials(transaction)) {
            return transaction;
        }
        throw Error('Invalid transaction type was given as input.');
    }

    serializePayload(transaction: TransactionType) {
        return serializeTransferPayload(
            transaction.transactionKind,
            transaction.payload
        );
    }

    creationLocationHandler(currentLocation: string, proposalId: number) {
        const getNewLocation = () => {
            switch (currentLocation) {
                case routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION:
                    return routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_PICKACCOUNT;
                case routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_PICKACCOUNT:
                    return routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_ADDCREDENTIAL;
                case routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_ADDCREDENTIAL:
                    return routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_CHANGESIGNATURETHRESHOLD;
                case routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_CHANGESIGNATURETHRESHOLD:
                    return routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_SIGNTRANSACTION;
                case routes.MULTISIGTRANSACTIONS_CREATE_ACCOUNT_TRANSACTION_SIGNTRANSACTION:
                    return selectedProposalRoute(proposalId);
                default:
                    throw new Error('unknown location');
            }
        };
        return getNewLocation().replace(
            ':transactionKind',
            TransactionKindString.UpdateCredentials
        );
    }

    async signTransaction(
        transaction: TransactionType,
        ledger: ConcordiumLedgerClient,
        path: AccountPathInput
    ) {
        return ledger.signUpdateCredentialTransaction(
            transaction,
            getAccountPath(path)
        );
    }

    view(transaction: TransactionType) {
        return AccountTransactionDetails({ transaction });
    }

    title = `Account Transaction | ${TYPE}`;

    type = TYPE;
}
