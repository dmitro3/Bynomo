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
 * Verifies a native SOL or SPL deposit to the configured treasury (signature = tx id).
 */
export async function verifySolanaDepositTx(
    signature: string,
    userAddress: string,
    expectedAmount: number,
    tokenMint?: string,
): Promise<boolean> {
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) return false;

    try {
        const config = getSolanaConfig();
        if (!config.treasuryAddress) return false;

        const connection = new Connection(config.rpcEndpoint, 'confirmed');
        const treasuryPub = new PublicKey(config.treasuryAddress);
        const userPub = new PublicKey(userAddress);

        const parsed = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0,
        });

        if (!parsed || parsed.meta?.err) return false;

        if (!tokenMint) {
            const keys = parsed.transaction.message.accountKeys.map((k) =>
                typeof k === 'string' ? k : k.pubkey.toBase58(),
            );
            const treasuryIdx = keys.indexOf(treasuryPub.toBase58());
            const userIdx = keys.indexOf(userPub.toBase58());
            if (treasuryIdx === -1 || userIdx === -1) return false;
            const preT = parsed.meta.preBalances[treasuryIdx];
            const postT = parsed.meta.postBalances[treasuryIdx];
            const gained = postT - preT;
            const minLamports = Math.floor(expectedAmount * LAMPORTS_PER_SOL * 0.99);
            return gained >= minLamports;
        }

        const { getMint } = await import('@solana/spl-token');
        const mintPk = new PublicKey(tokenMint);
        const mintInfo = await getMint(connection, mintPk);
        const decimals = mintInfo.decimals;
        const minRaw = BigInt(Math.floor(expectedAmount * Math.pow(10, decimals) * 0.99));

        const treasuryStr = treasuryPub.toBase58();
        const preTb = parsed.meta.preTokenBalances || [];
        const postTb = parsed.meta.postTokenBalances || [];

        const row = (rows: typeof postTb) =>
            rows.find((b) => b.mint === tokenMint && b.owner === treasuryStr);

        const preRow = row(preTb);
        const postRow = row(postTb);
        const preAmt = BigInt(preRow?.uiTokenAmount?.amount ?? '0');
        const postAmt = BigInt(postRow?.uiTokenAmount?.amount ?? '0');
        const gained = postAmt - preAmt;
        return gained >= minRaw;
    } catch (err) {
        console.error('[verifySolanaDepositTx]', err);
        return false;
    }
}

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
