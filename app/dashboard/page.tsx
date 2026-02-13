'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CurrencyStat {
    totalBalance: number;
    userCount: number;
}

interface Stats {
    totalVolume: number;
    totalBets: number;
    totalUsers: number;
    platformPnL: number;
    revenue: number;
    currencyStats: Record<string, CurrencyStat>;
}

interface User {
    user_address: string;
    currency: string;
    balance: number;
    updated_at: string;
    activity: {
        totalBets: number;
        totalVolume: number;
        wins: number;
    };
}

interface Transaction {
    id: number;
    user_address: string;
    operation_type: 'deposit' | 'withdrawal';
    amount: number;
    currency: string;
    transaction_hash: string;
    created_at: string;
}

interface MarketToken {
    symbol: string;
    pythId: string;
    price: number;
    category: string;
}

interface BetHistory {
    id: string;
    wallet_address: string;
    asset: string;
    direction: 'UP' | 'DOWN';
    amount: number;
    payout: number;
    won: boolean;
    created_at: string;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [marketTokens, setMarketTokens] = useState<MarketToken[]>([]);
    const [gameHistory, setGameHistory] = useState<BetHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'financial' | 'markets' | 'gameplay'>('users');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, txRes, mktRes, gameRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/users'),
                fetch('/api/admin/transactions'),
                fetch('/api/admin/currencies'),
                fetch('/api/admin/game-history')
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users || []);
            }
            if (txRes.ok) {
                const data = await txRes.json();
                setTransactions(data.transactions || []);
            }
            if (mktRes.ok) {
                const data = await mktRes.json();
                setMarketTokens(data.tokens || []);
            }
            if (gameRes.ok) {
                const data = await gameRes.json();
                setGameHistory(data.bets || []);
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const marketSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        marketTokens.forEach(t => {
            summary[t.category] = (summary[t.category] || 0) + 1;
        });
        return summary;
    }, [marketTokens]);

    const shortenAddress = (addr: string) => addr ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : 'N/A';

    return (
        <div className="min-h-screen bg-[#050505] text-[#a0a0a0] p-6 lg:p-12 font-sans selection:bg-white selection:text-black">
            <div className="max-w-[1400px] mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <h1 className="text-sm font-bold tracking-[0.3em] text-white uppercase">System Terminal v3.1</h1>
                        </div>
                        <p className="text-4xl md:text-5xl font-black text-white tracking-tighter">Core Operations</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={fetchData}
                            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black text-white uppercase tracking-widest transition-all"
                        >
                            {loading ? 'Syncing...' : 'Sync Terminal'}
                        </button>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatBox title="Platform Yield" value={`$${stats?.platformPnL.toLocaleString() || '0'}`} label="Cumulative PnL" />
                    <StatBox title="Market Volume" value={`$${stats?.totalVolume.toLocaleString() || '0'}`} label={`${stats?.totalBets || 0} Total Bets`} />
                    <StatBox title="Registered Nodes" value={stats?.totalUsers.toString() || '0'} label="Unique Wallet Addresses" />
                    <StatBox title="Market Assets" value={marketTokens.length.toString()} label="Active Price Feeds" />
                </div>

                {/* Navigation & Search */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
                        <div className="flex flex-wrap gap-8">
                            <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Ledger" />
                            <TabBtn active={activeTab === 'gameplay'} onClick={() => setActiveTab('gameplay')} label="Gameplay" />
                            <TabBtn active={activeTab === 'financial'} onClick={() => setActiveTab('financial')} label="Financials" />
                            <TabBtn active={activeTab === 'markets'} onClick={() => setActiveTab('markets')} label="Inventory" />
                        </div>
                        <div className="w-full md:w-96 relative">
                            <input
                                type="text"
                                placeholder="Global Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-xs text-white focus:outline-none focus:border-white/30 transition-all"
                            />
                        </div>
                    </div>

                    {/* Data Display */}
                    <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
                        <div className="overflow-x-auto">
                            <AnimatePresence mode="wait">
                                {activeTab === 'users' && (
                                    <Table key="users">
                                        <THead labels={['Identity', 'Protocol', 'Liquidity', 'Engagement', 'Value']} />
                                        <tbody>
                                            {loading ? <LoadingRow /> : users.map(u => (
                                                <tr key={u.user_address + u.currency} className="hover:bg-white/[0.02] transition-colors group border-b border-white/5">
                                                    <td className="px-8 py-6 font-mono text-white text-sm">{shortenAddress(u.user_address)}</td>
                                                    <td className="px-8 py-6"><span className="text-[10px] font-black border border-white/10 rounded px-2 py-1 uppercase">{u.currency}</span></td>
                                                    <td className="px-8 py-6 text-white font-mono font-bold">{u.balance.toFixed(4)}</td>
                                                    <td className="px-8 py-6 text-white/40">{u.activity.totalBets} plays</td>
                                                    <td className="px-8 py-6 text-right text-white font-mono font-black">${u.activity.totalVolume.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}

                                {activeTab === 'gameplay' && (
                                    <Table key="gameplay">
                                        <THead labels={['Time', 'Asset', 'Direction', 'Wager', 'Outcome', 'Node']} />
                                        <tbody>
                                            {loading ? <LoadingRow /> : gameHistory.map(b => (
                                                <tr key={b.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                                                    <td className="px-8 py-6 text-[10px] font-mono">{new Date(b.created_at).toLocaleString()}</td>
                                                    <td className="px-8 py-6 font-black text-white">{b.asset}</td>
                                                    <td className="px-8 py-6">
                                                        <span className={b.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}>{b.direction}</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-white font-mono">${b.amount.toFixed(2)}</td>
                                                    <td className="px-8 py-6">
                                                        <span className={b.won ? 'text-emerald-400 font-bold' : 'text-white/20'}>
                                                            {b.won ? `+$${b.payout.toFixed(2)}` : '-$' + b.amount.toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right font-mono text-[10px]">{shortenAddress(b.wallet_address)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}

                                {activeTab === 'financial' && (
                                    <Table key="financial">
                                        <THead labels={['Time', 'Identity', 'Operation', 'Amount', 'Ref']} />
                                        <tbody>
                                            {loading ? <LoadingRow /> : transactions.map(t => (
                                                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                                                    <td className="px-8 py-6 text-[10px] font-mono">{new Date(t.created_at).toLocaleString()}</td>
                                                    <td className="px-8 py-6 font-mono text-xs">{shortenAddress(t.user_address)}</td>
                                                    <td className="px-8 py-6">
                                                        <span className={t.operation_type === 'deposit' ? 'text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded uppercase text-[9px] font-black' : 'text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded uppercase text-[9px] font-black'}>
                                                            {t.operation_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-white font-mono font-bold">{t.operation_type === 'deposit' ? '+' : '-'}{t.amount.toFixed(4)} {t.currency}</td>
                                                    <td className="px-8 py-6 text-right font-mono text-[10px] text-white/20">{t.transaction_hash || 'INTERNAL'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}

                                {activeTab === 'markets' && (
                                    <div key="markets" className="p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {Object.entries(marketSummary).map(([cat, count]) => (
                                            <div key={cat} className="p-8 bg-white/[0.03] border border-white/10 rounded-[2rem] space-y-4">
                                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">{cat}</p>
                                                <div className="flex items-end justify-between">
                                                    <h4 className="text-5xl font-black text-white tracking-tighter">{count}</h4>
                                                    <p className="text-[10px] font-bold text-white/20 uppercase pb-2">Active Feeds</p>
                                                </div>
                                                <div className="w-full h-1 bg-white/5 rounded-full">
                                                    <div className="h-full bg-white/40 rounded-full" style={{ width: `${(count / marketTokens.length) * 100}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                        <div className="p-8 bg-white/5 border border-white/20 rounded-[2rem] flex flex-col justify-center">
                                            <p className="text-xs font-bold text-white uppercase tracking-widest text-center mb-1">Total Inventory</p>
                                            <p className="text-4xl font-black text-white text-center tracking-tighter">{marketTokens.length}</p>
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Minimal Components
const StatBox = ({ title, value, label }: any) => (
    <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] space-y-4">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">{title}</p>
        <div>
            <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{label}</p>
        </div>
    </div>
);

const TabBtn = ({ active, onClick, label }: any) => (
    <button onClick={onClick} className={`pb-4 text-[10px] font-black uppercase tracking-[0.4em] transition-all border-b-2 ${active ? 'text-white border-white' : 'text-white/20 border-transparent hover:text-white/40'}`}>
        {label}
    </button>
);

const Table = ({ children }: any) => <table className="w-full text-left border-collapse">{children}</table>;

const THead = ({ labels }: { labels: string[] }) => (
    <thead>
        <tr className="border-b border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
            {labels.map((l, i) => (
                <th key={l} className={`px-8 py-6 ${i === labels.length - 1 ? 'text-right' : ''}`}>{l}</th>
            ))}
        </tr>
    </thead>
);

const LoadingRow = () => (
    <tr><td colSpan={10} className="px-8 py-32 text-center text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Virtual Terminal...</td></tr>
);
