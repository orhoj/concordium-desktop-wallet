import React from 'react';
import { RemoveBaker } from '~/utils/types';
import styles from './transferDetails.module.scss';
import { useAccountName } from '~/utils/hooks';

interface Props {
    transaction: RemoveBaker;
}

/**
 * Displays an overview of remove baker transaction.
 */
export default function DisplayAddBaker({ transaction }: Props) {
    const senderName = useAccountName(transaction.sender);
    return (
        <>
            <p className={styles.title}>From Account:</p>
            <p className={styles.name}>{senderName}</p>
            <p className={styles.address}>{transaction.sender}</p>
        </>
    );
}
