/**
 * Push Chain SDK Integration Module
 * Push Chain is EVM-compatible — uses ethers.js like BNB
 */

import { ethers } from 'ethers';
import { getPushConfig } from './config';

// Singleton Provider instance
let provider: ethers.JsonRpcProvider | null = null;

/**
 * Get or create a Push Chain provider instance
 */
export function getPushProvider(): ethers.JsonRpcProvider {
    if (!provider) {
        const config = getPushConfig();
        provider = new ethers.JsonRpcProvider(config.rpcEndpoint);
    }
    return provider;
}

/**
 * Get PUSH native token balance for a given address
 */
export async function getPUSHBalance(address: string): Promise<number> {
    const provider = getPushProvider();

    try {
        const balance = await provider.getBalance(address);
        return parseFloat(ethers.formatEther(balance));
    } catch (error) {
        console.error('Failed to get PUSH balance:', error);
        return 0;
    }
}

/**
 * Get treasury balance on Push Chain
 */
export async function getTreasuryBalance(): Promise<number> {
    const config = getPushConfig();
    if (!config.treasuryAddress) return 0;
    return getPUSHBalance(config.treasuryAddress);
}

/**
 * Handle transaction errors
 */
export function handleTransactionError(error: any): Error {
    const errorMessage = error?.message?.toLowerCase() || '';

    if (
        errorMessage.includes('user rejected') ||
        errorMessage.includes('action_rejected') ||
        errorMessage.includes('user_rejected')
    ) {
        return new Error('Transaction was cancelled by user.');
    }

    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
        return new Error('Insufficient PUSH balance for this transaction.');
    }

    if (error instanceof Error) {
        return new Error(`Transaction failed: ${error.message}`);
    }

    return new Error('Transaction failed. Please try again.');
}
