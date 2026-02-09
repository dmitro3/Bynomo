import React from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'ethers';
import { Card } from '@/components/ui/Card';

export const WalletInfo: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address: address,
  });

  if (!isConnected || !address) {
    return null;
  }

  // Format address to show first 4 and last 4 characters (Binance style)
  const formatAddress = (addr: string) => {
    if (addr.length <= 8) return addr;
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  // Format balance to 4 decimal places for BNB
  const bnbBalance = balanceData ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)) : 0;
  const formattedBalance = isNaN(bnbBalance) ? '0.0000' : bnbBalance.toFixed(4);

  return (
    <Card className="min-w-[200px] border border-white/10 !bg-black/40 backdrop-blur-md">
      <div className="space-y-2">
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">Binance Address</p>
          <p className="text-white font-mono text-xs">{formatAddress(address)}</p>
        </div>

        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">BNB Balance</p>
          <p className="text-[#00f5ff] font-bold text-lg font-mono drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]">
            {isLoadingBalance ? 'Loading...' : `${formattedBalance} BNB`}
          </p>
        </div>
      </div>
    </Card>
  );
};
