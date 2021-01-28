import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import { history, configuredStore } from './store';
import './app.global.css';
import { updateSettings } from './features/SettingsSlice';
import { loadAllSettings } from './database/SettingsDao';
import { getAll } from './database/MultiSignatureProposalDao';
import getMultiSignatureTransactionStatus from './utils/TransactionStatusPoller';
import { MultiSignatureTransactionStatus } from './utils/types';

const store = configuredStore();

/**
 * Loads settings from the database into the store.
 */
async function loadSettingsIntoStore() {
    const settings = await loadAllSettings();
    return store.dispatch(updateSettings(settings));
}
loadSettingsIntoStore();

/**
 * Load all submitted proposals from the database, and
 * start listening for their status towards the node.
 */
async function listenForTransactionStatus(dispatch) {
    const allProposals = await getAll();
    allProposals
        .filter(
            (proposal) =>
                proposal.status === MultiSignatureTransactionStatus.Submitted
        )
        .forEach((proposal) => {
            getMultiSignatureTransactionStatus(proposal, dispatch);
        });
}
listenForTransactionStatus(store.dispatch);

const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

document.addEventListener('DOMContentLoaded', () => {
    // eslint-disable-next-line global-require
    const Root = require('./containers/Root').default;
    render(
        <AppContainer>
            <Root store={store} history={history} />
        </AppContainer>,
        document.getElementById('root')
    );
});
