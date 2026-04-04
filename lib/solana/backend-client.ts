/**
 * Solana Backend Client
 * Used for administrative operations like withdrawals
 */

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import { getSolanaConfig } from './config';
import bs58 from 'bs58';

/**
 * Get the treasury keypair for backend operations
 */
export function getTreasuryKeypair(): Keypair {
    const secretKeyStr = process.env.SOL_TREASURY_SECRET_KEY;

    if (!secretKeyStr) {
        throw new Error('SOL_TREASURY_SECRET_KEY is not configured');
    }

    try {
        // Try parsing as JSON array first
        if (secretKeyStr.startsWith('[')) {
            return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKeyStr)));
        }
        // Fallback to base58
        return Keypair.fromSecretKey(bs58.decode(secretKeyStr));
    } catch (error) {
        throw new Error('Invalid SOL_TREASURY_SECRET_KEY format. Must be JSON array or base58.');
    }
}

/**
 * Transfer SOL from treasury to a user
 */
export async function transferSOLFromTreasury(
    toAddress: string,
    amountSOL: number
): Promise<string> {
    try {
        const config = getSolanaConfig();
        const connection = new Connection(config.rpcEndpoint, 'confirmed');
        const treasuryKeypair = getTreasuryKeypair();
        const toPublicKey = new PublicKey(toAddress);

        // Pre-check treasury balance to give a clear error instead of raw 0x1
        const treasuryLamports = await connection.getBalance(treasuryKeypair.publicKey);
        const requiredLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL) + 10_000; // 10k lamports for fee buffer
        if (treasuryLamports < requiredLamports) {
            throw new Error(
                `Treasury has insufficient SOL balance. Available: ${(treasuryLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL, required: ${amountSOL.toFixed(6)} SOL. Withdrawal is temporarily unavailable — please try again later or contact support.`
            );
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: treasuryKeypair.publicKey,
                toPubkey: toPublicKey,
                lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL),
            })
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [treasuryKeypair]
        );

        console.log(`SOL Withdrawal transaction confirmed: ${signature}`);
        return signature;
    } catch (error) {
        console.error('Failed to transfer SOL from treasury:', error);
        // Surface clean message for known simulation/insufficient-funds errors
        if (error instanceof Error) {
            const msg = error.message;
            if (msg.includes('0x1') || msg.includes('insufficient lamports') || msg.includes('Simulation failed')) {
                throw new Error('SOL withdrawal temporarily unavailable due to insufficient treasury balance. Please contact support.');
            }
        }
        throw error;
    }
}
/**
 * Transfer SPL Token from treasury to a user
 */
export async function transferTokenFromTreasury(
    toAddress: string,
    amount: number,
    mintAddress: string
): Promise<string> {
    try {
        const {
            getOrCreateAssociatedTokenAccount,
            createTransferInstruction,
            getMint
        } = await import('@solana/spl-token');

        const config = getSolanaConfig();
        const connection = new Connection(config.rpcEndpoint, 'confirmed');
        const treasuryKeypair = getTreasuryKeypair();
        const toPublicKey = new PublicKey(toAddress);
        const mintPublicKey = new PublicKey(mintAddress);

        // Get mint info to handle decimals
        const mintInfo = await getMint(connection, mintPublicKey);
        const decimals = mintInfo.decimals;

        // Get or create ATA for treasury (source)
        const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            treasuryKeypair,
            mintPublicKey,
            treasuryKeypair.publicKey
        );

        // Pre-check treasury token balance
        const tokenBalance = Number(fromTokenAccount.amount);
        const requiredRaw = Math.floor(amount * Math.pow(10, decimals));
        if (tokenBalance < requiredRaw) {
            throw new Error(
                `Treasury has insufficient token balance. Available: ${(tokenBalance / Math.pow(10, decimals)).toFixed(decimals)} tokens, required: ${amount}. Withdrawal is temporarily unavailable — please try again later or contact support.`
            );
        }

        // Get or create ATA for receiver (destination)
        // Note: receiver might need to pay for account creation if it doesn't exist,
        // but typically the sender (treasury) pays for it here.
        const toTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            treasuryKeypair,
            mintPublicKey,
            toPublicKey
        );

        const transaction = new Transaction().add(
            createTransferInstruction(
                fromTokenAccount.address,
                toTokenAccount.address,
                treasuryKeypair.publicKey,
                Math.floor(amount * Math.pow(10, decimals))
            )
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [treasuryKeypair]
        );

        console.log(`Token Withdrawal transaction confirmed: ${signature}`);
        return signature;
    } catch (error) {
        console.error('Failed to transfer token from treasury:', error);
        if (error instanceof Error) {
            const msg = error.message;
            if (msg.includes('0x1') || msg.includes('insufficient') || msg.includes('Simulation failed')) {
                throw new Error('Token withdrawal temporarily unavailable due to insufficient treasury balance. Please contact support.');
            }
        }
        throw error;
    }
}
