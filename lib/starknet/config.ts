export interface StarknetConfig {
  rpcEndpoint: string;
  chainId: string;
  treasuryAddress: string;
  strkTokenAddress: string;
}

const DEFAULT_MAINNET_RPC = 'https://rpc.starknet.lava.build';
const DEFAULT_STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5d4f8b9e98e31f5f17d9d6c17d';

export function getStarknetConfig(): StarknetConfig {
  return {
    rpcEndpoint: process.env.NEXT_PUBLIC_STARKNET_RPC_URL || DEFAULT_MAINNET_RPC,
    chainId: process.env.NEXT_PUBLIC_STARKNET_CHAIN_ID || 'SN_MAIN',
    treasuryAddress: process.env.NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS || '',
    strkTokenAddress: process.env.NEXT_PUBLIC_STARKNET_STRK_TOKEN_ADDRESS || DEFAULT_STRK_TOKEN,
  };
}
