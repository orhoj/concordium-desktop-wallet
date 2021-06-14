import React from 'react';
import clsx from 'clsx';
import { Redirect } from 'react-router';
import { useSelector, useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { Switch, Route } from 'react-router-dom';
import { Account, AccountInfo, TransactionKindId } from '../../utils/types';
import routes from '../../constants/routes.json';
import ShowAccountAddress from './ShowAccountAddress';
import ShowReleaseSchedule from './ShowReleaseSchedule';
import ScheduleTransfer from './ScheduleTransfer';
import TransferLogFilters from './TransferLogFilters';
import CredentialInformation from './CredentialInformation';
import CloseButton from '~/cross-app-components/CloseButton';
import Card from '~/cross-app-components/Card';
import ButtonNavLink from '~/components/ButtonNavLink';
import styles from './Accounts.module.scss';
import { accountHasDeployedCredentialsSelector } from '~/features/CredentialSlice';
import { createTransferWithAccountRoute } from '~/utils/accountRouterHelpers';
import { hasEncryptedBalance } from '~/utils/accountHelpers';

interface Props {
    account: Account;
    accountInfo: AccountInfo;
}

interface MoreActionObject {
    name: string;
    location: string;
    isDisabled?: (
        hasCredential: boolean,
        usedEncrypted: boolean,
        isBaker: boolean
    ) => boolean;
}

const items: MoreActionObject[] = [
    { name: 'Account Address', location: routes.ACCOUNTS_MORE_ADDRESS },
    {
        name: 'Inspect release schedule',
        location: routes.ACCOUNTS_MORE_INSPECTRELEASESCHEDULE,
    },
    {
        name: 'Send GTU with a schedule',
        location: routes.ACCOUNTS_MORE_CREATESCHEDULEDTRANSFER,
        isDisabled: (hasCredential) => !hasCredential,
    },
    {
        name: 'Update credentials',
        location: routes.ACCOUNTS_MORE_UPDATE_CREDENTIALS,
        isDisabled: (hasCredential, usedEncrypted) =>
            !hasCredential || usedEncrypted,
    },
    {
        name: 'Add baker',
        location: routes.ACCOUNTS_MORE_ADD_BAKER,
        isDisabled: (hasCredential, _encrypted, isBaker) =>
            !hasCredential || isBaker,
    },
    {
        name: 'Remove Baker',
        location: routes.ACCOUNTS_MORE_REMOVE_BAKER,
        isDisabled: (hasCredential, _encrypted, isBaker) =>
            !hasCredential || !isBaker,
    },
    {
        name: 'Transfer Log Filters',
        location: routes.ACCOUNTS_MORE_TRANSFER_LOG_FILTERS,
    },
    {
        name: 'Make Account Report',
        location: routes.ACCOUNT_REPORT,
    },
    {
        name: 'Credential Information',
        location: routes.ACCOUNTS_MORE_CREDENTIAL_INFORMATION,
    },
];

/**
 * Lists additional actions, for the account.
 * And controls the flow of those actions' pages.
 */
export default function MoreActions({ account, accountInfo }: Props) {
    const dispatch = useDispatch();
    const returnFunction = () => dispatch(push(routes.ACCOUNTS_MORE));

    const accountHasDeployedCredentials = useSelector(
        accountHasDeployedCredentialsSelector(account)
    );
    const hasUsedEncrypted = hasEncryptedBalance(accountInfo);

    function MoreActionsMenu() {
        return (
            <Card className="relative flexColumn pH50 bgOffWhite">
                <h3 className="textCenter">More Actions</h3>
                <CloseButton
                    className={styles.closeButton}
                    onClick={() => dispatch(push(routes.ACCOUNTS))}
                />
                {items.map((item) => {
                    const isDisabled =
                        item.isDisabled &&
                        item.isDisabled(
                            accountHasDeployedCredentials,
                            hasUsedEncrypted,
                            Boolean(accountInfo.accountBaker)
                        );
                    return (
                        <ButtonNavLink
                            to={{
                                pathname: item.location,
                                state: account,
                            }}
                            key={item.location}
                            disabled={isDisabled}
                            className={clsx(
                                'h3 mV10',
                                isDisabled && styles.disabledAction
                            )}
                            size="big"
                        >
                            {item.name}
                        </ButtonNavLink>
                    );
                })}
            </Card>
        );
    }
    return (
        <Switch>
            <Route
                path={routes.ACCOUNTS_MORE_ADDRESS}
                render={() => (
                    <ShowAccountAddress
                        account={account}
                        returnFunction={returnFunction}
                    />
                )}
            />
            <Route
                path={routes.ACCOUNTS_MORE_INSPECTRELEASESCHEDULE}
                render={() => (
                    <ShowReleaseSchedule
                        accountInfo={accountInfo}
                        returnFunction={returnFunction}
                    />
                )}
            />
            <Route
                path={routes.ACCOUNTS_MORE_CREATESCHEDULEDTRANSFER}
                render={() => (
                    <ScheduleTransfer
                        account={account}
                        returnFunction={returnFunction}
                    />
                )}
            />
            <Route
                path={routes.ACCOUNTS_MORE_TRANSFER_LOG_FILTERS}
                render={() => (
                    <TransferLogFilters
                        account={account}
                        returnFunction={returnFunction}
                    />
                )}
            />
            <Route
                path={routes.ACCOUNTS_MORE_CREDENTIAL_INFORMATION}
                render={() => (
                    <CredentialInformation
                        account={account}
                        accountInfo={accountInfo}
                        returnFunction={returnFunction}
                    />
                )}
            />
            <Route
                path={routes.ACCOUNTS_MORE_UPDATE_CREDENTIALS}
                render={() => (
                    <Redirect
                        to={createTransferWithAccountRoute(
                            TransactionKindId.Update_credentials,
                            account
                        )}
                    />
                )}
            />
            <Route
                path={routes.ACCOUNTS_MORE_ADD_BAKER}
                render={() => (
                    <Redirect
                        to={createTransferWithAccountRoute(
                            TransactionKindId.Add_baker,
                            account
                        )}
                    />
                )}
            />
            <Route
                path={routes.ACCOUNTS_MORE_REMOVE_BAKER}
                render={() => (
                    <Redirect
                        to={createTransferWithAccountRoute(
                            TransactionKindId.Remove_baker,
                            account
                        )}
                    />
                )}
            />
            <Route component={MoreActionsMenu} />
        </Switch>
    );
}
