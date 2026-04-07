/**
 * BNB Treasury Service (Backend Only)
 * Handles automated payouts from the platform treasury wallet.
 */

import { ethers } from 'ethers';

/**
 * Sends BNB from the treasury wallet to a user.
 */
export async function sendBNBFromTreasury(toAddress: string, amount: number): Promise<string> {
    const rpcUrl = process.env.NEXT_PUBLIC_BNB_RPC_ENDPOINT || 'https://bsc-dataseed.binance.org/';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const secretKey = process.env.BNB_TREASURY_SECRET_KEY;
    if (!secretKey) {
        throw new Error('BNB_TREASURY_SECRET_KEY is not configured');
    }

    try {
        const wallet = new ethers.Wallet(secretKey, provider);
        
        const tx = await wallet.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amount.toString()),
        });

        const receipt = await tx.wait();
        return receipt?.hash || tx.hash;
    } catch (error) {
        console.error('Error in sendBNBFromTreasury:', error);
        throw error;
    }
}
