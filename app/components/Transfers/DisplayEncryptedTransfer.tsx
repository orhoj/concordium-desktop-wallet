import React from 'react';
import { useRouteMatch } from 'react-router';
import routes from '~/constants/routes.json';
import { AddressBookEntry, EncryptedTransfer } from '~/utils/types';
import { displayAsGTU } from '~/utils/gtu';
import DisplayEstimatedFee from '~/components/DisplayEstimatedFee';
import DisplayTransactionExpiryTime from '../DisplayTransactionExpiryTime/DisplayTransactionExpiryTime';
import { dateFromTimeStamp } from '~/utils/timeHelpers';
import DisplayMemo from '~/components/DisplayMemo';

import styles from './transferDetails.module.scss';

interface Props {
    transaction: EncryptedTransfer;
    to?: AddressBookEntry;
    fromName?: string;
}

/**
 * Displays an overview of an encrypted transfer.
 */
export default function DisplayEncryptedTransfer({
    transaction,
    fromName,
    to,
}: Props) {
    const singleSigTransfer = useRouteMatch(routes.SUBMITTRANSFER);
    return (
        <>
            <p className={styles.title}>From Account:</p>
            <p className={styles.name}>{fromName}</p>
            <p className={styles.address}>{transaction.sender}</p>
            <p className={styles.title}>To Account:</p>
            <p className={styles.name}>{to?.name}</p>
            <p className={styles.address}>{transaction.payload.toAddress}</p>
            {to?.note && <p className={styles.note}>Note: {to?.note}</p>}
            <p className={styles.title}>Amount:</p>
            <p className={styles.amount}>
                {displayAsGTU(transaction.payload.plainTransferAmount)}
            </p>
            <DisplayEstimatedFee estimatedFee={transaction.estimatedFee} />
            <DisplayMemo memo={transaction.payload.memo} />
            {Boolean(singleSigTransfer) || (
                <DisplayTransactionExpiryTime
                    expiryTime={dateFromTimeStamp(transaction.expiry)}
                />
            )}
        </>
    );
}
