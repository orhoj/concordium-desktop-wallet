import React from 'react';
import { UpdateBakerRestakeEarnings } from '~/utils/types';
import DisplayEstimatedFee from '~/components/DisplayEstimatedFee';
import { useAccountName } from '~/utils/hooks';
import styles from './transferDetails.module.scss';
import DisplayTransactionExpiryTime from '../DisplayTransactionExpiryTime/DisplayTransactionExpiryTime';
import { dateFromTimeStamp } from '~/utils/timeHelpers';

interface Props {
    transaction: UpdateBakerRestakeEarnings;
}

/**
 * Displays an overview of an Update-Baker-Restake-Earnings-Transaction.
 */
export default function DisplayUpdateBakerRestakeEarnings({
    transaction,
}: Props) {
    const senderName = useAccountName(transaction.sender);
    return (
        <>
            <p className={styles.title}>From Account:</p>
            <p className={styles.name}>{senderName}</p>
            <p className={styles.address}>{transaction.sender}</p>
            <p className={styles.title}>Restake earnings:</p>
            <p className={styles.amount}>
                {transaction.payload.restakeEarnings ? 'Yes' : 'No'}
            </p>
            <DisplayEstimatedFee estimatedFee={transaction.estimatedFee} />
            <DisplayTransactionExpiryTime
                expiryTime={dateFromTimeStamp(transaction.expiry)}
            />
        </>
    );
}
