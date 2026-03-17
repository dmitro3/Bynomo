import { getDefaultConfig } from 'connectkit';
import { createConfig, http } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { defineChain } from 'viem';

export const pushChainDonut = defineChain({
    id: 42101,
    name: 'Push Chain Donut Testnet',
    nativeCurrency: { name: 'Push', symbol: 'PC', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://evm.donut.rpc.push.org'] },
    },
    blockExplorers: {
        default: { name: 'Push Explorer', url: 'https://explorer.push.org' },
    },
    testnet: true,
});

export const config = createConfig(
    getDefaultConfig({
        chains: [bsc, pushChainDonut],
        transports: {
            [bsc.id]: http(),
            [pushChainDonut.id]: http('https://evm.donut.rpc.push.org'),
        },

        // Required API Keys
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-id',

        // Required App Info
        appName: 'BYNOMO',

        // Optional App Info
        appDescription: 'Binary Options on Push Chain',
        appUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        appIcon: typeof window !== 'undefined' ? `${window.location.origin}/overflowlogo.png` : '/overflowlogo.png',
    }),
);
