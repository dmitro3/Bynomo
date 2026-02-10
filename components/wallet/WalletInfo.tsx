import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'ethers';
import { Card } from '@/components/ui/Card';
import { useOverflowStore } from '@/lib/store';

export const WalletInfo: React.FC = () => {
  const { network, address, isConnected } = useOverflowStore();

  // BNB Balance
  const { data: bnbBalanceData, isLoading: isLoadingBNB } = useBalance({
    address: network === 'BNB' ? address as `0x${string}` : undefined,
    query: {
      enabled: network === 'BNB' && !!address,
    }
  });

  // Solana Balance (using lazy import/hook logic)
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [isLoadingSOL, setIsLoadingSOL] = useState(false);

  useEffect(() => {
    if (network === 'SOL' && address) {
      const fetchSolBalance = async () => {
        setIsLoadingSOL(true);
        try {
          const { getSOLBalance } = await import('@/lib/solana/client');
          const bal = await getSOLBalance(address);
          setSolBalance(bal);
        } catch (e) {
          console.error('Failed to fetch SOL balance', e);
        } finally {
          setIsLoadingSOL(false);
        }
      };
      fetchSolBalance();
    }
  }, [network, address]);

  if (!isConnected || !address) {
    return null;
  }

  // Format address
  const formatAddress = (addr: string) => {
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  const currencySymbol = network === 'SOL' ? 'SOL' : 'BNB';
  const networkName = network === 'SOL' ? 'Solana' : 'Binance';

  let balance = '0.0000';
  let isLoading = false;

  if (network === 'BNB') {
    const val = bnbBalanceData ? parseFloat(formatUnits(bnbBalanceData.value, bnbBalanceData.decimals)) : 0;
    balance = val.toFixed(4);
    isLoading = isLoadingBNB;
  } else if (network === 'SOL') {
    balance = solBalance !== null ? solBalance.toFixed(4) : '0.0000';
    isLoading = isLoadingSOL;
  }

  return (
    <Card className="min-w-[200px] border border-white/10 !bg-black/40 backdrop-blur-md">
      <div className="space-y-2">
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">{networkName} Address</p>
          <p className="text-white font-mono text-xs">{formatAddress(address)}</p>
        </div>

        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">{currencySymbol} Balance</p>
          <p className="text-[#00f5ff] font-bold text-lg font-mono drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]">
            {isLoading ? 'Loading...' : `${balance} ${currencySymbol}`}
          </p>
        </div>
      </div>
    </Card>
  );
};
