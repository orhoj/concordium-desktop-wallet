/* eslint-disable no-await-in-loop */
import { insertAccount } from '../database/AccountDao';
import {
    getCredentialsForIdentity,
    insertCredential,
} from '../database/CredentialDao';
import { insertIdentity, updateIdentity } from '../database/IdentityDao';
import { insertWallet } from '../database/WalletDao';
import { partition } from './basicHelpers';
import {
    Account,
    Credential,
    EncryptedData,
    ExportData,
    Identity,
    IdentityStatus,
    ValidationRules,
    WalletEntry,
} from './types';

export interface HasWalletId {
    walletId?: number;
}

export interface HasIdentityId {
    identityId?: number;
}

interface AttachedEntities {
    attachedIdentities: Identity[];
    attachedCredentials: Credential[];
    attachedAccounts: Account[];
}

export function updateWalletIdReference<T extends HasWalletId>(
    importedWalletId: number,
    insertedWalletId: number,
    input: T[]
): T[] {
    return input
        .filter((item) => importedWalletId === item.walletId)
        .map((relevantItem) => {
            return {
                ...relevantItem,
                walletId: insertedWalletId,
            };
        });
}

/**
 * Checks whether an entry is a duplicate of an element present
 * in the existing list. Whether the entry is a duplicate is checked
 * by equality of the fields provided.
 * @param entry the entry to check whether is a duplicate
 * @param list the existing list of elements
 * @param fields the fields that defines equality between the entries
 * @returns true if the entry is a duplicate of an element in the existing list
 */
export function isDuplicate<T>(entry: T, list: T[], fields: (keyof T)[]) {
    return list.some((listElement) =>
        fields
            .map((field) => listElement[field] === entry[field])
            .every(Boolean)
    );
}

/**
 * Finds the accounts and credentials that refer to a specific identityId.
 */
function findAccountsAndCredentialsOnIdentity(
    identityId: number,
    accounts: Account[],
    credentials: Credential[]
) {
    const accountsOnIdentity = accounts.filter(
        (account) => identityId === account.identityId
    );
    const credentialsOnIdentity = credentials.filter(
        (credential) => identityId === credential.identityId
    );
    return { accountsOnIdentity, credentialsOnIdentity };
}

/**
 * Finds the identities, credentials and accounts that are attached to one of the
 * provided wallets.
 */
function findAttachedEntities(
    wallets: WalletEntry[],
    importedIdentities: Identity[],
    importedCredentials: Credential[],
    importedAccounts: Account[]
): AttachedEntities {
    const walletIds = wallets.map((wallet) => wallet.id);

    const attachedIdentities = importedIdentities.filter((identity) =>
        walletIds.includes(identity.walletId)
    );
    const attachedIdentityIds = attachedIdentities.map(
        (attachedIdent) => attachedIdent.id
    );

    const attachedCredentials = importedCredentials.filter((credential) =>
        attachedIdentityIds.includes(credential.identityId)
    );

    const attachedAccounts = importedAccounts.filter((account) =>
        attachedIdentityIds.includes(account.identityId)
    );

    return { attachedIdentities, attachedCredentials, attachedAccounts };
}

/**
 * Inserts new accounts and credentials for an identity that has already been inserted into the
 * database, so that we have its up-to-date id, which can be used to update the identityId
 * on its accounts and credentials.
 * @param identityId the id of the identity as set in the database
 */
async function insertNewAccountsAndCredentials(
    identityId: number,
    accountsOnIdentity: Account[],
    existingAccounts: Account[],
    credentialsOnIdentity: Credential[]
) {
    // Only consider accounts that are not already in the database.
    const existingAccountAddressesInDatabase = existingAccounts.map(
        (account) => account.address
    );

    const newAccounts = accountsOnIdentity.filter(
        (accountOnIdentity) =>
            !existingAccountAddressesInDatabase.includes(
                accountOnIdentity.address
            )
    );

    for (let j = 0; j < newAccounts.length; j += 1) {
        const newAccountToInsert: Account = {
            ...newAccounts[j],
            identityId,
        };
        await insertAccount(newAccountToInsert);
    }

    // Only consider credentials that are not already in the database.
    const existingCredentialIdsInDatabase = (
        await getCredentialsForIdentity(identityId)
    ).map((credential) => credential.credId);

    const newCredentials = credentialsOnIdentity.filter(
        (credentialOnIdentity) =>
            !existingCredentialIdsInDatabase.includes(
                credentialOnIdentity.credId
            )
    );
    for (let k = 0; k < newCredentials.length; k += 1) {
        const newCredentialToInsert = {
            ...newCredentials[k],
            identityId,
        };
        await insertCredential(newCredentialToInsert);
    }
}

