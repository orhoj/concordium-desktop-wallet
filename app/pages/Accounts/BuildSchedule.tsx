import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import { LocationDescriptorObject } from 'history';
import { stringify } from '~/utils/JSONHelper';
import routes from '~/constants/routes.json';
import { Account, AddressBookEntry, Schedule, Fraction } from '~/utils/types';
import { displayAsGTU, toGTUString } from '~/utils/gtu';
import { createScheduledTransferTransaction } from '~/utils/transactionHelpers';
import locations from '~/constants/transferLocations.json';
import RegularInterval from '~/components/BuildSchedule/BuildRegularInterval';
import ExplicitSchedule from '~/components/BuildSchedule/BuildExplicitSchedule';
import { BuildScheduleDefaults } from '~/components/BuildSchedule/util';
import { scheduledTransferCost } from '~/utils/transactionCosts';
import SimpleErrorModal from '~/components/SimpleErrorModal';
import TransferView from '~/components/Transfers/TransferView';
import styles from './Accounts.module.scss';
import DisplayEstimatedFee from '~/components/DisplayEstimatedFee';
import ButtonGroup from '~/components/ButtonGroup';

interface State {
    account: Account;
    amount: string;
    recipient: AddressBookEntry;
    defaults?: BuildScheduleDefaults;
}

interface Props {
    location: LocationDescriptorObject<State>;
}

/**
 * Allows the user to build the schedule of a scheduled transfer.
 */
export default function BuildSchedule({ location }: Props) {
    const [explicit, setExplicit] = useState<boolean>(
        location?.state?.defaults?.explicit || false
    );
    const dispatch = useDispatch();

    if (!location.state) {
        throw new Error('Unexpected missing state.');
    }

    const [error, setError] = useState<string | undefined>();
    const [scheduleLength, setScheduleLength] = useState<number>(0);
    const [estimatedFee, setEstimatedFee] = useState<Fraction | undefined>();
    const [feeCalculator, setFeeCalculator] = useState<
        ((scheduleLength: number) => Fraction) | undefined
    >();
    useEffect(() => {
        scheduledTransferCost()
            .then((calculator) => setFeeCalculator(() => calculator))
            .catch((e) =>
                setError(`Unable to get transaction cost due to: ${e}`)
            );
    }, []);

    useEffect(() => {
        if (feeCalculator && scheduleLength) {
            setEstimatedFee(feeCalculator(scheduleLength));
        } else {
            setEstimatedFee(undefined);
        }
    }, [scheduleLength, setEstimatedFee, feeCalculator]);

    const { account, amount, recipient, defaults } = location.state;

    const createTransaction = useCallback(
        async (schedule: Schedule, recoverState: unknown) => {
            const transaction = await createScheduledTransferTransaction(
                account.address,
                recipient.address,
                schedule
            );
            transaction.estimatedFee = estimatedFee;
            const transactionJSON = stringify(transaction);
            dispatch(
                push({
                    pathname: routes.SUBMITTRANSFER,
                    state: {
                        confirmed: {
                            pathname:
                                routes.ACCOUNTS_MORE_CREATESCHEDULEDTRANSFER,
                            state: {
                                transaction: transactionJSON,
                                account,
                                recipient,
                                initialPage: locations.transferSubmitted,
                            },
                        },
                        cancelled: {
                            pathname: routes.ACCOUNTS_SCHEDULED_TRANSFER,
                            state: {
                                account,
                                amount,
                                defaults: recoverState,
                                recipient,
                            },
                        },
                        transaction: transactionJSON,
                        account,
                    },
                })
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [JSON.stringify(account), estimatedFee, recipient]
    );

    const BuildComponent = explicit ? ExplicitSchedule : RegularInterval;

    if (!feeCalculator) {
        return (
            <>
                <SimpleErrorModal
                    show={Boolean(error)}
                    content={error}
                    onClick={() => dispatch(push(routes.ACCOUNTS))}
                />
            </>
        );
    }

    return (
        <TransferView
            className={styles.buildSchedule}
            showBack
            exitOnClick={() => dispatch(push(routes.ACCOUNTS))}
            backOnClick={() =>
                dispatch(
                    push({
                        pathname: routes.ACCOUNTS_MORE_CREATESCHEDULEDTRANSFER,
                        state: { amount: toGTUString(amount), recipient },
                    })
                )
            }
        >
            <div className={styles.buildScheduleCommon}>
                <h3 className={styles.title}>
                    {' '}
                    Send fund with a release schedule{' '}
                </h3>
                <div className={styles.scheduleAmount}>
                    <h2>
                        {displayAsGTU(amount)} to {recipient.name}
                    </h2>
                    <DisplayEstimatedFee estimatedFee={estimatedFee} />
                </div>
                <ButtonGroup
                    buttons={[
                        { label: 'Regular Interval', value: false },
                        { label: 'Explicit Schedule', value: true },
                    ]}
                    isSelected={({ value }) => value === explicit}
                    onClick={({ value }) => setExplicit(value)}
                    name="scheduleType"
                    title="Schedule type:"
                />
            </div>
            <BuildComponent
                defaults={defaults}
                setScheduleLength={setScheduleLength}
                submitSchedule={createTransaction}
                amount={BigInt(amount)}
            />
        </TransferView>
    );
}
