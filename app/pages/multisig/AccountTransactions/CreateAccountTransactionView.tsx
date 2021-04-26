import React from 'react';
import { useParams } from 'react-router';
import { TransactionKindString } from '~/utils/types';
import SimpleTransfer from './SimpleTransfer';
import UpdateCredentialPage from './UpdateCredentialsPage';

export default function CreateAccountTransactionView(): JSX.Element {
    const { transactionKind } = useParams<{
        transactionKind: TransactionKindString;
    }>();

    if (transactionKind === TransactionKindString.UpdateCredentials) {
        return <UpdateCredentialPage />;
    }
    if (transactionKind === TransactionKindString.Transfer) {
        return <SimpleTransfer />;
    }
    throw new Error(`unsupported transaction type: ${transactionKind}`);
}
