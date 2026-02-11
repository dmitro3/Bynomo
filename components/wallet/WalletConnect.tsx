import React, { useState } from 'react';
import { ConnectKitButton } from 'connectkit';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount, useDisconnect } from 'wagmi';
import { WalletDiscoveryModal } from './WalletDiscoveryModal';
import { useOverflowStore } from '@/lib/store';

export const WalletConnect: React.FC = () => {
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const { connected: solanaConnected, publicKey, disconnect: solanaDisconnect } = useWallet();
  const { isConnected: bnbConnected, address: bnbAddress } = useAccount();
  const { disconnect: bnbDisconnect } = useDisconnect();
  const { network, setNetwork, setIsConnected, setAddress, setPreferredNetwork } = useOverflowStore();

  const handleDisconnect = () => {
    if (solanaConnected) {
      solanaDisconnect();
    }
    if (bnbConnected) {
      bnbDisconnect();
    }
    setAddress(null);
    setIsConnected(false);
    setNetwork(null);
    setPreferredNetwork(null);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isAnyConnected = solanaConnected || bnbConnected;
  const activeAddress = solanaConnected ? publicKey?.toBase58() : bnbAddress;

  return (
    <div className="flex items-center gap-3">
      {!isAnyConnected ? (
        <button
          onClick={() => setIsDiscoveryOpen(true)}
          data-tour="connect-button"
          className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all active:scale-95"
        >
          Connect
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
            <div className="w-4 h-4 shrink-0">
              <img
                src={solanaConnected ? '/logos/solana-sol-logo.png' : '/logos/bnb-bnb-logo.png'}
                alt="Network"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter">
                {solanaConnected ? 'Solana Network' : 'BNB Smart Chain'}
              </span>
              <span className="text-white text-[11px] font-mono leading-none">
                {activeAddress ? formatAddress(activeAddress) : '...'}
              </span>
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-all"
            title="Disconnect"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      )}

      <WalletDiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
      />
    </div>
  );
};
