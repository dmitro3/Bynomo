/**
 * Push Chain Wallet Module
 * Handles deposit (user → treasury) on Push Chain Donut Testnet
 * Wallet connection managed by @pushchain/ui-kit
 */

import { ethers } from 'ethers';
import { getPushConfig } from './config';
import { getPushChainClientGlobal } from './push-chain-client-store';
import { handleTransactionError } from './client';

/**
 * Deposit PC (native Push Chain token) from user's Push wallet to treasury.
 * Uses the PushChain client initialized by PushProvider.
 */
export async function depositPC(amountPC: number): Promise<string> {
    const pushChainClient = getPushChainClientGlobal();
    if (!pushChainClient) {
        throw new Error('Push Chain client not initialized. Please connect your Push wallet first.');
    }

    const config = getPushConfig();
    if (!config.treasuryAddress) {
        throw new Error('Push Chain treasury address not configured.');
    }

    try {
        const amountWei = ethers.parseEther(amountPC.toString());

        const tx = await pushChainClient.universal.sendTransaction({
            to: config.treasuryAddress as `0x${string}`,
            value: amountWei,
            data: '0x' as `0x${string}`,
        });

        console.log(`PC deposit transaction sent: ${tx.hash}`);
        return tx.hash;
    } catch (error: any) {
        throw handleTransactionError(error);
    }
}
