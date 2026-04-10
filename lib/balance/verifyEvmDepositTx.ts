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

  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const [tx, receipt] = await Promise.all([
      withTimeout(provider.getTransaction(txHash), 12_000),
      withTimeout(provider.getTransactionReceipt(txHash), 12_000),
    ]);
    if (!tx || !receipt || receipt.status !== 1) return false;

    if (!tx.from || tx.from.toLowerCase() !== userAddress.toLowerCase()) return false;
    if (!tx.to || tx.to.toLowerCase() !== treasury.toLowerCase()) return false;

    const minWei = ethers.parseEther(amount.toString());
    return tx.value >= minWei;
  } catch (err) {
    console.error('[verifyEvmDepositTx] RPC error:', err);
    return false;
  }
}
