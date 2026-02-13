/**
 * Tezos Backend Client
 * Used for administrative operations like withdrawals signing with Treasury Private Key
 */

import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';

/**
 * Get the Tezos provider with Treasury signer
 */
export async function getTezosTreasuryClient() {
    const rpcUrl = process.env.NEXT_PUBLIC_TEZOS_RPC_URL || 'https://mainnet.ecadinfra.com';
    const secretKey = process.env.TEZOS_TREASURY_SECRET_KEY;

    if (!secretKey) {
        throw new Error('TEZOS_TREASURY_SECRET_KEY is not configured');
    }

    const tezos = new TezosToolkit(rpcUrl);
    tezos.setSignerProvider(new InMemorySigner(secretKey));

    return tezos;
}

/**
 * Transfer XTZ from treasury to a user
 */
export async function transferXTZFromTreasury(
    toAddress: string,
    amountXTZ: number
): Promise<string> {
    try {
        const tezos = await getTezosTreasuryClient();

        // Taquito handles mutez conversion internally when using .transfer
        // But to be explicit and safe:
        console.log(`Initiating Tezos withdrawal: ${amountXTZ} XTZ to ${toAddress}`);

        const op = await tezos.contract.transfer({
            to: toAddress,
            amount: amountXTZ,
        });

        console.log(`Tezos withdrawal operation sent: ${op.hash}`);
        await op.confirmation(1);
        console.log(`Tezos withdrawal confirmed!`);

        return op.hash;
    } catch (error) {
        console.error('Failed to transfer XTZ from treasury:', error);
        throw error;
    }
}
