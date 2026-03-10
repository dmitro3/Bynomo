import { getStarknetConfig } from './config';

const DECIMALS = BigInt(18);

function parseToUnits(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    return BigInt(0);
  }

  const normalized = amount.toFixed(Number(DECIMALS));
  const [whole, fraction = ''] = normalized.split('.');
  const fractionPadded = fraction.padEnd(Number(DECIMALS), '0').slice(0, Number(DECIMALS));
  return BigInt(whole) * BigInt(10) ** DECIMALS + BigInt(fractionPadded || '0');
}

function uint256ToBigInt(low: string, high: string): bigint {
  return BigInt(low) + (BigInt(high) << BigInt(128));
}

function toUint256Parts(value: bigint): { low: string; high: string } {
  const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
  return {
    low: (value & mask).toString(),
    high: (value >> BigInt(128)).toString(),
  };
}

export async function getSTRKBalance(address: string): Promise<number> {
  const fallbackRpcEndpoints = [
    'https://rpc.starknet.lava.build',
    'https://starknet-mainnet.public.blastapi.io/rpc/v0_8',
  ];

  try {
    const { RpcProvider } = await import('starknet');
    const { rpcEndpoint, strkTokenAddress } = getStarknetConfig();
    const triedEndpoints = Array.from(new Set([rpcEndpoint, ...fallbackRpcEndpoints]));

    for (const endpoint of triedEndpoints) {
      try {
        const provider = new RpcProvider({ nodeUrl: endpoint });
        const result = await provider.callContract({
          contractAddress: strkTokenAddress,
          entrypoint: 'balance_of',
          calldata: [address],
        });

        const low = result[0] ?? '0';
        const high = result[1] ?? '0';
        const balanceWei = uint256ToBigInt(low, high);
        return Number(balanceWei) / 10 ** Number(DECIMALS);
      } catch {
        continue;
      }
    }

    throw new Error('Unable to reach Starknet RPC endpoints');
  } catch (error) {
    console.error('Failed to fetch STRK balance:', error);
    return 0;
  }
}

export async function buildSTRKTransferCalldata(toAddress: string, amountSTRK: number): Promise<string[]> {
  const amountWei = parseToUnits(amountSTRK);
  const { low, high } = toUint256Parts(amountWei);
  return [toAddress, low, high];
}
