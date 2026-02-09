import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { getSOLBalance } from '@/lib/solana/client';

import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const WalletInfo: React.FC = () => {
  const { connection } = useConnection();
  const address = useStore((state) => state.address);
  const isConnected = useStore((state) => state.isConnected);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Fetch SOL balance when wallet connects or address changes
  useEffect(() => {
    let mounted = true;

    if (isConnected && address) {
      setIsLoadingBalance(true);

      const fetchBalance = async () => {
        try {
          const publicKey = new PublicKey(address);
          const balanceLamports = await connection.getBalance(publicKey, 'confirmed');
          const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

          if (mounted) {
            setSolBalance(balanceSOL);
          }
        } catch (error) {
          console.error('Failed to fetch SOL balance:', error);
          // Fallback
          try {
            const bal = await getSOLBalance(address);
            if (mounted) setSolBalance(bal);
          } catch (innerErr) {
            if (mounted) setSolBalance(0);
          }
        } finally {
          if (mounted) {
            setIsLoadingBalance(false);
          }
        }
      };

      fetchBalance();
    } else {
      setSolBalance(0);
    }

    return () => {
      mounted = false;
    };
  }, [isConnected, address, connection]);

  if (!isConnected || !address) {
    return null;
  }

  // Format address to show first 4 and last 4 characters (Solana style)
  const formatAddress = (addr: string) => {
    if (addr.length <= 8) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  // Format balance to 4 decimal places for SOL
  const formatBalance = (bal: number) => {
    return isNaN(bal) ? '0.0000' : bal.toFixed(4);
  };

  return (
    <Card className="min-w-[200px] border border-white/10 !bg-black/40 backdrop-blur-md">
      <div className="space-y-2">
        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">Solana Address</p>
          <p className="text-white font-mono text-xs">{formatAddress(address)}</p>
        </div>

        <div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">SOL Balance</p>
          <p className="text-[#00f5ff] font-bold text-lg font-mono drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]">
            {isLoadingBalance ? 'Loading...' : `${formatBalance(solBalance)} SOL`}
          </p>
        </div>
      </div>
    </Card>
  );
};
