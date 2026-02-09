'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { LiveChart, SettlementNotification } from './';
import { BalanceDisplay } from '@/components/balance';
import { startPriceFeed } from '@/lib/store/gameSlice';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'ethers';

export const GameBoard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address: address,
  });

  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<'bet' | 'wallet'>('bet');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Store connections
  const gameMode = useStore((state) => state.gameMode);
  const setGameMode = useStore((state) => state.setGameMode);
  const setTimeframeSeconds = useStore((state) => state.setTimeframeSeconds);
  const selectedAsset = useStore((state) => state.selectedAsset);
  const updatePrice = useStore((state) => state.updatePrice);
  const placeBetFromHouseBalance = useStore((state) => state.placeBetFromHouseBalance);
  const isPlacingBet = useStore((state) => state.isPlacingBet);

  // Sync selectedDuration with store's timeframeSeconds
  useEffect(() => {
    setTimeframeSeconds(selectedDuration);
  }, [selectedDuration, setTimeframeSeconds]);

  // Multiplier mapping based on duration
  const getMultiplier = (duration: number) => {
    switch (duration) {
      case 5: return 1.1;
      case 10: return 1.3;
      case 15: return 1.5;
      case 30: return 1.9;
      default: return 1.9;
    }
  };

  const handleBinomoBet = async (direction: 'UP' | 'DOWN') => {
    if (!address || !isConnected || gameMode !== 'binomo') return;

    try {
      const multiplier = getMultiplier(selectedDuration);
      await placeBetFromHouseBalance(
        betAmount,
        `${direction}-${multiplier}-${selectedDuration}`,
        address
      );
    } catch (err) {
      console.error("Failed to place Binomo bet:", err);
    }
  };

  // Start price feed and restart when asset changes
  useEffect(() => {
    console.log(`Starting price feed for ${selectedAsset}`);
    const stopFeed = startPriceFeed(updatePrice, selectedAsset);

    return () => {
      console.log(`Stopping price feed for ${selectedAsset}`);
      stopFeed();
    };
  }, [selectedAsset, updatePrice]);


  const formatAddress = (addr: string) => {
    if (!addr || addr.length <= 10) return addr || '---';
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
  };

  const bnbBalanceValue = balanceData ? parseFloat(formatUnits(balanceData.value, balanceData.decimals)) : 0;
  const formatBalance = (bal: number) => {
    return isNaN(bal) ? '0.0000' : bal.toFixed(4);
  };

  return (
    <div className="relative w-full h-full flex overflow-hidden">
      {/* Main Interactive Chart */}
      <div className="absolute inset-0 z-0">
        <LiveChart
          betAmount={betAmount}
          setBetAmount={setBetAmount}
        />
        <SettlementNotification />
      </div>

      {/* Instant resolution - no timer needed */}

      {/* Floating Toggle Button - Fixed to bottom (Mobile only) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="sm:hidden fixed bottom-4 left-4 w-10 h-10 bg-purple-600 rounded-full shadow-lg shadow-purple-500/40 flex items-center justify-center text-white text-lg font-bold z-40"
        >
          ▲
        </button>
      )}

      {/* Modern Quick Bet Panel - Collapsible on Mobile */}
      <div className="absolute bottom-3 sm:bottom-6 left-3 right-3 sm:left-6 sm:right-auto z-30 pointer-events-none">

        {/* Panel - Animated slide up/down on mobile */}
        <div className={`bg-gradient-to-br from-black/95 via-purple-950/30 to-black/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden w-full sm:w-[300px] transition-all duration-300 ease-out pointer-events-auto ${isPanelOpen
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-full opacity-0 scale-95 !pointer-events-none sm:translate-y-0 sm:opacity-100 sm:scale-100 sm:!pointer-events-auto'
          }`}>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsPanelOpen(false)}
            className="sm:hidden absolute top-2 right-2 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white text-xs z-10"
          >
            ✕
          </button>

          {/* Game Mode Selector */}
          <div className="flex gap-1 p-1 bg-black/60 border-b border-white/5">
            <button
              onClick={() => setGameMode('binomo')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all duration-200 ${gameMode === 'binomo'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40'
                : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              Classic
            </button>
            <button
              onClick={() => setGameMode('box')}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all duration-200 ${gameMode === 'box'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40'
                : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              Box Mode
            </button>
          </div>

          {/* Tab Navigation - Pill Style */}
          <div className="flex gap-1 p-2 bg-black/40">
            <button
              onClick={() => setActiveTab('bet')}
              className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'bet'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Bet
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'wallet'
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              Wallet
            </button>
          </div>

          {/* Content Area - Fixed Height */}
          <div className="p-4 min-h-[180px]">
            {activeTab === 'bet' ? (
              <div className="space-y-4">
                {/* Amount Presets */}
                <div>
                  <label className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-2 block">
                    Quick Amount
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0.1, 0.5, 1, 5, 10].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setBetAmount(amt.toString())}
                        className={`
                          py-2.5 rounded-lg font-bold text-sm transition-all duration-200
                          ${betAmount === amt.toString()
                            ? 'bg-gradient-to-b from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:scale-102'
                          }
                        `}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Selector */}
                <div>
                  <label className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-2 block">
                    Expiration Time
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 30].map(duration => (
                      <button
                        key={duration}
                        onClick={() => setSelectedDuration(duration)}
                        className={`
                          py-2 rounded-lg font-bold text-xs transition-all duration-200 border
                          ${selectedDuration === duration
                            ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                            : 'bg-black/40 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center">
                          <span>{duration}s</span>
                          <span className="text-[8px] opacity-70">x{getMultiplier(duration)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Input */}
                <div>
                  <label className="text-gray-500 text-[10px] font-medium uppercase tracking-widest mb-2 block">
                    Investment Amount
                  </label>
                  <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="flex-1 bg-transparent px-2 py-2 text-white font-mono text-base focus:outline-none min-w-0"
                      placeholder="0.00"
                    />
                    <span className="px-2 py-1.5 bg-purple-500/20 rounded-lg text-purple-400 text-[10px] font-bold shrink-0">
                      BNB
                    </span>
                  </div>
                </div>

                {/* Action Buttons / Instructions */}
                {gameMode === 'binomo' ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => handleBinomoBet('UP')}
                      disabled={!isConnected || isPlacingBet}
                      className="group relative flex flex-col items-center justify-center gap-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      <div className="text-emerald-500 text-2xl font-bold group-hover:scale-110 transition-transform">▲</div>
                      <span className="text-emerald-400 text-xs font-black tracking-tighter uppercase">Higher</span>
                      <span className="text-[8px] text-emerald-500/60 font-mono">Profit +{((getMultiplier(selectedDuration) - 1) * 100).toFixed(0)}%</span>
                    </button>

                    <button
                      onClick={() => handleBinomoBet('DOWN')}
                      disabled={!isConnected || isPlacingBet}
                      className="group relative flex flex-col items-center justify-center gap-1 py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      <div className="text-rose-500 text-2xl font-bold group-hover:scale-110 transition-transform">▼</div>
                      <span className="text-rose-400 text-xs font-black tracking-tighter uppercase">Lower</span>
                      <span className="text-[8px] text-rose-500/60 font-mono">Profit +{((getMultiplier(selectedDuration) - 1) * 100).toFixed(0)}%</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 text-center">
                      <p className="text-purple-300 text-xs font-bold uppercase tracking-widest mb-1">Box Mode Active</p>
                      <p className="text-gray-400 text-[10px] leading-relaxed">
                        Click any cell on the grid chart to place your bet. Each cell has a different multiplier based on its distance from the current price.
                      </p>
                    </div>
                  </div>
                )}

                {!isConnected && (
                  <p className="text-gray-500 text-[10px] text-center font-mono">
                    Connect wallet to start trading
                  </p>
                )}

              </div>
            ) : (
              <div className="space-y-4">
                {isConnected && address ? (
                  <>
                    {/* House Balance Display */}
                    <BalanceDisplay />

                    {/* Address Card */}
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-1">Wallet Address</p>
                      <p className="text-white font-mono text-sm">{formatAddress(address)}</p>
                    </div>

                    {/* Wallet Balance Display */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-transparent rounded-xl p-4 border border-purple-500/20">
                      <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Wallet Balance</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">
                          {isLoadingBalance ? 'Loading...' : formatBalance(bnbBalanceValue)}
                        </span>
                        <span className="text-purple-400 text-sm font-medium">BNB</span>
                      </div>
                    </div>

                    {/* Disconnect Button */}
                    <button
                      onClick={() => useStore.getState().disconnect()}
                      className="w-full py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-all duration-200"
                    >
                      Disconnect Wallet
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">No wallet connected</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
