import React from 'react';
import { useSelector } from 'react-redux';
import TransactionListElement from './TransactionListElement';
import { TransferTransaction } from '~/utils/types';
import {
    transactionsSelector,
    moreTransactionsSelector,
} from '~/features/TransactionSlice';

interface Props {
    onTransactionClick: (transaction: TransferTransaction) => void;
}

/**
 * Displays the currently chosen transactions
 * Takes a function chooseElement, to allows the parent
 * to get notified of clicked transactions.
 */
function TransactionList({ onTransactionClick }: Props): JSX.Element {
    const transactions = useSelector(transactionsSelector);
    const more = useSelector(moreTransactionsSelector);

    if (transactions.length === 0) {
        return (
            <h3 className="flex justifyCenter pB20">
                This balance has no transactions yet.
            </h3>
        );
    }

    return (
        <>
            {transactions.reverse().map((transaction: TransferTransaction) => (
                <TransactionListElement
                    onClick={() => onTransactionClick(transaction)}
                    key={transaction.transactionHash || transaction.id}
                    transaction={transaction}
                />
            ))}
            {more && (
                <h3 className="flex justifyCenter mT10 pB10">
                    Export to see older transactions
                </h3>
            )}
        </>
    );
}

export default TransactionList;
