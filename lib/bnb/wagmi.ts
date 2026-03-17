import { getDefaultConfig } from 'connectkit';
import { createConfig, http } from 'wagmi';
import { bscTestnet, bsc } from 'wagmi/chains';
import { defineChain } from 'viem';

export const pushChain = defineChain({
    id: 9, // Push Chain Mainnet (eip155:9)
    name: 'Push Chain',
    nativeCurrency: { name: 'Push', symbol: 'PUSH', decimals: 18 },
    rpcUrls: {
        default: { http: [process.env.NEXT_PUBLIC_PUSH_RPC_ENDPOINT || 'https://evm.rpc.push.org'] },
    },
    blockExplorers: {
        default: { name: 'Push Explorer', url: 'https://explorer.push.org' },
    },
});

export const config = createConfig(
    getDefaultConfig({
        // Push Chain is handled by @pushchain/ui-kit — not added here to avoid ConnectKit conflicts
        chains: [bsc],
        transports: {
            [bsc.id]: http(),
        },

        // Required API Keys
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-id',

        // Required App Info
        appName: 'BYNOMO',

        // Optional App Info
        appDescription: 'BYNOMO on BNB Smart Chain',
        appUrl: 'https://family.co', // your app's url
        appIcon: 'https://family.co/logo.png', // your app's icon
    }),
);
