import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Switch, Route } from 'react-router-dom';
import {
    chosenAccountSelector,
    chosenAccountInfoSelector,
} from '~/features/AccountSlice';
import { updateTransactions } from '~/features/TransactionSlice';
import routes from '~/constants/routes.json';
import MoreActions from './MoreActions';
import SimpleTransfer from '~/components/Transfers/SimpleTransfer';
import ShieldAmount from '~/components/Transfers/ShieldAmount';
import UnshieldAmount from '~/components/Transfers/UnshieldAmount';
import TransferHistory from './TransferHistory';
import AccountBalanceView from './AccountBalanceView';
import AccountViewActions from './AccountViewActions';
import { AccountStatus } from '~/utils/types';

/**
 * Detailed view of the chosen account and its transactions.
 * Also contains controls for sending transfers.
 */
export default function AccountView() {
    const dispatch = useDispatch();
    const account = useSelector(chosenAccountSelector);
    const accountInfo = useSelector(chosenAccountInfoSelector);

    useEffect(() => {
        if (account && account.status === AccountStatus.Confirmed) {
            updateTransactions(dispatch, account);
        }
    }, [dispatch, account]);

    if (account === undefined) {
        return null;
    }

    if (accountInfo === undefined) {
        // TODO: Handle AccountInfo not available, either the account is not confirmed, or we can't reach the node.
        return null;
    }

    return (
        <>
            <AccountBalanceView />
            <AccountViewActions />
            <Switch>
                <Route
                    path={routes.ACCOUNTS_MORE}
                    render={() => (
                        <MoreActions
                            account={account}
                            accountInfo={accountInfo}
                        />
                    )}
                />
                <Route
                    path={routes.ACCOUNTS_SIMPLETRANSFER}
                    render={() => <SimpleTransfer account={account} />}
                />
                <Route
                    path={routes.ACCOUNTS_SHIELDAMOUNT}
                    render={() => <ShieldAmount account={account} />}
                />
                <Route
                    path={routes.ACCOUNTS_UNSHIELDAMOUNT}
                    render={() => <UnshieldAmount account={account} />}
                />
                <Route
                    path={routes.DEFAULT}
                    render={() => <TransferHistory account={account} />}
                />
            </Switch>
        </>
    );
}
