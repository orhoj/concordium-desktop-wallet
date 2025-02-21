import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Route, Switch, useRouteMatch, useLocation } from 'react-router';
import { push } from 'connected-react-router';
import { isBakerAccount } from '@concordium/node-sdk/lib/src/accountHelpers';
import MultiSignatureLayout from '../../MultiSignatureLayout/MultiSignatureLayout';
import Columns from '~/components/Columns';
import Button from '~/cross-app-components/Button';
import {
    Account,
    TransactionKindId,
    UpdateBakerRestakeEarnings,
    Fraction,
} from '~/utils/types';
import PickAccount from '~/components/PickAccount';
import SimpleErrorModal from '~/components/SimpleErrorModal';
import { createUpdateBakerRestakeEarningsTransaction } from '~/utils/transactionHelpers';
import routes from '~/constants/routes.json';
import { useAccountInfo, useTransactionCostEstimate } from '~/utils/dataHooks';
import SignTransaction from '../SignTransaction';
import UpdateBakerRestakeEarningsProposalDetails from '../proposal-details/UpdateBakerRestakeEarnings';
import { ensureExchangeRate } from '~/components/Transfers/withExchangeRate';
import { getNextAccountNonce } from '~/node/nodeRequests';
import errorMessages from '~/constants/errorMessages.json';
import LoadingComponent from '../LoadingComponent';
import {
    AccountTransactionSubRoutes,
    getLocationAfterAccounts,
} from '~/utils/accountRouterHelpers';
import ChooseExpiry from '../ChooseExpiry';
import { isMultiSig } from '~/utils/accountHelpers';
import Radios from '~/components/Form/Radios';
import { findAccountTransactionHandler } from '~/utils/transactionHandlers/HandlerFinder';
import { displayRestakeEarnings } from '~/utils/transactionFlows/configureBaker';

import styles from '../../common/MultiSignatureFlowPage.module.scss';

interface PageProps {
    exchangeRate: Fraction;
}

interface State {
    account?: Account;
}

