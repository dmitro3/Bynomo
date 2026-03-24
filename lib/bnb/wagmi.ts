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

export const somniaTestnet = defineChain({
    id: Number(process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CHAIN_ID) || 50312,
    name: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CHAIN_NAME || 'Somnia Testnet',
    nativeCurrency: {
        name: 'Somnia Test Token',
        symbol: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CURRENCY_SYMBOL || 'STT',
        decimals: Number(process.env.NEXT_PUBLIC_SOMNIA_TESTNET_CURRENCY_DECIMALS) || 18,
    },
    rpcUrls: {
        default: {
            http: [process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC || 'https://dream-rpc.somnia.network'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Somnia Explorer',
            url: process.env.NEXT_PUBLIC_SOMNIA_TESTNET_EXPLORER || 'https://shannon-explorer.somnia.network',
        },
    },
    testnet: true,
});

export const config = createConfig(
    getDefaultConfig({
        chains: [somniaTestnet, bsc, pushChainDonut],
        transports: {
            [somniaTestnet.id]: http(process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC || 'https://dream-rpc.somnia.network'),
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
