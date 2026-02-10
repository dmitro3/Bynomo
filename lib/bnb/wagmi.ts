import { getDefaultConfig } from 'connectkit';
import { createConfig, http } from 'wagmi';
import { bscTestnet, bsc } from 'wagmi/chains';

export const config = createConfig(
    getDefaultConfig({
        // Your dApps chains
        chains: [bsc],
        transports: {
            [bsc.id]: http(),
        },

        // Required API Keys
        walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'dummy-id',

        // Required App Info
        appName: 'Binomo',

        // Optional App Info
        appDescription: 'Binomo on BNB Smart Chain',
        appUrl: 'https://family.co', // your app's url
        appIcon: 'https://family.co/logo.png', // your app's icon
    }),
);