function UpdateBakerRestakeEarningsPage({ exchangeRate }: PageProps) {
    const dispatch = useDispatch();

    const { state } = useLocation<State>();

    const { path, url } = useRouteMatch();
    const [account, setAccount] = useState<Account | undefined>(state?.account);
    const [restakeEarnings, setRestakeEarnings] = useState<boolean>();
    const [error, setError] = useState<string>();
    const [
        transaction,
        setTransaction,
    ] = useState<UpdateBakerRestakeEarnings>();
    const handler = findAccountTransactionHandler(
        TransactionKindId.Update_baker_restake_earnings
    );

    const estimatedFee = useTransactionCostEstimate(
        TransactionKindId.Update_baker_restake_earnings,
        exchangeRate,
        account?.signatureThreshold
    );

    const [expiryTime, setExpiryTime] = useState<Date>();

    useEffect(() => {
        if (error) {
            window.log.error(error);
        }
    }, [error]);

    const onCreateTransaction = async () => {
        if (account === undefined) {
            setError('Account is needed to make transaction');
            return;
        }

        if (restakeEarnings === undefined) {
            setError(
                'The restake earnings setting is needed to make transaction'
            );
            return;
        }

        const payload = { restakeEarnings };
        const accountNonce = await getNextAccountNonce(account.address);
        setTransaction(
            createUpdateBakerRestakeEarningsTransaction(
                account.address,
                payload,
                accountNonce.nonce,
                account?.signatureThreshold,
                expiryTime
            )
        );
    };

    return (
        <MultiSignatureLayout pageTitle={handler.title} delegateScroll>
            <SimpleErrorModal
                show={Boolean(error)}
                header="Unable to perform transfer"
                content={error}
                onClick={() => dispatch(push(routes.MULTISIGTRANSACTIONS))}
            />
            <Columns
                divider
                columnScroll
                className={styles.subtractContainerPadding}
            >
                <Columns.Column
                    header="Transaction details"
                    className={styles.stretchColumn}
                >
                    <div className={styles.columnContent}>
                        <UpdateBakerRestakeEarningsProposalDetails
                            account={account}
                            estimatedFee={estimatedFee}
                            restakeEarnings={restakeEarnings}
                            expiryTime={expiryTime}
                        />
                    </div>
                </Columns.Column>
                <Switch>
                    <Route exact path={path}>
                        <Columns.Column
                            header="Accounts"
                            className={styles.stretchColumn}
                        >
                            <div className={styles.columnContent}>
                                <div className="flexChildFill">
                                    <PickAccount
                                        setAccount={setAccount}
                                        chosenAccount={account}
                                        filter={(a, info) =>
                                            info !== undefined &&
                                            isBakerAccount(info) &&
                                            isMultiSig(a)
                                        }
                                        messageWhenEmpty="There are no baker accounts that require multiple signatures"
                                        onAccountClicked={() => {
                                            dispatch(
                                                push(
                                                    getLocationAfterAccounts(
                                                        url,
                                                        TransactionKindId.Update_baker_restake_earnings
                                                    )
                                                )
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </Columns.Column>
                    </Route>
                    <Route
                        path={`${path}/${AccountTransactionSubRoutes.restake}`}
                    >
                        <Columns.Column
                            header="Restake earnings"
                            className={styles.stretchColumn}
                        >
                            <div className={styles.columnContent}>
                                <div className="flexChildFill">
                                    {account !== undefined ? (
                                        <RestakeEarnings
                                            enable={restakeEarnings}
                                            accountAddress={account?.address}
                                            onChanged={setRestakeEarnings}
                                        />
                                    ) : null}
                                </div>
                                <Button
                                    className="mT40"
                                    disabled={restakeEarnings === undefined}
                                    onClick={() => {
                                        dispatch(
                                            push(
                                                `${url}/${AccountTransactionSubRoutes.expiry}`
                                            )
                                        );
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>
                        </Columns.Column>
                    </Route>

                    <Route
                        path={`${path}/${AccountTransactionSubRoutes.expiry}`}
                    >
                        <Columns.Column
                            header="Transaction expiry time"
                            className={styles.stretchColumn}
                        >
                            <ChooseExpiry
                                buttonText="Continue"
                                onClick={(expiry) => {
                                    setExpiryTime(expiry);
                                    onCreateTransaction()
                                        .then(() =>
                                            dispatch(
                                                push(
                                                    `${url}/${AccountTransactionSubRoutes.sign}`
                                                )
                                            )
                                        )
                                        .catch(() =>
                                            setError(
                                                errorMessages.unableToReachNode
                                            )
                                        );
                                }}
                            />
                        </Columns.Column>
                    </Route>
                    <Route path={`${path}/${AccountTransactionSubRoutes.sign}`}>
                        <Columns.Column
                            header="Signature and hardware wallet"
                            className={styles.stretchColumn}
                        >
                            {transaction !== undefined &&
                            account !== undefined ? (
                                <SignTransaction
                                    transaction={transaction}
                                    account={account}
                                />
                            ) : null}
                        </Columns.Column>
                    </Route>
                </Switch>
            </Columns>
        </MultiSignatureLayout>
    );
}

type RestakeEarningsProps = {
    accountAddress: string;
    enable?: boolean;
    onChanged: (enable: boolean) => void;
};

function RestakeEarnings({
    accountAddress,
    enable,
    onChanged,
}: RestakeEarningsProps) {
    const accountInfo = useAccountInfo(accountAddress);
    const restake =
        accountInfo !== undefined && isBakerAccount(accountInfo)
            ? accountInfo.accountBaker.restakeEarnings
            : undefined;

    useEffect(() => {
        if (enable === undefined && restake !== undefined) {
            onChanged(restake);
        }
    }, [restake, enable, onChanged]);

    return (
        <>
            <p className="mV30">Choose to restake earnings or not, below.</p>
            {restake !== undefined && (
                <div className="body3 mono mB10">
                    Current option: {displayRestakeEarnings(restake)}
                </div>
            )}
            <Radios
                label="Enable restake earnings"
                options={[
                    {
                        label: 'Yes, restake',
                        value: true,
                    },
                    {
                        label: 'No, don’t restake',
                        value: false,
                    },
                ]}
                value={enable}
                onChange={onChanged}
            />
        </>
    );
}

export default ensureExchangeRate(
    UpdateBakerRestakeEarningsPage,
    LoadingComponent
);
