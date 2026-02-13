import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupSender } from "@near-wallet-selector/sender";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupBitgetWallet } from "@near-wallet-selector/bitget-wallet";
import { NEAR_CONFIG } from "./config";
import "@near-wallet-selector/modal-ui/styles.css";

let selector: any = null;
let modal: any = null;

export const initNearSelector = async () => {
    if (selector) return { selector, modal };

    selector = await setupWalletSelector({
        network: "mainnet",
        modules: [
            setupMyNearWallet(),
            setupSender(),
            setupHereWallet(),
            setupBitgetWallet()
        ],
    });

    modal = setupModal(selector, {
        contractId: process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "binomo.near",
    });

    return { selector, modal };
};

export const connectNearWallet = async () => {
    const { modal } = await initNearSelector();
    modal.show();

    return new Promise((resolve) => {
        const subscription = selector.store.observable.subscribe((state: any) => {
            if (state.accounts.length > 0) {
                subscription.unsubscribe();
                resolve(state.accounts[0].accountId);
            }
        });
    });
};

export const getNearBalance = async (accountId: string) => {
    const { connect, providers } = await import("near-api-js");
    const provider = new providers.JsonRpcProvider({ url: NEAR_CONFIG.nodeUrl });

    try {
        const account: any = await provider.query({
            request_type: "view_account",
            finality: "final",
            account_id: accountId,
        });
        // NEAR is 10^24 yoctoNEAR
        return parseFloat(account.amount) / 10 ** 24;
    } catch (error) {
        console.error("Error fetching NEAR balance:", error);
        return 0;
    }
};

export const depositNEAR = async (amount: string) => {
    const { selector, modal } = await initNearSelector();

    // Ensure we have a signed in account
    const state = selector.store.getState();
    const accountId = state.accounts[0]?.accountId;

    if (!accountId) {
        modal.show();
        throw new Error("Please connect your wallet first");
    }

    const wallet = await selector.wallet();
    const { utils } = await import("near-api-js");
    const amountInYocto = utils.format.parseNearAmount(amount);

    if (!amountInYocto) throw new Error("Invalid NEAR amount");

    const result = await wallet.signAndSendTransaction({
        receiverId: process.env.NEXT_PUBLIC_NEAR_TREASURY_ADDRESS || "binomo.near", // TODO: Replace with your actual receiver address or treasury
        actions: [
            {
                type: "Transfer",
                params: {
                    deposit: amountInYocto,
                },
            },
        ],
    });

    if (!result) throw new Error("Transaction failed");

    // return string hash
    if (typeof result === 'object' && 'transaction' in result) {
        return (result as any).transaction.hash;
    }

    // For MyNearWallet, it might redirect, so we might not get here immediately
    // If it returns, check typical response structures
    return (result as any)?.transaction_outcome?.id || (result as any)?.hash;
};
