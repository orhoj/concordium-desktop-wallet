import { Dispatch, Identity, IdentityStatus } from './types';
import { getIdObject } from './httpRequests';
import { getAccountsOfIdentity } from '../database/AccountDao';
import { confirmIdentity, rejectIdentity } from '../features/IdentitySlice';
import {
    confirmInitialAccount,
    removeInitialAccount,
} from '../features/AccountSlice';
import { isInitialAccount } from './accountHelpers';
import { addToAddressBook } from '../features/AddressBookSlice';
import { getAllIdentities } from '../database/IdentityDao';
import { insertNewCredential } from '../features/CredentialSlice';

/**
 * Listens until, the identityProvider confirms the identity/initial account and returns the identityObject.
 * Then updates the identity/initial account in the database.
 * If not confirmed, the identity will be marked as rejected.
 */
export async function confirmIdentityAndInitialAccount(
    dispatch: Dispatch,
    identityName: string,
    identityId: number,
    accountName: string,
    location: string
) {
    let token;
    try {
        token = await getIdObject(location);
        if (!token) {
            await rejectIdentity(dispatch, identityId);
            await removeInitialAccount(dispatch, identityId);
        } else {
            const { accountAddress } = token;
            const credential = token.credential.value.credential.contents;
            const parsedCredential = {
                credId: credential.credId || credential.regId,
                policy: credential.policy,
            };
            await confirmIdentity(dispatch, identityId, token.identityObject);
            await confirmInitialAccount(dispatch, identityId, accountAddress);
            insertNewCredential(
                dispatch,
                accountAddress,
                0,
                identityId,
                0, // credentialIndex = 0 on original
                parsedCredential
            );
            addToAddressBook(dispatch, {
                name: accountName,
                address: accountAddress,
                note: `Initial account of identity: ${identityName}`,
                readOnly: true,
            });
        }
    } catch (err) {
        await rejectIdentity(dispatch, identityId);
        await removeInitialAccount(dispatch, identityId);
    }
}

async function findInitialAccount(identity: Identity) {
    const accounts = await getAccountsOfIdentity(identity.id);
    return accounts.find(isInitialAccount);
}

export async function resumeIdentityStatusPolling(
    identity: Identity,
    dispatch: Dispatch
) {
    const { name: identityName, codeUri: location, id } = identity;
    const initialAccount = await findInitialAccount(identity);
    if (!initialAccount) {
        throw new Error('Unexpected missing initial account.');
    }
    const { name: accountName } = initialAccount;
    return confirmIdentityAndInitialAccount(
        dispatch,
        identityName,
        id,
        accountName,
        location
    );
}

export default async function listenForIdentityStatus(dispatch: Dispatch) {
    const identities = await getAllIdentities();
    identities
        .filter((identity) => identity.status === IdentityStatus.Pending)
        .forEach((identity) => resumeIdentityStatusPolling(identity, dispatch));
}