/**
 * Inserts an array of new identities and its attached accounts and credentials. The identities
 * must be new identities that did not already exist in the database. The accounts and credentials for
 * each identity in the array will have their identityId reference updated to point to the
 * correct id for their identity, before they are also inserted into the database.
 *
 * Note that for new identities that there cannot be existing account or credentials, so we
 * can safely insert them without checking if they already exist.
 * @param newIdentities an array of new identities to be added to the database
 * @param attachedAccounts all accounts for the current wallet import, without any changes to their identityId
 * @param attachedCredentials all credentials for the current wallet import, without any changes to their identityId
 */
async function insertNewIdentities(
    newIdentities: Identity[],
    attachedAccounts: Account[],
    attachedCredentials: Credential[],
    existingAccounts: Account[]
) {
    for (let i = 0; i < newIdentities.length; i += 1) {
        const { id, ...newIdentity } = newIdentities[i];

        const newIdentityId = (await insertIdentity(newIdentity))[0];

        const {
            accountsOnIdentity,
            credentialsOnIdentity,
        } = findAccountsAndCredentialsOnIdentity(
            id,
            attachedAccounts,
            attachedCredentials
        );

        // TODO: Find a nice way to avoid the unnecessary check on credentials
        await insertNewAccountsAndCredentials(
            newIdentityId,
            accountsOnIdentity,
            existingAccounts,
            credentialsOnIdentity
        );
    }
}

/**
 * Imports a list of completely new wallets, i.e. wallets that cannot be matched with
 * a wallet entry currently in the database. This will also import the associated identities,
 * credentials and accounts.
 * The logical ids of the wallets and identities may change when inserted into the database,
 * which means that the references between objects are also updated as part of the import.
 * @param newWallets the wallets that are new to this database
 * @param importedIdentities the total list of identities currently being imported
 */
async function importNewWallets(
    newWallets: WalletEntry[],
    importedIdentities: Identity[],
    importedCredentials: Credential[],
    importedAccounts: Account[],
    existingAccounts: Account[]
) {
    const {
        attachedIdentities,
        attachedCredentials,
        attachedAccounts,
    } = findAttachedEntities(
        newWallets,
        importedIdentities,
        importedCredentials,
        importedAccounts
    );

    let identitiesWithUpdatedReferences: Identity[] = [];

    // Insert the new wallets into the database, and use their newly received
    // walletIds to update the identities.
    for (let i = 0; i < newWallets.length; i += 1) {
        const wallet = newWallets[i];

        const importedWalletId = wallet.id;
        const insertedWalletId = await insertWallet(
            wallet.identifier,
            wallet.type
        );

        const identitiesWithUpdatedWalletIds = updateWalletIdReference(
            importedWalletId,
            insertedWalletId,
            attachedIdentities
        );
        identitiesWithUpdatedReferences = identitiesWithUpdatedReferences.concat(
            identitiesWithUpdatedWalletIds
        );
    }

    await insertNewIdentities(
        identitiesWithUpdatedReferences,
        attachedAccounts,
        attachedCredentials,
        existingAccounts
    );
}

/**
 * Import identities, accounts and credentials for the wallets that already exist in the database
 * with an identical logical id. This means that the walletId reference on the identities do not
 * have to be updated, as they are already correct in this special case.
 */
