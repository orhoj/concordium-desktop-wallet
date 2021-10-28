import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { push } from 'connected-react-router';
import Button from '~/cross-app-components/Button';
import Card from '~/cross-app-components/Card';
import routes from '~/constants/routes.json';
import {
    chosenAccountInfoSelector,
    chosenAccountSelector,
} from '~/features/AccountSlice';
import { getNextAccountNonce } from '~/node/nodeRequests';
import { stringify } from '~/utils/JSONHelper';
import { createRemoveBakerTransaction } from '~/utils/transactionHelpers';
import { SubmitTransferLocationState } from '../SubmitTransfer/SubmitTransfer';

import styles from './AccountDetailsPage.module.scss';
import { multiplyFraction } from '~/utils/basicHelpers';
import { getEnergyToMicroGtuRate } from '~/node/nodeHelpers';
import BakerPendingChange from '~/components/BakerPendingChange';

export default function RemoveBaker() {
    const account = useSelector(chosenAccountSelector);
    const accountInfo = useSelector(chosenAccountInfoSelector);
    const dispatch = useDispatch();

    const pendingChange = accountInfo?.accountBaker?.pendingChange;

    const next = useCallback(async () => {
        if (!account) {
            throw new Error('No account selected');
        }

        const { nonce } = await getNextAccountNonce(account.address);
        const transaction = await createRemoveBakerTransaction(
            account.address,
            nonce
        );
        const exchangeRate = await getEnergyToMicroGtuRate();

        transaction.estimatedFee = multiplyFraction(
            exchangeRate,
            transaction.energyAmount
        );
        const serialized = stringify(transaction);
        const state: SubmitTransferLocationState = {
            account,
            transaction: serialized,
            cancelled: {
                pathname: routes.ACCOUNTS_REMOVE_BAKER,
            },
            confirmed: {
                pathname: routes.ACCOUNTS_FINAL_PAGE,
                state: {
                    transaction: serialized,
                },
            },
        };

        dispatch(push({ pathname: routes.SUBMITTRANSFER, state }));
    }, [dispatch, account]);

    return (
        <Card className="textCenter pB40">
            <h3 className="bodyEmphasized">Remove baker</h3>
            {pendingChange ? (
                <>
                    Cannot remove baker, because{' '}
                    <BakerPendingChange pending={pendingChange} />
                </>
            ) : (
                <>
                    <p className="mT30">
                        This will remove the baker status of the account. After
                        the grace period the full staked amount will be unlocked
                        for disposal.
                    </p>
                    <Button onClick={next} className={styles.bakerFlowContinue}>
                        Continue
                    </Button>
                </>
            )}
        </Card>
    );
}
