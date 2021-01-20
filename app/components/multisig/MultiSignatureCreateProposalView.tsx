import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Menu } from 'semantic-ui-react';
import { settingsSelector } from '../../features/SettingsSlice';
import { Settings } from '../../utils/types';

// TODO This enum should probably not reside here.
/**
 * An enumeration that contains the foundation/governance transaction
 * types.
 */
export enum FoundationTransactionTypes {
    UpdateAuthorizationKeys,
    UpdateChainProtocol,
    UpdateElectionDifficulty,
    UpdateEuroEnergyRate,
    UpdateMicroGtuPerEuroRate,
}

export default function MultiSignatureProposalView() {
    const settings: Settings[] = useSelector(settingsSelector);

    const availableTransactionTypes = Object.keys(
        FoundationTransactionTypes
    ).filter((key) => isNaN(Number(key)));

    // TODO Selecting a specific setting should be moved to its own selector. This is cumbersome and is a pattern that will be
    // re-used at some point. Type conversion could be done by looking at the type field.

    // MONDAY: Move this to a selector.
    // MONDAY: When clicking load switch component with clicked value that determines which page to load.
    const foundationTransactionsEnabled: boolean =
        settings[0].settings.find(
            (obj) => obj.name === 'foundationTransactionsEnabled'
        )?.value === '1';

    // if (foundationTransactionsEnabled) {
    //     let foundationTransactionTypes = Object.keys(FoundationTransactionTypes).filter(key => isNaN(Number(key)));
    //     availableTransactionTypes = availableTransactionTypes.concat(foundationTransactionTypes);
    // }

    return (
        <Menu vertical fluid size="massive">
            {availableTransactionTypes.map((item) => (
                <Menu.Item
                    as={Link}
                    to={{
                        pathname: `/MultiSignatureTransaction/create/${item}`,
                        state:
                            FoundationTransactionTypes.UpdateMicroGtuPerEuroRate,
                    }}
                >
                    {item}
                </Menu.Item>
            ))}
        </Menu>
    );
}
