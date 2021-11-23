import { Buffer } from 'buffer/';
import { Transport } from './Transport';
import { PrivateKeySeeds } from '~/utils/types';

const INS_EXPORT_PRIVATE_KEY_SEED = 0x05;
const P1_PRF_KEY = 0;
const P1_PRF_KEY_RECOVERY = 1;
const P1_BOTH_KEYS = 2;

function getP2(version: number): number {
    switch (version) {
        case 0:
        case 1:
            return 0x01;
        default:
            throw new Error('Unknown identity version');
    }
}

function requestKeys(
    transport: Transport,
    p1: number,
    p2: number,
    identity: number
) {
    const data = Buffer.alloc(4);
    data.writeInt32BE(identity, 0);

    return transport.send(0xe0, INS_EXPORT_PRIVATE_KEY_SEED, p1, p2, data);
}

export async function getPrivateKeySeeds(
    transport: Transport,
    identity: number,
    version: number
): Promise<PrivateKeySeeds> {
    const response = await requestKeys(
        transport,
        P1_BOTH_KEYS,
        getP2(version),
        identity
    );
    const prfKey = response.slice(0, 32);
    const idCredSec = response.slice(32, 64);
    return { idCredSec, prfKey };
}

export async function getPrfKeyDecrypt(
    transport: Transport,
    identity: number,
    version: number
): Promise<Buffer> {
    const response = await requestKeys(
        transport,
        P1_PRF_KEY,
        getP2(version),
        identity
    );
    return response.slice(0, 32);
}

export async function getPrfKeyRecovery(
    transport: Transport,
    identity: number,
    version: number
): Promise<Buffer> {
    const response = await requestKeys(
        transport,
        P1_PRF_KEY_RECOVERY,
        getP2(version),
        identity
    );
    return response.slice(0, 32);
}
