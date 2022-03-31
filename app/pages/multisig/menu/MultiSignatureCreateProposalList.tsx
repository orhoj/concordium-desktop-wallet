import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ButtonNavLink from '~/components/ButtonNavLink';
import { foundationTransactionsEnabledSelector } from '~/features/SettingsSlice';
import {
    TransactionTypes,
    UpdateType,
    TransactionKindId as TransactionKind,
    TransactionKindId,
} from '~/utils/types';
import { createProposalRoute } from '~/utils/routerHelper';
import { proposalsSelector } from '~/features/MultiSignatureSlice';
import { expireProposals } from '~/utils/ProposalHelper';
import routes from '~/constants/routes.json';
import { useProtocolVersion } from '~/utils/dataHooks';
import { hasDelegationProtocol } from '~/utils/protocolVersion';
import { not } from '~/utils/functionHelpers';

import styles from '../MultiSignaturePage/MultiSignaturePage.module.scss';

type SpecificType = UpdateType | TransactionKind;
type TypeTuple = [
    TransactionTypes,
    SpecificType,
    string,
    ((pv: bigint) => boolean)?
];

// Defines the list of options for creating multi signature transactions.
const updateInstructionTypes: TypeTuple[] = [
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateMicroGTUPerEuro,
        'Update µCCD per euro',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateEuroPerEnergy,
        'Update euro per energy',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateTransactionFeeDistribution,
        'Update transaction fee distribution',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateFoundationAccount,
        'Update foundation account address',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateMintDistribution,
        'Update mint distribution',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateProtocol,
        'Update protocol',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateGASRewards,
        'Update GAS rewards',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateElectionDifficulty,
        'Update election difficulty',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateBakerStakeThreshold,
        'Update baker stake threshold',
        not(hasDelegationProtocol),
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateRootKeys,
        'Update root keys',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateLevel1KeysUsingRootKeys,
        'Update level 1 keys using root keys',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateLevel1KeysUsingLevel1Keys,
        'Update level 1 keys using level 1 keys',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateLevel2KeysUsingRootKeys,
        'Update level 2 keys using root keys',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.UpdateLevel2KeysUsingLevel1Keys,
        'Update level 2 keys using level 1 keys',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.AddIdentityProvider,
        'Add identity provider',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.AddAnonymityRevoker,
        'Add anonymity revoker',
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.CooldownParameters,
        'Update cooldown parameters',
        hasDelegationProtocol,
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.PoolParameters,
        'Update pool parameters',
        hasDelegationProtocol,
    ],
    [
        TransactionTypes.UpdateInstruction,
        UpdateType.TimeParameters,
        'Update time parameters',
        hasDelegationProtocol,
    ],
];

/**
 * [Transaction type, Transaction kind, Button label, Protocol version filter]
 */
const accountTransactionTypes: TypeTuple[] = [
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Update_credentials,
        'Update account credentials',
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Simple_transfer,
        'Send CCD',
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Transfer_with_schedule,
        'Send CCD with a schedule',
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Register_data,
        'Register Data',
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Add_baker,
        'Add baker',
        not(hasDelegationProtocol),
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Update_baker_keys,
        'Update baker keys',
        not(hasDelegationProtocol),
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Remove_baker,
        'Remove baker',
        not(hasDelegationProtocol),
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Update_baker_stake,
        'Update baker stake',
        not(hasDelegationProtocol),
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Update_baker_restake_earnings,
        'Update baker restake earnings',
        not(hasDelegationProtocol),
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Configure_baker,
        'Configure baker',
        hasDelegationProtocol,
    ],
    [
        TransactionTypes.AccountTransaction,
        TransactionKind.Configure_delegation,
        'Configure delegation',
        hasDelegationProtocol,
    ],
];

const configureBakerLinks = (
    <>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_ADD_BAKER}
        >
            Register as a baker
        </ButtonNavLink>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_UPDATE_BAKER_STAKE}
        >
            Update baker stake
        </ButtonNavLink>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_UPDATE_BAKER_POOL}
        >
            Update baker pool
        </ButtonNavLink>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_UPDATE_BAKER_KEYS}
        >
            Update baker keys
        </ButtonNavLink>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_REMOVE_BAKER}
        >
            Stop baking
        </ButtonNavLink>
    </>
);

const configureDelegationLinks = (
    <>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_ADD_DELEGATION}
        >
            Delegate to a pool
        </ButtonNavLink>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_UPDATE_DELEGATION}
        >
            Update delegation
        </ButtonNavLink>
        <ButtonNavLink
            className={styles.link}
            to={routes.MULTISIGTRANSACTIONS_REMOVE_DELEGATION}
        >
            Remove delegation
        </ButtonNavLink>
    </>
);

// eslint-disable-next-line react/display-name
const toLink = (pv: bigint | undefined) => ([
    transactionType,
    specificType,
    label,
    filter = () => true,
]: TypeTuple) =>
    pv !== undefined &&
    filter(pv) && (
        <Fragment key={`${transactionType}${specificType}`}>
            {[
                TransactionKindId.Configure_baker,
                TransactionKindId.Configure_delegation,
            ].every((k) => k !== specificType) && (
                <ButtonNavLink
                    className={styles.link}
                    to={createProposalRoute(transactionType, specificType)}
                >
                    {label}
                </ButtonNavLink>
            )}
        </Fragment>
    );
/**
 * Component that displays a menu containing the available multi signature
 * transaction types. If foundation transactions area enabled in settings,
 * then these are also listed here.
 */
export default function MultiSignatureCreateProposalView() {
    const proposals = useSelector(proposalsSelector);
    const pv = useProtocolVersion(true);
    const foundationTransactionsEnabled: boolean = useSelector(
        foundationTransactionsEnabledSelector
    );
    const dispatch = useDispatch();

    useEffect(() => {
        return expireProposals(proposals, dispatch);
    }, [dispatch, proposals]);

    return (
        <>
            {accountTransactionTypes.map(toLink(pv))}
            {pv !== undefined && hasDelegationProtocol(pv) && (
                <>
                    {configureBakerLinks}
                    {configureDelegationLinks}
                </>
            )}
            {foundationTransactionsEnabled &&
                updateInstructionTypes.map(toLink(pv))}
        </>
    );
}