async function importDuplicateWallets(
    existingData: ExportData,
    duplicateWallets: WalletEntry[],
    importedIdentities: Identity[],
    importedCredentials: Credential[],
    importedAccounts: Account[]
) {
    const {
        attachedIdentities,
        attachedCredentials,
        attachedAccounts,
    } = findAttachedEntities(
        duplicateWallets,
        importedIdentities,
        importedCredentials,
        importedAccounts
    );

    async function addAccountsAndCredentials(oldId: number, newId: number) {
        const {
            accountsOnIdentity,
            credentialsOnIdentity,
        } = findAccountsAndCredentialsOnIdentity(
            oldId,
            attachedAccounts,
            attachedCredentials
        );

        await insertNewAccountsAndCredentials(
            newId,
            accountsOnIdentity,
            existingData.accounts,
            credentialsOnIdentity
        );
    }

    // Partition the identities into those that match the existing data, and those that
    // do not.
    const [
        duplicateIdentities,
        nonDuplicateIdentities,
    ] = partition(attachedIdentities, (attachedIdentity) =>
        isDuplicate(attachedIdentity, existingData.identities, [
            'id',
            'identityNumber',
            'identityObject',
            'name',
            'randomness',
        ])
    );

    // For the identities that are one-to-one with what is in the database, we still have to
    // check if there are new accounts or credentials and add them to the database.
    for (let i = 0; i < duplicateIdentities.length; i += 1) {
        const identityId = duplicateIdentities[i].id;
        await addAccountsAndCredentials(identityId, identityId);
    }

    // The identities that are not duplicate can be partitioned into the set
    // of identities that exist in the database, but with separate logical ids,
    // and those identities that are entirely new to this database.
    const [
        existingIdentities,
        nonExistingIdentities,
    ] = partition(nonDuplicateIdentities, (nonDuplicateIdentity) =>
        isDuplicate(nonDuplicateIdentity, existingData.identities, [
            'identityNumber',
            'identityObject',
            'name',
            'randomness',
        ])
    );

    // For the existing identities find the identityId that they now have, and update that on the associated
    // accounts and credentials before inserting them into the database. Note that we only have to insert
    // new accounts and credentials, as if they already exist in the database, then the import will not
    // carry new information that was not already present in the database.
    for (let i = 0; i < existingIdentities.length; i += 1) {
        const existingIdentity = existingIdentities[i];

        // Find the identity id as it is in the database.
        const newIdentity = existingData.identities.find((ident) => {
            if (
                ident.identityNumber === existingIdentity.identityNumber &&
                ident.name === existingIdentity.name &&
                ident.randomness === existingIdentity.randomness
            ) {
                return true;
            }
            return false;
        });

        if (!newIdentity) {
            throw new Error(
                'Internal error. An existing and matching identity should have been found, but was not.'
            );
        }

        await addAccountsAndCredentials(existingIdentity.id, newIdentity.id);
    }

    // We want to find the placeholder identities, whose real version are present.
    const [
        recoveredIdentities,
        newIdentities,
    ] = partition(nonExistingIdentities, (nonExistingIdentity) =>
        isDuplicate(nonExistingIdentity, existingData.identities, [
            'identityNumber',
            'walletId',
        ])
    );
    for (let i = 0; i < recoveredIdentities.length; i += 1) {
        const importedIdentity = recoveredIdentities[i];

        // Find the identity as it is in the database.
        const existingIdentity = existingData.identities.find(
            (ident) =>
                ident.identityNumber === importedIdentity.identityNumber &&
                ident.walletId === importedIdentity.walletId
        );

        if (!existingIdentity) {
            throw new Error(
                'Internal error. An existing and matching identity should have been found, but was not.'
            );
        }

        const existingId = existingIdentity.id;

        if (importedIdentity.status !== IdentityStatus.Placeholder) {
            if (existingIdentity.status !== IdentityStatus.Placeholder) {
                throw new Error(
                    'An existing and imported identity match on index only, but none of them are placeholders.'
                );
            }
            const { id, ...properties } = importedIdentity;
            // the identity in the database is a placeholder, so we should update it with the imported data.
            updateIdentity(existingId, properties);
        }

        await addAccountsAndCredentials(importedIdentity.id, existingId);
    }

    await insertNewIdentities(
        newIdentities,
        attachedAccounts,
        attachedCredentials,
        existingData.accounts
    );
}

/**
 * Imports the identities, accounts and credentials for a wallet that already exists in the database,
 * but with a different logical id. This consists of getting the logical id's that the wallets have
 * in the database, and updating the identities with this information. When this has been done, this
 * case has been reduced to the case for having duplicate wallets, which is invoked.
 */
async function importExistingWallets(
    existingWallets: WalletEntry[],
    existingData: ExportData,
    importedIdentities: Identity[],
    importedCredentials: Credential[],
    importedAccounts: Account[]
) {
    const { attachedIdentities } = findAttachedEntities(
        existingWallets,
        importedIdentities,
        importedCredentials,
        importedAccounts
    );

    const duplicateWallets: WalletEntry[] = [];
    let identitiesWithUpdatedWalletIds: Identity[] = [];
    for (let i = 0; i < existingWallets.length; i += 1) {
        const existingWallet = existingWallets[i];

        const newWallet = existingData.wallets.find(
            (wallet) => wallet.identifier === existingWallet.identifier
        );
        if (!newWallet) {
            throw new Error(
                'Internal error. An existing and matching wallet should have been found, but was not.'
            );
        }
        duplicateWallets.push(newWallet);

        const updatedIdentities = updateWalletIdReference(
            existingWallet.id,
            newWallet.id,
            attachedIdentities
        );
        identitiesWithUpdatedWalletIds = updatedIdentities.concat(
            identitiesWithUpdatedWalletIds
        );
    }

    // Now that the identities have had their walletId reference updated, we are in the
    // same case as if we had duplicate wallet entries, and can re-use that method to
    // complete the import.
    await importDuplicateWallets(
        existingData,
        duplicateWallets,
        identitiesWithUpdatedWalletIds,
        importedCredentials,
        importedAccounts
    );
}

