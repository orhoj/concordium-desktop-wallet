import {
    AccountTransaction,
    TransactionKindId as TransactionKind,
    BlockItemKind,
    ScheduledTransferPayload,
    SimpleTransferPayload,
    SchedulePoint,
    TransactionPayload,
    TransferToEncryptedPayload,
    UpdateAccountCredentialsPayload,
    TransferToPublicPayload,
    EncryptedTransferPayload,
    TransactionAccountSignature,
    Signature,
    TransactionCredentialSignature,
    AddBakerPayload,
} from './types';
import {
    encodeWord32,
    encodeWord64,
    put,
    putHexString,
    putInt8,
    putBase58Check,
    hashSha256,
    serializeMap,
    base58ToBuffer,
    serializeList,
    serializeCredentialDeploymentInformation,
    serializeBoolean,
} from './serializationHelpers';

function serializeSimpleTransfer(payload: SimpleTransferPayload) {
    const size = 1 + 32 + 8;
    const serialized = new Uint8Array(size);

    serialized[0] = TransactionKind.Simple_transfer;
    putBase58Check(serialized, 1, payload.toAddress);
    put(serialized, 32 + 1, encodeWord64(BigInt(payload.amount)));
    return Buffer.from(serialized);
}

export function serializeScheduledTransferPayloadBase(
    payload: ScheduledTransferPayload
) {
    const size = 1 + 32 + 1;
    const initialPayload = new Uint8Array(size);

    initialPayload[0] = TransactionKind.Transfer_with_schedule;
    putBase58Check(initialPayload, 1, payload.toAddress);
    initialPayload[33] = payload.schedule.length;
    return Buffer.from(initialPayload);
}

export function serializeSchedulePoint(period: SchedulePoint) {
    return Buffer.concat([
        encodeWord64(BigInt(period.timestamp)),
        encodeWord64(BigInt(period.amount)),
    ]);
}

function serializeTransferWithSchedule(payload: ScheduledTransferPayload) {
    return Buffer.concat(
        [serializeScheduledTransferPayloadBase(payload)].concat(
            payload.schedule.map(serializeSchedulePoint)
        )
    );
}

function serializeTransferToEncypted(payload: TransferToEncryptedPayload) {
    const size = 1 + 8;
    const serialized = new Uint8Array(size);

    serialized[0] = TransactionKind.Transfer_to_encrypted;
    put(serialized, 1, encodeWord64(BigInt(payload.amount)));
    return Buffer.from(serialized);
}

function serializeUpdateCredentials(payload: UpdateAccountCredentialsPayload) {
    const transactionType = Buffer.alloc(1);
    transactionType.writeUInt8(TransactionKind.Update_credentials, 0);

    const serializedNewCredentials = serializeList(
        payload.addedCredentials,
        putInt8,
        ({ index, value }) =>
            Buffer.concat([
                putInt8(index),
                serializeCredentialDeploymentInformation(value),
            ])
    );

    const serializedRemovedCredentials = serializeList(
        payload.removedCredIds,
        putInt8,
        putHexString
    );

    const threshold = Buffer.alloc(1);
    threshold.writeUInt8(payload.threshold, 0);

    return Buffer.concat([
        transactionType,
        serializedNewCredentials,
        serializedRemovedCredentials,
        threshold,
    ]);
}

export function serializeTransferToPublicData(
    payload: TransferToPublicPayload
) {
    if (payload.index === undefined || !payload.remainingEncryptedAmount) {
        throw new Error('unexpected missing data of Transfer to Public data');
    }
    const remainingEncryptedAmount = Buffer.from(
        payload.remainingEncryptedAmount,
        'hex'
    );

    return Buffer.concat([
        remainingEncryptedAmount,
        encodeWord64(BigInt(payload.transferAmount)),
        encodeWord64(BigInt(payload.index)),
    ]);
}

function serializeTransferToPublic(payload: TransferToPublicPayload) {
    if (!payload.proof) {
        throw new Error('unexpected missing proof of Transfer to Public data');
    }

    const proof = Buffer.from(payload.proof, 'hex');
    const data = serializeTransferToPublicData(payload);
    const size = 1 + data.length + proof.length;
    const serialized = new Uint8Array(size);

    serialized[0] = TransactionKind.Transfer_to_public;
    put(serialized, 1, data);
    put(serialized, 1 + data.length, proof);
    return Buffer.from(serialized);
}

export function serializeEncryptedTransferData(
    payload: EncryptedTransferPayload
) {
    if (
        payload.index === undefined ||
        !payload.remainingEncryptedAmount ||
        !payload.transferAmount
    ) {
        throw new Error('unexpected missing data of Encrypted Transfer data');
    }
    const remainingEncryptedAmount = Buffer.from(
        payload.remainingEncryptedAmount,
        'hex'
    );
    const transferAmount = Buffer.from(payload.transferAmount, 'hex');

    return Buffer.concat([
        base58ToBuffer(payload.toAddress),
        remainingEncryptedAmount,
        transferAmount,
        encodeWord64(BigInt(payload.index)),
    ]);
}

function serializeEncryptedTransfer(payload: EncryptedTransferPayload) {
    if (!payload.proof) {
        throw new Error('unexpected missing proof of Encrypted Transfer data');
    }

    const proof = Buffer.from(payload.proof, 'hex');
    const data = serializeEncryptedTransferData(payload);
    const size = 1 + data.length + proof.length;
    const serialized = new Uint8Array(size);

    serialized[0] = TransactionKind.Encrypted_transfer;
    put(serialized, 1, data);
    put(serialized, 1 + data.length, proof);
    return Buffer.from(serialized);
}

