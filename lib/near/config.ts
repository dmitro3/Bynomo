import { ConnectConfig } from "near-api-js";

export const NEAR_CONFIG = {
    networkId: "mainnet",
    nodeUrl: "https://rpc.mainnet.near.org",
    walletUrl: "https://wallet.near.org",
    helperUrl: "https://helper.mainnet.near.org",
    explorerUrl: "https://explorer.near.org",
    headers: {}
};

export const BINOMO_NEAR_TREASURY = process.env.NEXT_PUBLIC_NEAR_TREASURY_ADDRESS || "binomo.near";
