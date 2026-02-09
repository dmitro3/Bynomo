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
  const [activeTab, setActiveTab] = useState<'bet' | 'wallet' | 'x402'>('bet');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Store connections
  const gameMode = useStore((state) => state.gameMode);
  const setGameMode = useStore((state) => state.setGameMode);
  const setTimeframeSeconds = useStore((state) => state.setTimeframeSeconds);
  const selectedAsset = useStore((state) => state.selectedAsset);
  const updatePrice = useStore((state) => state.updatePrice);
  const placeBetFromHouseBalance = useStore((state) => state.placeBetFromHouseBalance);
  const isPlacingBet = useStore((state) => state.isPlacingBet);
  const isBlitzActive = useStore((state) => state.isBlitzActive);
  const blitzEndTime = useStore((state) => state.blitzEndTime);
  const nextBlitzTime = useStore((state) => state.nextBlitzTime);
  const hasBlitzAccess = useStore((state) => state.hasBlitzAccess);
  const updateBlitzTimer = useStore((state) => state.updateBlitzTimer);
  const enableBlitzAccess = useStore((state) => state.enableBlitzAccess);
  const error = useStore((state) => state.error);
  const clearError = useStore((state) => state.clearError);


  const [blitzCountdown, setBlitzCountdown] = useState<string>('');
  const [blitzTimeRemaining, setBlitzTimeRemaining] = useState<string>('');

  // Update Blitz Timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateBlitzTimer();
      const now = Date.now();
      if (isBlitzActive && blitzEndTime) {
        const remaining = Math.max(0, blitzEndTime - now);
        setBlitzTimeRemaining(`${Math.floor(remaining / 1000)}s`);
        setBlitzCountdown('');
      } else {
        const timeToNext = Math.max(0, nextBlitzTime - now);
        const mins = Math.floor(timeToNext / 60000);
        const secs = Math.floor((timeToNext % 60000) / 1000);
        setBlitzCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
        setBlitzTimeRemaining('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isBlitzActive, blitzEndTime, nextBlitzTime, updateBlitzTimer]);


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

      {/* Blitz Round Indicator - Top Right */}
      <div className="absolute top-12 sm:top-20 right-3 sm:right-6 z-30 pointer-events-auto">
        <div className={`rounded-xl backdrop-blur-xl border shadow-lg overflow-hidden transition-all duration-500 ${isBlitzActive ? 'bg-gradient-to-br from-orange-500/20 via-red-500/20 to-yellow-500/20 border-orange-500/50 shadow-orange-500/30 animate-pulse' : 'bg-black/80 border-gray-700/50'
          }`}>
          <div className="px-3 py-2">
            {isBlitzActive ? (
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <div>
                  <p className="text-orange-400 text-[9px] font-bold uppercase tracking-wider">BLITZ ACTIVE</p>
                  <p className="text-white text-sm font-bold font-mono">{blitzTimeRemaining} left</p>
                </div>
                {hasBlitzAccess && (
                  <div className="ml-2 px-1.5 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-[8px] text-green-400 font-bold">2x</div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-lg opacity-50">⏰</span>
                <div>
                  <p className="text-gray-500 text-[9px] font-medium uppercase tracking-wider">Next Blitz</p>
                  <p className="text-gray-300 text-sm font-mono">{blitzCountdown}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
            <button
              onClick={() => setActiveTab('x402')}
              className={`flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${activeTab === 'x402'
                ? 'bg-gradient-to-r from-[#00f5ff] to-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                : 'text-[#00f5ff]/70 hover:text-[#00f5ff] hover:bg-[#00f5ff]/5'
                }`}
            >
              x402
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

                {/* ERROR MESSAGE DISPLAY */}
                {error && (
                  <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl relative group">
                    <button
                      onClick={clearError}
                      className="absolute top-2 right-2 text-red-500/50 hover:text-red-500 p-1"
                    >
                      ✕
                    </button>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Error</p>
                        <p className="text-red-300 text-[11px] leading-tight mt-0.5">
                          {error.includes('User not found') || error.includes('balance')
                            ? 'Account not found or no balance. Please deposit BNB to your house balance to start trading.'
                            : error}
                        </p>
                        {(error.includes('User not found') || error.includes('balance')) && (
                          <button
                            onClick={() => {
                              setActiveTab('wallet');
                              clearError();
                            }}
                            className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-bold transition-all"
                          >
                            Go to Deposit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!isConnected && (
                  <p className="text-gray-500 text-[10px] text-center font-mono">
                    Connect wallet to start trading
                  </p>
                )}
              </div>

            ) : activeTab === 'wallet' ? (
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
            ) : (
              <div className="space-y-4">
                {/* Blitz Round Section */}
                <div className={`rounded-lg p-3 relative overflow-hidden border ${isBlitzActive ? 'bg-gradient-to-br from-orange-500/20 via-red-500/10 to-yellow-500/10 border-orange-500/40' : 'bg-black/30 border-gray-700/50'}`}>
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-orange-500/30 text-orange-400 text-[8px] font-bold uppercase tracking-tighter rounded-bl-lg">🔥 Blitz</div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border ${isBlitzActive ? 'bg-orange-500/20 border-orange-500/30' : 'bg-gray-800/50 border-gray-700/30'}`}>
                      <span className="text-xl">{isBlitzActive ? '🔥' : '⏰'}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`text-[10px] uppercase tracking-wider font-mono ${isBlitzActive ? 'text-orange-400' : 'text-gray-500'}`}>{isBlitzActive ? 'Blitz Active!' : 'Next Blitz In'}</p>
                      <p className={`text-lg font-bold font-mono ${isBlitzActive ? 'text-orange-300' : 'text-gray-400'}`}>{isBlitzActive ? blitzTimeRemaining : blitzCountdown}</p>
                    </div>
                  </div>
                  {isBlitzActive && (
                    <button
                      onClick={() => enableBlitzAccess()}
                      disabled={!isConnected || hasBlitzAccess}
                      className={`w-full mt-3 py-2.5 rounded-lg text-xs font-bold transition-all ${hasBlitzAccess ? 'bg-green-500/20 border border-green-500/40 text-green-400 cursor-default' : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg hover:shadow-orange-500/30'}`}
                    >
                      {hasBlitzAccess ? <span className="flex items-center justify-center gap-2"><span>✓</span> 2x Multipliers Active</span> : !isConnected ? 'Connect Wallet' : `🔥 Enter Blitz (0.05 BNB)`}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-gray-600 text-[9px] uppercase">or</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>

                {/* AI Oracle Section (Simulated) */}
                <div className="bg-gradient-to-br from-[#00f5ff]/10 to-purple-500/10 border border-[#00f5ff]/30 rounded-lg p-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#00f5ff]/20 text-[#00f5ff] text-[8px] font-bold uppercase tracking-tighter rounded-bl-lg">AI</div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00f5ff]/10 border border-[#00f5ff]/20">
                      <svg className="w-5 h-5 text-[#00f5ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px] uppercase tracking-wider font-mono">AI Oracle</p>
                      <p className="text-[#00f5ff] text-lg font-bold font-mono">0.01 BNB</p>
                    </div>
                  </div>
                  <button
                    disabled={!isConnected}
                    className="w-full mt-3 py-2.5 bg-gradient-to-r from-[#00f5ff] to-cyan-500 text-black rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50"
                  >
                    Unlock AI Insight
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
