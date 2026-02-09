/**
 * Solana SDK Integration Module
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getSolanaConfig } from './config';
import { logTransactionError, logInfo } from '@/lib/logging/error-logger';

// Singleton Connection instance
let connection: Connection | null = null;

/**
 * Get or create a Solana connection instance
 */
export function getSolanaConnection(): Connection {
    if (!connection) {
        const config = getSolanaConfig();
        connection = new Connection(config.rpcEndpoint, 'confirmed');
    }
    return connection;
}

/**
 * Build a deposit transaction
 * Creates a transaction that transfers SOL to the treasury wallet
 */
export async function buildDepositTransaction(
    amount: number,
    userAddress: string
): Promise<Transaction> {
    const config = getSolanaConfig();
    const connection = getSolanaConnection();

    const userPublicKey = new PublicKey(userAddress);
    const treasuryPublicKey = new PublicKey(config.treasuryAddress);

    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: userPublicKey,
            toPubkey: treasuryPublicKey,
            lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPublicKey;

    return transaction;
}

/**
 * Get SOL balance for a given address
 */
export async function getSOLBalance(address: string): Promise<number> {
    const connection = getSolanaConnection();

    try {
        const publicKey = new PublicKey(address);
        const balance = await connection.getBalance(publicKey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Failed to get SOL balance:', error);
        return 0;
    }
}

/**
 * Get treasury balance
 */
export async function getTreasuryBalance(): Promise<number> {
    const config = getSolanaConfig();
    return getSOLBalance(config.treasuryAddress);
}

/**
 * Handle transaction errors
 */
export function handleTransactionError(error: any): Error {
    const errorMessage = error?.message?.toLowerCase() || '';

    if (
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied') ||
        errorMessage.includes('cancelled') ||
        error?.code === 4001
    ) {
        return new Error('Transaction was cancelled by user.');
    }

    if (errorMessage.includes('insufficient funds') || errorMessage.includes('0x1')) {
        return new Error('Insufficient SOL balance for this transaction.');
    }

    if (error instanceof Error) {
        return new Error(`Transaction failed: ${error.message}`);
    }

    return new Error('Transaction failed. Please try again.');
}