export function serializeTransactionHeader(
    sender: string,
    nonce: string,
    energyAmount: string,
    payloadSize: number,
    expiry: bigint
) {
    const size = 32 + 8 + 8 + 4 + 8;
    const serialized = new Uint8Array(size);

    putBase58Check(serialized, 0, sender);
    put(serialized, 32, encodeWord64(BigInt(nonce)));
    put(serialized, 32 + 8, encodeWord64(BigInt(energyAmount)));
    put(serialized, 32 + 8 + 8, encodeWord32(payloadSize));
    put(serialized, 32 + 8 + 8 + 4, encodeWord64(expiry));

    return Buffer.from(serialized);
}

export function serializeAddBakerKeys(payload: AddBakerPayload) {
    return Buffer.concat([
        putHexString(payload.electionVerifyKey),
        putHexString(payload.signatureVerifyKey),
        putHexString(payload.aggregationVerifyKey),
    ]);
}

export function serializeAddBakerProofsStakeRestake(payload: AddBakerPayload) {
    return Buffer.concat([
        putHexString(payload.proofSignature),
        putHexString(payload.proofElection),
        putHexString(payload.proofAggregation),
        encodeWord64(BigInt(payload.bakingStake)),
        serializeBoolean(payload.restakeEarnings),
    ]);
}

export function serializeAddBaker(payload: AddBakerPayload) {
    return Buffer.concat([
        Uint8Array.of(4),
        serializeAddBakerKeys(payload),
        serializeAddBakerProofsStakeRestake(payload),
    ]);
}

export function serializeTransferPayload(
    kind: TransactionKind,
    payload: TransactionPayload
): Buffer {
    switch (kind) {
        case TransactionKind.Simple_transfer:
            return serializeSimpleTransfer(payload as SimpleTransferPayload);
        case TransactionKind.Update_credentials:
            return serializeUpdateCredentials(
                payload as UpdateAccountCredentialsPayload
            );
        case TransactionKind.Transfer_with_schedule:
            return serializeTransferWithSchedule(
                payload as ScheduledTransferPayload
            );
        case TransactionKind.Transfer_to_encrypted:
            return serializeTransferToEncypted(
                payload as TransferToEncryptedPayload
            );
        case TransactionKind.Transfer_to_public:
            return serializeTransferToPublic(
                payload as TransferToPublicPayload
            );
        case TransactionKind.Encrypted_transfer:
            return serializeEncryptedTransfer(
                payload as EncryptedTransferPayload
            );
        case TransactionKind.Add_baker:
            return serializeAddBaker(payload as AddBakerPayload);
        default:
            throw new Error('Unsupported transactionkind');
    }
}

function serializeSignature(signatures: TransactionAccountSignature) {
    // Size should be 1 for number of credentials, then for each credential:
    // 1 for the CredentialIndex, 1 for the number of signatures, then for each signature:
    // index ( 1 ) + Length of signature ( 2 ) + actual signature ( variable )

    const putSignature = (signature: Signature) => {
        const signatureBytes = Buffer.from(signature, 'hex');
        const length = Buffer.alloc(2);
        length.writeUInt16BE(signatureBytes.length, 0);
        return Buffer.concat([length, signatureBytes]);
    };
    const putCredentialSignatures = (credSig: TransactionCredentialSignature) =>
        serializeMap(credSig, putInt8, putInt8, putSignature);
    return serializeMap(signatures, putInt8, putInt8, putCredentialSignatures);
}

type SignFunction = (
    transaction: AccountTransaction,
    hash: Buffer
) => TransactionAccountSignature;

function serializeUnversionedTransaction(
    transaction: AccountTransaction,
    signFunction: SignFunction
) {
    const payload = serializeTransferPayload(
        transaction.transactionKind,
        transaction.payload
    );
    const header = serializeTransactionHeader(
        transaction.sender,
        transaction.nonce,
        transaction.energyAmount,
        payload.length,
        transaction.expiry
    );

    const hash = hashSha256(header, payload);
    const signatures = signFunction(transaction, hash);
    const serialSignature = serializeSignature(signatures);

    const serialized = new Uint8Array(
        1 + serialSignature.length + header.length + payload.length
    );
    serialized[0] = BlockItemKind.AccountTransactionKind;
    put(serialized, 1, serialSignature);
    put(serialized, 1 + serialSignature.length, header);
    put(serialized, 1 + serialSignature.length + header.length, payload);
    return serialized;
}

export function serializeTransaction(
    transaction: AccountTransaction,
    signFunction: SignFunction
) {
    const unversioned = serializeUnversionedTransaction(
        transaction,
        signFunction
    );
    const serialized = new Uint8Array(1 + unversioned.length);
    serialized[0] = 0; // Version number
    put(serialized, 1, unversioned);
    return serialized;
}

/**
 * Returns the transactionHash, which includes the signature, and is used as the
 * submissionId on chain.
 */
export function getAccountTransactionHash(
    transaction: AccountTransaction,
    signFunction: SignFunction
) {
    const serialized = serializeUnversionedTransaction(
        transaction,
        signFunction
    );
    return hashSha256(serialized);
}
