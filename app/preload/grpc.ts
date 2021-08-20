import { AccountAddress, ConsensusStatus } from '@concordium/node-sdk';
import {
    setClientLocation,
    getAdvancedClient,
    getClient,
} from '~/node/GRPCClient';
import ConcordiumNodeClient from '~/node/ConcordiumNodeClient';
import { JsonResponse } from '~/proto/concordium_p2p_rpc_pb';
import { GRPC } from '~/preload/preloadTypes';

async function getConsensusStatusAndCryptographicParameters(
    address: string,
    port: string
) {
    try {
        const nodeClient = new ConcordiumNodeClient(
            address,
            Number.parseInt(port, 10)
        );
        const consensusStatusSerialized = await nodeClient.getConsensusStatus();
        const consensusStatus: ConsensusStatus = JSON.parse(
            JsonResponse.deserializeBinary(consensusStatusSerialized).getValue()
        );
        const globalSerialized = await nodeClient.getCryptographicParameters(
            consensusStatus.lastFinalizedBlock
        );
        return {
            successful: true,
            response: {
                consensus: consensusStatusSerialized,
                global: globalSerialized,
            },
        };
    } catch (error) {
        return { successful: false, error };
    }
}

const exposedMethods: GRPC = {
    // Updates the location of the grpc endpoint.
    setLocation: async (address: string, port: string) => {
        return setClientLocation(address, port);
    },
    getNodeInfo: () => getAdvancedClient().getNodeInfo(),
    sendTransaction: (transactionPayload: Uint8Array, networkId: number) =>
        getAdvancedClient().sendTransaction(transactionPayload, networkId),
    getCryptographicParameters: (blockHash: string) =>
        getAdvancedClient().getCryptographicParameters(blockHash),
    getConsensusStatus: () => getClient().getConsensusStatus(),
    getTransactionStatus: (transactionId: string) =>
        getClient().getTransactionStatus(transactionId),
    getNextAccountNonce: (address: string) =>
        getClient().getNextAccountNonce(new AccountAddress(address)),
    getBlockSummary: (blockHash: string) =>
        getClient().getBlockSummary(blockHash),
    getAccountInfo: (addressRaw: string, blockHash: string) => {
        const address = new AccountAddress(addressRaw);
        return getClient().getAccountInfo(address, blockHash);
    },
    getIdentityProviders: (blockHash: string) =>
        getAdvancedClient().getIdentityProviders(blockHash),
    getAnonymityRevokers: (blockHash: string) =>
        getAdvancedClient().getAnonymityRevokers(blockHash),
    getPeerList: (includeBootstrappers: boolean) =>
        getAdvancedClient().getPeerList(includeBootstrappers),

    // Creates a standalone GRPC client for testing the connection
    // to a node. This is used to verify that when changing connection
    // that the new node is on the same blockchain as the wallet was previously connected to.
    nodeConsensusAndGlobal: async (address: string, port: string) => {
        return getConsensusStatusAndCryptographicParameters(address, port);
    },
};

export default exposedMethods;
