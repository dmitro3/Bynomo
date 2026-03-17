/**
 * Push Chain Network Configuration
 * Push Chain Donut Testnet (Chain ID: 42101)
 */

export interface PushConfig {
    rpcEndpoint: string;
    chainId: number;
    treasuryAddress: string;
}

export function getPushConfig(): PushConfig {
    const rpcEndpoint = process.env.NEXT_PUBLIC_PUSH_RPC_ENDPOINT || 'https://evm.rpc-testnet-donut-node1.push.org/';
    const chainId = 42101; // Push Chain Donut Testnet
    const treasuryAddress =
        process.env.NEXT_PUBLIC_PUSH_TREASURY_ADDRESS ||
        process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
        '';

    if (!treasuryAddress) {
        console.warn('Missing NEXT_PUBLIC_PUSH_TREASURY_ADDRESS. Please set it in your .env file.');
    }

    return {
        rpcEndpoint,
        chainId,
        treasuryAddress,
    };
}
