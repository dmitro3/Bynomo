'use client';

import React from 'react';
import { useOverflowStore } from '@/lib/store';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletConnection as useSuiConnection } from '@/lib/sui/wallet';
import { useModal } from 'connectkit';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Globe, ShieldCheck, Mail } from 'lucide-react';

export const WalletConnectModal: React.FC = () => {
    const isOpen = useOverflowStore(state => state.isConnectModalOpen);
    const setOpen = useOverflowStore(state => state.setConnectModalOpen);
    const setPreferredNetwork = useOverflowStore(state => state.setPreferredNetwork);

    const { login: loginPrivy } = usePrivy();
    const { select: selectSolanaWallet } = useWallet();
    const { setVisible: setSolanaModalVisible } = useWalletModal();
    const { connect: connectSui } = useSuiConnection();
    const { setOpen: openConnectKit } = useModal();

    const handlePrivyConnect = () => {
        setPreferredNetwork('BNB');
        loginPrivy();
        setOpen(false);
    };

    const handleWagmiConnect = () => {
        setPreferredNetwork('BNB');
        openConnectKit(true);
        setOpen(false);
    };

    const handleSolanaConnect = () => {
        setPreferredNetwork('SOL');
        setOpen(false);
        // Use the official Solana wallet adapter modal
        setTimeout(() => setSolanaModalVisible(true), 100);
    };

    const handleSuiConnect = () => {
        setPreferredNetwork('SUI');
        connectSui();
        setOpen(false);
    };

    const handleStellarConnect = async () => {
        const { openWalletModal } = await import('@/lib/stellar/wallet-kit');
        const address = await openWalletModal();
        if (address) {
            setPreferredNetwork('XLM');
            useOverflowStore.getState().setNetwork('XLM');
            useOverflowStore.getState().setAddress(address);
            useOverflowStore.getState().setIsConnected(true);
            // Fetch Stellar mainnet XLM balance
            useOverflowStore.getState().refreshWalletBalance();
        }
        setOpen(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Connect Wallet</h2>
                            <p className="text-sm text-gray-400 mt-1">Select your preferred blockchain</p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                        >
                            <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
                        </button>
                    </div>

                    {/* Options */}
                    <div className="p-6 space-y-3">
                        {/* BNB Wagmi Option */}
                        <button
                            onClick={handleWagmiConnect}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 group-hover:scale-110 transition-transform">
                                <img src="/logos/bnb-bnb-logo.png" alt="BNB" className="w-7 h-7" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">Binance Smart Chain</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/20 text-yellow-500 font-bold uppercase tracking-wider">BNB</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">MetaMask, Trust, and more</p>
                            </div>
                            <Globe className="w-5 h-5 text-gray-600 group-hover:text-yellow-500 transition-colors" />
                        </button>

                        {/* Solana Option */}
                        <button
                            onClick={handleSolanaConnect}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform">
                                <img src="/logos/solana-sol-logo.png" alt="Solana" className="w-7 h-7" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">Solana</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-500 font-bold uppercase tracking-wider">Fast</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Connect Phantom, Backpack, etc.</p>
                            </div>
                            <ShieldCheck className="w-5 h-5 text-gray-600 group-hover:text-teal-500 transition-colors" />
                        </button>

                        {/* Sui Option */}
                        <button
                            onClick={handleSuiConnect}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                                <img src="/logos/sui-logo.png" alt="Sui" className="w-7 h-7" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">Sui Network</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-500 font-bold uppercase tracking-wider">New</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Connect Sui Wallet, BlueMove, etc.</p>
                            </div>
                            <Wallet className="w-5 h-5 text-gray-600 group-hover:text-blue-500 transition-colors" />
                        </button>

                        {/* Stellar Option */}
                        <button
                            onClick={handleStellarConnect}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center border border-blue-400/20 group-hover:scale-110 transition-transform">
                                <img src="/logos/stellar-xlm-logo.png" alt="Stellar" className="w-7 h-7" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">Stellar Network</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-400/20 text-blue-400 font-bold uppercase tracking-wider">Mainnet</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Connect Freighter, Lobster, etc.</p>
                            </div>
                            <Globe className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                        </button>

                        {/* Privy Social Option */}
                        <button
                            onClick={handlePrivyConnect}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                                <Mail className="w-7 h-7 text-purple-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">Privy Login</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 font-bold uppercase tracking-wider">Social</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Email, Google, Twitter, etc.</p>
                            </div>
                            <Globe className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white/5 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            Securely powered by Binomo Protocol
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
