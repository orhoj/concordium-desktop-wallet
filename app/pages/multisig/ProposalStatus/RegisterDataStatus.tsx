/* eslint-disable promise/catch-or-return */
import React from 'react';
import { useAccountName } from '~/utils/dataHooks';
import { RegisterData, MultiSignatureTransactionStatus } from '~/utils/types';
import ProposalStatusView, {
    ProposalStatusViewProps,
} from './ProposalStatusView';

interface AddBakerProposalStatusProps
    extends Pick<ProposalStatusViewProps, 'className'> {
    transaction: RegisterData;
    status: MultiSignatureTransactionStatus;
}

export default function AddBakerProposalStatus({
    transaction,
    status,
    ...proposalStatusViewProps
}: AddBakerProposalStatusProps): JSX.Element {
    const senderName = useAccountName(transaction.sender);
    const { data } = transaction.payload;
    return (
        <ProposalStatusView
            {...proposalStatusViewProps}
            headerLeft={senderName ?? transaction.sender}
            headerRight="Register data"
            status={status}
            title="Register Data"
        >
            <span className="textFaded">
                {data.substring(0, 8)}
                {data.length > 8 ? '...' : null}
            </span>
        </ProposalStatusView>
    );
}
