import { AptosClient } from 'aptos';
import { getAptosConfig } from './config';

/**
 * Verifies an Aptos deposit transaction on-chain.
 * @param txHash - Aptos transaction hash
 * @param userAddress - Expected sender address
 * @param amount - Expected amount in APT
 */
export async function verifyAptosDepositTx(
  txHash: string,
  userAddress: string,
  amount: number
): Promise<boolean> {
  const config = getAptosConfig();
  const client = new AptosClient(config.rpcUrls[0]);

  try {
    // Wait for transaction if necessary (though usually it's already confirmed when called here)
    const tx = await client.getTransactionByHash(txHash) as any;
    
    if (!tx || !tx.success) return false;

    // Check sender
    if (tx.sender.toLowerCase() !== userAddress.toLowerCase()) return false;

    // In Aptos, transfers are usually entry function payloads
    const payload = tx.payload;
    if (payload.function !== '0x1::aptos_account::transfer') return false;

    // Check recipient and amount
    const recipient = payload.arguments[0];
    const amountSent = parseInt(payload.arguments[1]);
    
    if (recipient.toLowerCase() !== config.treasuryAddress.toLowerCase()) return false;

    // Aptos uses 8 decimals for APT
    const expectedOctas = Math.floor(amount * 100_000_000);
    return amountSent >= expectedOctas;
  } catch (err) {
    console.error('[verifyAptosDepositTx] Aptos RPC error:', err);
    return false;
  }
}

/**
 * Transfers APT from the treasury wallet to a user.
 * @param toAddress - Recipient address
 * @param amount - Amount in APT
 */
export async function transferAPTFromTreasury(
  toAddress: string,
  amount: number
): Promise<string> {
  const { Account, Aptos, AptosConfig, Network } = await import('@aptos-labs/ts-sdk');
  
  const config = getAptosConfig();
  const aptosConfig = new AptosConfig({ network: Network.MAINNET });
  const aptos = new Aptos(aptosConfig);

  const secretKeyStr = process.env.APTOS_TREASURY_SECRET_KEY;
  if (!secretKeyStr) {
    throw new Error('APTOS_TREASURY_SECRET_KEY is not configured');
  }

  try {
    // Load treasury account
    const adminAccount = Account.fromPrivateKey({ privateKey: (secretKeyStr as any).startsWith('0x') ? (secretKeyStr as any) : `0x${secretKeyStr}` });

    // Build and send transaction
    const transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [toAddress, Math.floor(amount * 100_000_000)], // 8 decimals
      },
    });

    const pendingTx = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction,
    });

    const response = await aptos.waitForTransaction({ transactionHash: pendingTx.hash });
    return response.hash;
  } catch (error) {
    console.error('Error in transferAPTFromTreasury:', error);
    throw error;
  }
}