// TODO This method should be a single transaction. Implement this when we change the SQLite dependency.
/**
 * Imports wallets, identities, credentials and accounts received from an exported file.
 */
export async function importWallets(
    existingData: ExportData,
    importedWallets: WalletEntry[],
    importedIdentities: Identity[],
    importedAccounts: Account[],
    importedCredentials: Credential[]
) {
    const [
        duplicateWalletEntries,
        nonDuplicateWalletEntries,
    ] = partition(importedWallets, (importedWallet) =>
        isDuplicate(importedWallet, existingData.wallets, ['id', 'identifier'])
    );

    // The duplicate wallet entries are the wallets that already exist in the database,
    // with an exact match on both the id and identifier. Therefore we do not have to
    // insert those wallets (they are already there), but we have to check if there are
    // any new identities, accounts or credentials.
    await importDuplicateWallets(
        existingData,
        duplicateWalletEntries,
        importedIdentities,
        importedCredentials,
        importedAccounts
    );

    // The wallets that are not exact duplicates of what is already present in the database, can
    // be split into two partitions:
    //      - Wallets that are in the database (they have equal identifier, which uniquely identifies them),
    //        but with a separate primary key (id field).
    //      - Wallets that are completely new to this database.
    const [existingWallets, newWallets] = partition(
        nonDuplicateWalletEntries,
        (nonDuplicateWalletEntry) =>
            isDuplicate(nonDuplicateWalletEntry, existingData.wallets, [
                'identifier',
            ])
    );

    await importExistingWallets(
        existingWallets,
        existingData,
        importedIdentities,
        importedCredentials,
        importedAccounts
    );
    await importNewWallets(
        newWallets,
        importedIdentities,
        importedCredentials,
        importedAccounts,
        existingData.accounts
    );
}

/**
 * Checks whether the entry has a "duplicate" in the given list
 * This is determined by equality of the given fields.
 * If the commonFields parameter is given, the function also checks
 * that there are no shared fields, except for those specified in commonFields.
 * @returns true if the entry is not a duplicate
 */
export function hasNoDuplicate<T>(
    entry: T,
    list: T[],
    fields: (keyof T)[],
    commonFields: (keyof T)[] | undefined = undefined
) {
    if (isDuplicate(entry, list, fields)) {
        return false;
    }

    if (commonFields === undefined) {
        return true;
    }

    const anyEqual = list.find((listElement) =>
        fields
            .filter((field) => !commonFields.includes(field))
            .map((field) => listElement[field] === entry[field])
            .some(Boolean)
    );

    if (anyEqual) {
        throw new Error('Entry shares unique fields with existing elements.');
    }

    // TODO inform of commonField collision.

    return true;
}

interface Validation {
    isValid: boolean;
    reason?: string;
}

// TODO add unit tests
export function validateEncryptedStructure(
    encryptedData: EncryptedData
): Validation {
    if (!encryptedData.cipherText) {
        return { isValid: false, reason: 'missing cipherText field.' };
    }
    if (!encryptedData.metadata) {
        return { isValid: false, reason: 'missing metadata field.' };
    }
    const metaDataFields = [
        'keyLen',
        'iterations',
        'salt',
        'initializationVector',
        'encryptionMethod',
        'keyDerivationMethod',
        'hashAlgorithm',
    ];

    // Check that metaData is an object, so we don't crash when checking it's fields.
    if (typeof encryptedData.metadata !== 'object') {
        return { isValid: false, reason: 'malformed metaData.' };
    }

    const missingField = metaDataFields.find(
        (field) => !(field in encryptedData.metadata)
    );
    if (missingField) {
        return {
            isValid: false,
            reason: `missing metadata.${missingField} value.`,
        };
    }
    return { isValid: true };
}

// TODO add unit tests
export function validateImportStructure(data: ExportData): Validation {
    const fields = ['identities', 'accounts', 'addressBook'];

    // Check that data is an object, so we don't crash when checking it's fields.
    if (typeof data !== 'object') {
        return { isValid: false, reason: 'malformed data.' };
    }

    const missingField = fields.find((field) => !(field in data));
    if (missingField) {
        return { isValid: false, reason: `missing${missingField} value.` };
    }
    return { isValid: true };
}

export const passwordValidationRules: ValidationRules = {
    required: 'Password is required',
    minLength: {
        value: 6,
        message: 'Password has to be at least 6 characters',
    },
};
