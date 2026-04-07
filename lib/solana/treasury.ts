/**
 * Solana Treasury Service (Backend Only)
 * Handles automated payouts from the platform treasury wallet.
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Sends SOL from the treasury wallet to a user.
 */
export async function sendSOLFromTreasury(toAddress: string, amount: number): Promise<string> {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    
    const secretKeyStr = process.env.SOL_TREASURY_SECRET_KEY;
    if (!secretKeyStr) {
        throw new Error('SOL_TREASURY_SECRET_KEY is not configured');
    }

    try {
        const secretKey = bs58.decode(secretKeyStr);
        const treasuryKeypair = Keypair.fromSecretKey(secretKey);
        const toPublicKey = new PublicKey(toAddress);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: treasuryKeypair.publicKey,
                toPubkey: toPublicKey,
                lamports: Math.floor(amount * LAMPORTS_PER_SOL),
            })
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [treasuryKeypair]
        );

        return signature;
    } catch (error) {
        console.error('Error in sendSOLFromTreasury:', error);
        throw error;
    }
}

/**
 * Sends SPL tokens from the treasury wallet to a user.
 */
export async function sendTokenFromTreasury(
  toAddress: string, 
  amount: number, 
  mintAddress: string
): Promise<string> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');

  const secretKeyStr = process.env.SOL_TREASURY_SECRET_KEY;
  if (!secretKeyStr) {
    throw new Error('SOL_TREASURY_SECRET_KEY is not configured');
  }

  try {
    const { getOrCreateAssociatedTokenAccount, createTransferInstruction } = await import('@solana/spl-token');
    
    const secretKey = bs58.decode(secretKeyStr);
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(toAddress);
    const mintPublicKey = new PublicKey(mintAddress);

    // Get the treasury token account
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      mintPublicKey,
      treasuryKeypair.publicKey
    );

    // Get the destination token account
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair,
      mintPublicKey,
      toPublicKey
    );

    // Get mint info for decimals (assuming 9 for now, but better to fetch)
    const rawAmount = Math.floor(amount * 1_000_000_000);

    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        treasuryKeypair.publicKey,
        rawAmount
      )
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair]
    );

    return signature;
  } catch (error) {
    console.error('Error in sendTokenFromTreasury:', error);
    throw error;
  }
}
