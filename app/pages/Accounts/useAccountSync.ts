import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Mutex } from 'async-mutex';
import {
    chosenAccountSelector,
    chosenAccountInfoSelector,
    updateAccountInfo,
} from '~/features/AccountSlice';
import {
    updateTransactions,
    fetchNewestTransactions,
    resetTransactions,
    loadTransactions,
} from '~/features/TransactionSlice';
import { noOp } from '~/utils/basicHelpers';
import { AccountStatus } from '~/utils/types';
import useThunkDispatch from '~/store/useThunkDispatch';

// milliseconds between updates of the accountInfo
const accountInfoUpdateInterval = 30000;

export const accountInfoFailedMessage = (message: string) =>
    `Failed to load account information from your connected node due to: ${message}`;
const updateTransactionsFailedMessage = (message: string) =>
    `Failed to load transactions from external service due to: ${message}`;

/**
 * Keeps account info and transactions for selected account in sync. Is dependant on a full re-mount when chosen account changes.
 */
export default function useAccountSync(onError: (message: string) => void) {
    const dispatch = useThunkDispatch();
    const account = useSelector(chosenAccountSelector);
    const accountInfo = useSelector(chosenAccountInfoSelector);
    const abortUpdateRef = useRef(noOp);
    const { current: updateLock } = useRef(new Mutex());
    const [updateLooped, setUpdateLooped] = useState(false);

    useEffect(() => {
        if (
            account &&
            account.status === AccountStatus.Confirmed &&
            updateLooped
        ) {
            fetchNewestTransactions(dispatch, account);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        account?.transactionFilter?.bakingReward,
        account?.transactionFilter?.blockReward,
        account?.transactionFilter?.finalizationReward,
        account?.transactionFilter?.fromDate,
        account?.transactionFilter?.toDate,
        updateLooped,
    ]);

    useEffect(() => {
        if (!account) {
            return noOp;
        }

        updateAccountInfo(account, dispatch).catch((e: Error) =>
            onError(accountInfoFailedMessage(e.message))
        );
        const interval = setInterval(() => {
            updateAccountInfo(account, dispatch).catch((e: Error) =>
                onError(accountInfoFailedMessage(e.message))
            );
        }, accountInfoUpdateInterval);

        return () => {
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account?.status, account?.selfAmounts, account?.incomingAmounts]);

    useEffect(() => {
        (async () => {
            if (
                account?.status !== AccountStatus.Confirmed ||
                updateLock.isLocked() // If update is already running, we don't need to run again because of new transactions (accountInfo.accountAmount).
            ) {
                return;
            }

            const unlock = await updateLock.acquire();

            const update = dispatch(
                updateTransactions({
                    onFirstLoop() {
                        setUpdateLooped(true);
                    },
                    onError: (message) =>
                        onError(updateTransactionsFailedMessage(message)),
                })
            );

            abortUpdateRef.current = update.abort;

            await update;

            unlock();
            setUpdateLooped(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountInfo?.accountAmount, account?.status]);

    useEffect(
        () => () => {
            abortUpdateRef.current();
        },
        []
    );

    useEffect(() => {
        dispatch(resetTransactions());

        if (account?.status !== AccountStatus.Confirmed) {
            return noOp;
        }

        const load = dispatch(
            loadTransactions({
                showLoading: true,
                force: true,
            })
        );

        return () => {
            load.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(account?.transactionFilter)]);
}
