import { ethers } from 'ethers';
import { getBNBConfig } from '@/lib/bnb/config';
import { getPushConfig } from '@/lib/push/config';
import { getSomniaConfig } from '@/lib/somnia/config';
import { getZGConfig } from '@/lib/zg/config';

export async function verifyEvmDepositTx(
  txHash: string,
  userAddress: string,
  amount: number,
  currency: string
): Promise<boolean> {
  let rpc = '';
  let treasury = '';
  if (currency === 'BNB') {
    const cfg = getBNBConfig();
    rpc = cfg.rpcEndpoint;
    treasury = cfg.treasuryAddress;
  } else if (currency === 'PC' || currency === 'PUSH') {
    const cfg = getPushConfig();
    rpc = cfg.rpcEndpoint;
    treasury = cfg.treasuryAddress;
  } else if (currency === 'STT' || currency === 'SOMNIA') {
    const cfg = getSomniaConfig();
    rpc = cfg.rpcUrls[0];
    treasury = String(cfg.treasuryAddress || '');
  } else if (currency === '0G') {
    const cfg = getZGConfig();
    rpc = cfg.rpcUrls[0];
    treasury = String(cfg.treasuryAddress || '');
  } else {
    return false;
  }

  if (!rpc || !treasury) return false;

  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('RPC timeout')), ms))]);

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Retry up to 4 times with increasing delays — the RPC may not have indexed the tx yet.
  const attempts = [0, 2000, 5000, 10000]; // immediate, +2s, +5s, +10s
  for (const wait of attempts) {
    if (wait > 0) await delay(wait);
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const [tx, receipt] = await Promise.all([
        withTimeout(provider.getTransaction(txHash), 12_000),
        withTimeout(provider.getTransactionReceipt(txHash), 12_000),
      ]);

      // Tx not indexed yet — try next attempt
      if (!tx || !receipt) continue;

      if (receipt.status !== 1) return false; // tx reverted — no point retrying
      if (!tx.from || tx.from.toLowerCase() !== userAddress.toLowerCase()) return false;
      if (!tx.to || tx.to.toLowerCase() !== treasury.toLowerCase()) return false;

      const minWei = ethers.parseEther(amount.toString());
      return tx.value >= minWei;
    } catch (err) {
      console.error('[verifyEvmDepositTx] RPC error (will retry):', err);
      // Continue to next attempt
    }
  }

  console.error('[verifyEvmDepositTx] All attempts exhausted for', txHash);
  return false;
}
