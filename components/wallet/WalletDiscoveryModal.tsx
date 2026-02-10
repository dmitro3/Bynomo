'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useModal } from 'connectkit';
import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';

interface WalletDiscoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WalletDiscoveryModal: React.FC<WalletDiscoveryModalProps> = ({ isOpen, onClose }) => {
    const { setVisible: setSolanaVisible } = useWalletModal();
    const { setOpen: setBNBVisible } = useModal();

    const handleBNBConnect = () => {
        onClose();
        // Use a small timeout to ensure modal closing animation doesn't conflict
        setTimeout(() => {
            setBNBVisible(true);
        }, 100);
    };

    const handleSolanaConnect = () => {
        onClose();
        setTimeout(() => {
            setSolanaVisible(true);
        }, 100);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Select Network"
        >
            <div className="space-y-3 py-2">
                <div className="grid grid-cols-1 gap-2">
                    {/* BNB Smart Chain Selection */}
                    <button
                        onClick={handleBNBConnect}
                        className="group flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-purple-500/50 transition-all text-left"
                    >
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-105 transition-transform shrink-0">
                            <img src="/logos/bnb-logo.png" alt="BNB" className="w-5 h-5 object-contain" onError={(e) => (e.currentTarget.src = "https://cryptologos.cc/logos/binance-coin-bnb-logo.png")} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-medium text-sm">BNB Smart Chain</h3>
                            <p className="text-gray-500 text-[10px]">MetaMask, Trust, etc.</p>
                        </div>
                    </button>

                    {/* Solana Selection */}
                    <button
                        onClick={handleSolanaConnect}
                        className="group flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-blue-500/50 transition-all text-left"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                            <img src="/logos/solana-logo.png" alt="Solana" className="w-5 h-5 object-contain" onError={(e) => (e.currentTarget.src = "https://cryptologos.cc/logos/solana-sol-logo.png")} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-medium text-sm">Solana Network</h3>
                            <p className="text-gray-500 text-[10px]">Phantom, Solflare, etc.</p>
                        </div>
                    </button>
                </div>
            </div>
        </Modal>
    );
};
