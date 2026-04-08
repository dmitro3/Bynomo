'use client';

import React, { useState } from 'react';
import { useOverflowStore } from '@/lib/store';
import { usePrivy } from '@privy-io/react-auth';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ConnectModal } from '@mysten/dapp-kit';
import { useModal } from 'connectkit';
import { useSwitchChain, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import { pushChainDonut } from '@/lib/bnb/wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Globe, ShieldCheck, Mail } from 'lucide-react';

export const WalletConnectModal: React.FC = () => {
    const isOpen = useOverflowStore(state => state.isConnectModalOpen);
    const setOpen = useOverflowStore(state => state.setConnectModalOpen);
    const setPreferredNetwork = useOverflowStore(state => state.setPreferredNetwork);

    const [suiModalOpen, setSuiModalOpen] = useState(false);
    const [pendingSuiNetwork, setPendingSuiNetwork] = useState<'SUI' | 'OCT' | null>(null);
    const [view, setView] = useState<'chains' | 'aptos'>('chains');

    const { login: loginPrivy } = usePrivy();
    const { select: selectSolanaWallet } = useWallet();
    const { setVisible: setSolanaModalVisible } = useWalletModal();
    const { setOpen: openConnectKit } = useModal();
    const { switchChain } = useSwitchChain();
    const { disconnect: wagmiDisconnect } = useWagmiDisconnect();
    const { openConnect: openInitiaConnect } = useInterwovenKit();
    const { wallets: aptosWallets, connect: connectAptos, connected: aptosConnected, disconnect: disconnectAptos, account: aptosAccount } = useAptosWallet();

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
        wagmiDisconnect();
        setPreferredNetwork('SOL');
        setOpen(false);
        // Use the official Solana wallet adapter modal
        setTimeout(() => setSolanaModalVisible(true), 100);
    };

    const handleSuiConnect = () => {
        wagmiDisconnect();
        setPreferredNetwork('SUI');
        setPendingSuiNetwork('SUI');
        setOpen(false);
        setTimeout(() => setSuiModalOpen(true), 100);
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

    const handleTezosConnect = async () => {
        try {
            const { BeaconWallet } = await import('@taquito/beacon-wallet');
            const { NetworkType } = await import('@airgap/beacon-sdk');

            const wallet = new BeaconWallet({
                name: "BYNOMO Protocol",
                preferredNetwork: NetworkType.MAINNET
            });

            await wallet.requestPermissions();
            const address = await wallet.getPKH();

            if (address) {
                setPreferredNetwork('XTZ');
                useOverflowStore.getState().setNetwork('XTZ');
                useOverflowStore.getState().setAddress(address);
                useOverflowStore.getState().setIsConnected(true);
                // Fetch Tezos mainnet XTZ balance
                useOverflowStore.getState().refreshWalletBalance();
                // Fetch Bynomo house balance for Tezos
                useOverflowStore.getState().fetchBalance(address);
            }
        } catch (error) {
            console.error("Tezos connection error:", error);
        }
        setOpen(false);
    };

    const handleNearConnect = async () => {
        setOpen(false);
        try {
            const { connectNearWallet } = await import('@/lib/near/wallet');
            const address = await connectNearWallet() as string;

            if (address) {
                setPreferredNetwork('NEAR');
                useOverflowStore.getState().setNetwork('NEAR');
                useOverflowStore.getState().setAddress(address);
                useOverflowStore.getState().setIsConnected(true);
                // Fetch NEAR house balance
                useOverflowStore.getState().fetchBalance(address);
                // Global balance of the wallet
                useOverflowStore.getState().refreshWalletBalance();
            }
        } catch (error) {
            console.error("NEAR connection error:", error);
        }
    };

    const handlePushConnect = () => {
        setPreferredNetwork('PUSH');
        switchChain({ chainId: pushChainDonut.id });
        openConnectKit(true);
        setOpen(false);
    };

    const handleSomniaConnect = () => {
        setPreferredNetwork('SOMNIA');
        openConnectKit(true);
        setOpen(false);
    };

    const handleZGConnect = () => {
        setPreferredNetwork('ZG');
        openConnectKit(true);
        setOpen(false);
    };

    const handleOneChainConnect = () => {
        setPreferredNetwork('OCT');
        setPendingSuiNetwork('OCT');
        setOpen(false);
        setTimeout(() => setSuiModalOpen(true), 100);
    };

    const handleInitiaConnect = () => {
        wagmiDisconnect(); // disconnect EVM wallet so it doesn't override INIT sync
        setPreferredNetwork('INIT');
        setOpen(false);
        setTimeout(() => openInitiaConnect(), 100);
    };

    const handleStarknetConnect = async () => {
        setOpen(false);
        try {
            const { connectStarknetWallet } = await import('@/lib/starknet/wallet');
            const address = await connectStarknetWallet();

            if (address) {
                setPreferredNetwork('STRK');
                useOverflowStore.getState().setNetwork('STRK');
                useOverflowStore.getState().setAddress(address);
                useOverflowStore.getState().setIsConnected(true);
                useOverflowStore.getState().fetchBalance(address);
                useOverflowStore.getState().refreshWalletBalance();
            }
        } catch (error) {
            console.error("Starknet connection error:", error);
        }
    };
    const handleAptosConnect = () => {
        wagmiDisconnect(); // disconnect EVM wallet so it doesn't override APT sync
        setView('aptos');
    };

    const handleAptosWalletClick = async (walletName: any) => {
        try {
            // If already connected to Aptos, just close modal and set network
            if (aptosConnected && aptosAccount) {
                setPreferredNetwork('APT');
                setOpen(false);
                return;
            }
            
            await connectAptos(walletName);
            setPreferredNetwork('APT');
            setOpen(false);
        } catch (error: any) {
            // If the error is "already connected", treat it as success
            if (error?.message?.includes('already connected') || error?.toString()?.includes('already connected')) {
                setPreferredNetwork('APT');
                setOpen(false);
                return;
            }
            console.error("Aptos connection error:", error);
        }
    };

    return (
        <>
        {/* Sui/OCT wallet selection modal */}
        <ConnectModal
            open={suiModalOpen}
            onOpenChange={(open) => {
                setSuiModalOpen(open);
                if (!open) setPendingSuiNetwork(null);
            }}
            trigger={<span style={{ display: 'none' }} />}
        />

        {!isOpen ? null : (
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
                    className="relative w-full max-w-md max-h-[90vh] bg-[#0f0f0f] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                >
                    {/* Header */}
                    <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent shrink-0">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                {view === 'aptos' ? 'Select Aptos Wallet' : 'Connect Wallet'}
                            </h2>
                            <p className="text-[11px] sm:text-sm text-gray-400 mt-1">
                                {view === 'aptos' ? 'Aptos Mainnet' : 'Select your preferred network'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {view === 'aptos' && (
                                <button
                                    onClick={() => setView('chains')}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white text-xs"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                            >
                                <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="p-4 sm:p-6 space-y-2 sm:space-y-3 overflow-y-auto no-scrollbar">
                        {view === 'chains' ? (
                            <>
                        {/* Solana Option */}
                        <button
                            onClick={handleSolanaConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/solana-sol-logo.png"
                                alt="Solana"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Solana</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-teal-500/20 text-teal-500 font-bold uppercase tracking-wider">Fast</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Phantom, Backpack, etc.</p>
                            </div>
                            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-teal-500 transition-colors" />
                        </button>

                        {/* BNB Wagmi Option */}
                        <button
                            onClick={handleWagmiConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/bnb-bnb-logo.png"
                                alt="BNB"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Binance Chain</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-yellow-500/20 text-yellow-500 font-bold uppercase tracking-wider">BNB</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">MetaMask, Trust, etc.</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-yellow-500 transition-colors" />
                        </button>

                        {/* OneChain Option */}
                        <button
                            onClick={handleOneChainConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-600/5 to-blue-600/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/onechain.png"
                                alt="OneChain"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/logos/ethereum-eth-logo.png';
                                }}
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">OneChain</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-blue-600/20 text-blue-400 font-bold uppercase tracking-wider">OCT</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">New</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Sui Wallet, BlueMove, etc.</p>
                            </div>
                            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                        </button>

                        {/* Sui Option */}
                        <button
                            onClick={handleSuiConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/sui-logo.png"
                                alt="Sui"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Sui Network</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-blue-500/20 text-blue-500 font-bold uppercase tracking-wider">New</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Sui Wallet, BlueMove, etc.</p>
                            </div>
                            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-blue-500 transition-colors" />
                        </button>

                        {/* NEAR Option */}
                        <button
                            onClick={handleNearConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-white/5 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/near.png"
                                alt="NEAR"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">NEAR</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-white/20 text-white font-bold uppercase tracking-wider">Near</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">MyNearWallet, Meteor, Here, etc.</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-white transition-colors" />
                        </button>

                        {/* Starknet Option */}
                        <button
                            onClick={handleStarknetConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-indigo-400/5 to-indigo-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/starknet-strk-logo.svg"
                                alt="Starknet"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Starknet</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-indigo-400/20 text-indigo-300 font-bold uppercase tracking-wider">STRK</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Argent X, Braavos</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-indigo-300 transition-colors" />
                        </button>

                        {/* Stellar Option */}
                        <button
                            onClick={handleStellarConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/stellar-xlm-logo.png"
                                alt="Stellar"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Stellar</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-blue-400/20 text-blue-400 font-bold uppercase tracking-wider">XLM</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Freighter, Lobster, etc.</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
                        </button>

                        {/* Tezos Option */}
                        <button
                            onClick={handleTezosConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/tezos-xtz-logo.png"
                                alt="Tezos"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Tezos</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-indigo-500/20 text-indigo-500 font-bold uppercase tracking-wider">XTZ</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Temple, Kukai, etc.</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-indigo-500 transition-colors" />
                        </button>

                        {/* 0G Mainnet Option */}
                        <button
                            onClick={handleZGConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/0g.png"
                                alt="0G"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/logos/ethereum-eth-logo.png';
                                }}
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">0G Mainnet</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">0G</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">New</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">MetaMask, Trust, any EVM wallet</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
                        </button>

                        {/* Push Chain Option */}
                        <button
                            onClick={handlePushConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-pink-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/push-logo.png"
                                alt="Push Chain"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Push Chain</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-pink-500/20 text-pink-400 font-bold uppercase tracking-wider">PUSH</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">New</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">MetaMask, Trust, any EVM wallet</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-pink-400 transition-colors" />
                        </button>

                        {/* Initia Option */}
                        <button
                            onClick={handleInitiaConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/5 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/initia.png"
                                alt="Initia"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/logos/ethereum-eth-logo.png';
                                }}
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Initia</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-red-500/20 text-red-400 font-bold uppercase tracking-wider">INIT</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">New</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Initia Wallet (InterwovenKit)</p>
                            </div>
                            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-red-400 transition-colors" />
                        </button>

                        {/* Somnia Option */}
                        <button
                            onClick={handleSomniaConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/somnia.jpg"
                                alt="Somnia"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Somnia</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-purple-500/20 text-purple-300 font-bold uppercase tracking-wider">STT</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">EVM-like (wagmi)</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-purple-300 transition-colors" />
                        </button>

                        {/* Aptos Option */}
                        <button
                            onClick={handleAptosConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                                src="/logos/aptos-logo.png"
                                alt="Aptos"
                                className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0 group-hover:scale-110 transition-transform"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://cryptologos.cc/logos/aptos-apt-logo.png";
                                }}
                            />
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Aptos Mainnet</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-purple-500/20 text-purple-400 font-bold uppercase tracking-wider">APT</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-green-500/20 text-green-400 font-bold uppercase tracking-wider">New</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Petra, Martian, Pontem, etc.</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                        </button>

                        {/* Privy Social Option */}
                        <button
                            onClick={handlePrivyConnect}
                            className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-purple-300" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm sm:text-base">Social Login</span>
                                    <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] bg-purple-500/20 text-purple-400 font-bold uppercase tracking-wider">Email</span>
                                </div>
                                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Google, Twitter, Email, etc.</p>
                            </div>
                            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                        </button>
                        </>
                        ) : (
                            <div className="space-y-2">
                                {aptosWallets.length === 0 && (
                                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        <Wallet className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                                        <p className="text-sm text-gray-400">No Aptos wallets detected.</p>
                                        <a 
                                            href="https://petra.app/" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-purple-400 hover:text-purple-300 mt-2 inline-block"
                                        >
                                            Install Petra Wallet
                                        </a>
                                    </div>
                                )}
                                {aptosWallets.map((wallet: any) => (
                                    <button
                                        key={wallet.name}
                                        onClick={() => handleAptosWalletClick(wallet.name)}
                                        className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform shrink-0">
                                            {wallet.icon ? (
                                                <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 sm:w-7 sm:h-7" />
                                            ) : (
                                                <Wallet className="w-6 h-6 text-purple-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <span className="font-bold text-white text-sm sm:text-base">{wallet.name}</span>
                                            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Connect to {wallet.name}</p>
                                        </div>
                                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white/5 text-center shrink-0">
                        <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            BYNOMO Protocol · Pyth Hermes
                        </p>
                        <p className="text-[9px] text-gray-600 mt-1">Powered by Pyth Hermes · BYNOMO Protocol</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
        )}
        </>
    );
};
