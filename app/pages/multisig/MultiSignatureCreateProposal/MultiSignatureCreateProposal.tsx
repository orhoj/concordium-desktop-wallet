import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { push } from 'connected-react-router';
import { stringify } from 'json-bigint';
import { useParams } from 'react-router';

import { FieldValues } from 'react-hook-form';
import {
    HigherLevelKeyUpdate,
    instanceOfUpdateInstruction,
    MultiSignatureTransaction,
    MultiSignatureTransactionStatus,
    UpdateType,
} from '~/utils/types';
import routes from '~/constants/routes.json';
import findHandler from '~/utils/updates/HandlerFinder';
import Loading from '~/cross-app-components/Loading';
import Modal from '~/cross-app-components/Modal';
import { proposalsSelector } from '~/features/MultiSignatureSlice';
import { parse } from '~/utils/JSONHelper';
import Form from '~/components/Form';
import { getNow, TimeConstants } from '~/utils/timeHelpers';
import { futureDate } from '~/components/Form/util/validation';

import styles from './MultiSignatureCreateProposal.module.scss';
import withBlockSummary, { WithBlockSummary } from '../common/withBlockSummary';
import MultiSignatureLayout from '../MultiSignatureLayout';
import CreateKeyUpdateProposal from '../updates/CreateKeyUpdateProposal';

export interface MultiSignatureCreateProposalForm {
    effectiveTime: Date;
}

/**
 * Component for displaying the UI required to create a multi signature transaction
 * proposal. It dynamically loads the correct component to show wrapped in a bit of
 * generic UI.
 * The component retrieves the block summary of the last finalized block, which
 * is used to get the threshold and sequence number required for update instructions.
 */
function MultiSignatureCreateProposal({ blockSummary }: WithBlockSummary) {
    const loading = !blockSummary;
    const proposals = useSelector(proposalsSelector);
    const [restrictionModalOpen, setRestrictionModalOpen] = useState(false);
    const dispatch = useDispatch();

    // TODO Add support for account transactions.
    const { updateType } = useParams<{ updateType: string }>();
    const type = parseInt(updateType, 10);

    const displayType = UpdateType[type];

    const handler = findHandler(type);
    const UpdateComponent = handler.update;

    /**
     * Forwards the multi signature transactions to the signing page.
     */
    async function forwardTransactionToSigningPage(
        multiSignatureTransaction: Partial<MultiSignatureTransaction>
    ) {
        const signInput = {
            multiSignatureTransaction,
            blockSummary,
        };

        // Forward the transaction under creation to the signing page.
        dispatch(
            push({
                pathname: routes.MULTISIGTRANSACTIONS_SIGN_TRANSACTION,
                state: stringify(signInput),
            })
        );
    }

    function openDuplicateTypeExists(): boolean {
        return proposals.some((existingProposal) => {
            const existingUpdateInstruction = parse(
                existingProposal.transaction
            );
            return (
                instanceOfUpdateInstruction(existingUpdateInstruction) &&
                existingProposal.status ===
                    MultiSignatureTransactionStatus.Open &&
                existingUpdateInstruction.type === type
            );
        });
    }

    async function handleSubmit(
        fields: FieldValues & MultiSignatureCreateProposalForm
    ): Promise<void> {
        if (!blockSummary) {
            return;
        }

        const { effectiveTime, ...dynamicFields } = fields;
        const timeInSeconds = BigInt(
            Math.round(effectiveTime.getTime() / 1000)
        );

        const proposal = await handler.createTransaction(
            blockSummary,
            dynamicFields,
            timeInSeconds
        );

        if (proposal) {
            forwardTransactionToSigningPage(proposal);
        }
    }

    /**
     * Form submit function used for the higher level keys updates. They do not
     * use Form element to input all the keys, so therefore it cannot use the
     * regular handleSubmit function.
     */
    async function handleKeySubmit(
        effectiveTime: Date,
        higherLevelKeyUpdate: HigherLevelKeyUpdate
    ) {
        if (!blockSummary) {
            return;
        }
        const timeInSeconds = BigInt(
            Math.round(effectiveTime.getTime() / 1000)
        );
        const proposal = await handler.createTransaction(
            blockSummary,
            higherLevelKeyUpdate,
            timeInSeconds
        );

        if (proposal) {
            forwardTransactionToSigningPage(proposal);
        }
    }

    const RestrictionModal = (
        <Modal
            open={restrictionModalOpen}
            onOpen={() => {}}
            onClose={() => dispatch(push(routes.MULTISIGTRANSACTIONS))}
        >
            An update of this type is already open, and must be submitted or
            closed, before opening a new update of the same kind.
        </Modal>
    );

    if (!restrictionModalOpen && openDuplicateTypeExists()) {
        setRestrictionModalOpen(true);
    }

    let component;

    // TODO Check for one of the key update types here (includes in a set.)
    if (type === UpdateType.UpdateRootKeysWithRootKeys) {
        if (!blockSummary) {
            component = <Loading text="Getting current settings from chain" />;
        } else {
            component = (
                <CreateKeyUpdateProposal
                    blockSummary={blockSummary}
                    type={type}
                    handleKeySubmit={handleKeySubmit}
                />
            );
        }
    } else {
        component = (
            <>
                <h3 className={styles.subHeader}>Transaction details</h3>
                <Form<FieldValues & MultiSignatureCreateProposalForm>
                    className={styles.details}
                    onSubmit={handleSubmit}
                >
                    <div className={styles.proposal}>
                        <p>
                            Add all the details for the {displayType}{' '}
                            transaction below.
                        </p>
                        {loading && (
                            <Loading text="Getting current settings from chain" />
                        )}
                        {blockSummary && (
                            <>
                                <UpdateComponent blockSummary={blockSummary} />
                                <Form.Timestamp
                                    name="effectiveTime"
                                    label="Effective Time"
                                    defaultValue={
                                        new Date(
                                            getNow() + 5 * TimeConstants.Minute
                                        )
                                    }
                                    rules={{
                                        required: 'Effective time is required',
                                        validate: futureDate(
                                            'Effective time must be in the future'
                                        ),
                                    }}
                                />
                            </>
                        )}
                    </div>
                    <Form.Submit disabled={!blockSummary}>Continue</Form.Submit>
                </Form>
            </>
        );
    }

    return (
        <MultiSignatureLayout
            pageTitle={handler.title}
            stepTitle={`Transaction Proposal - ${handler.type}`}
        >
            {RestrictionModal}
            {component}
        </MultiSignatureLayout>
    );
}

export default withBlockSummary(MultiSignatureCreateProposal);
