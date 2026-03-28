'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CurrencyStat {
    totalBalance: number;
    userCount: number;
}

interface NetworkPnLRow {
    volume: number;
    payout: number;
    platformPnL: number;
}

interface ModeStats {
    totalVolume: number;
    totalBets: number;
    platformPnL: number;
    /** House edge Σ(stake−payout) per `bet_history.network` in that chain's native units */
    platformPnLByNetwork?: Record<string, NetworkPnLRow>;
    totalUsers: number;
    totalReferrals: number;
}

interface Stats {
    // Overall (demo + real) fallback fields
    totalVolume: number;
    totalBets: number;
    totalUsers: number;
    platformPnL: number;
    revenue: number;
    currencyStats: Record<string, CurrencyStat>;
    // Split metrics
    demo: ModeStats;
    real: ModeStats;
}

interface User {
    user_address: string;
    username: string | null;
    currency: string;
    balance: number;
    updated_at: string;
    activity: {
        totalBets: number;
        totalVolume: number;
        wins: number;
    };
    referral?: {
        referral_code: string;
        referral_count: number;
        referred_by: string | null;
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

interface BannedWalletRow {
    wallet_address: string;
    reason: string | null;
    created_at: string;
}

function fmtPnL(n: number | undefined | null) {
    if (n === undefined || n === null || !Number.isFinite(n)) return '0';
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Native token ticker for bet_history.network — not USD. */
function tokenSymbolForNetwork(net: string): string {
    const u = net.trim().toUpperCase();
    if (u === 'SOMNIA' || u === 'STT') return 'STT';
    if (u === 'PUSH' || u === 'PC') return 'PC';
    if (u === 'BSC') return 'BNB';
    if (u === '0G' || u === 'ZG') return '0G';
    return u || '?';
}

function NetworkTokenEconomicsTable({ rows, title }: { rows?: Record<string, NetworkPnLRow>; title: string }) {
    if (!rows || Object.keys(rows).length === 0) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/30">
                No per-chain betting data yet.
            </div>
        );
    }
    const sorted = Object.entries(rows).sort(
        (a, b) => Math.abs(b[1].platformPnL) - Math.abs(a[1].platformPnL),
    );
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/45">{title}</p>
                <p className="text-[11px] text-white/40 leading-relaxed">
                    Each row is one chain. Amounts are in that row’s <span className="text-white/70">native token</span> (not dollars).{' '}
                    <span className="text-amber-200/80">Do not sum numbers down the column across different tokens.</span>
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px] min-w-[640px]">
                    <thead>
                        <tr className="text-[9px] font-black uppercase tracking-wider text-white/35 border-b border-white/10 bg-white/[0.02]">
                            <th className="px-4 py-3">Chain</th>
                            <th className="px-4 py-3">Token</th>
                            <th className="px-4 py-3 text-right">Staked</th>
                            <th className="px-4 py-3 text-right">Paid to players</th>
                            <th className="px-4 py-3 text-right">Net (house)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(([net, row]) => {
                            const sym = tokenSymbolForNetwork(net);
                            const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 6 });
                            return (
                                <tr key={net} className="border-b border-white/5 font-mono text-white/85">
                                    <td className="px-4 py-2.5">{net}</td>
                                    <td className="px-4 py-2.5 text-white/50">{sym}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">
                                        {fmt(row.volume)} <span className="text-[10px] text-white/35">{sym}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">
                                        {fmt(row.payout)} <span className="text-[10px] text-white/35">{sym}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">
                                        <span className={row.platformPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {fmt(row.platformPnL)} <span className="text-[10px] opacity-70">{sym}</span>
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
    const [marketTokens, setMarketTokens] = useState<MarketToken[]>([]);
    const [gameHistory, setGameHistory] = useState<BetHistory[]>([]);
    const [suspiciousUsers, setSuspiciousUsers] = useState<any[]>([]);
    const [bannedWallets, setBannedWallets] = useState<BannedWalletRow[]>([]);
    const [banAddressInput, setBanAddressInput] = useState('');
    const [banReasonInput, setBanReasonInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    // Default to Waitlist so collected emails are visible immediately.
    const [activeTab, setActiveTab] = useState<
        'wallet_intel' | 'users' | 'financial' | 'markets' | 'gameplay' | 'danger' | 'referrals' | 'waitlist' | 'access_codes'
    >('wallet_intel');
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [waitlistError, setWaitlistError] = useState<string | null>(null);
    const [accessCodes, setAccessCodes] = useState<any[]>([]);

    const [walletIntelQuery, setWalletIntelQuery] = useState('');
    const [walletIntel, setWalletIntel] = useState<any | null>(null);
    const [walletIntelLoading, setWalletIntelLoading] = useState(false);
    const [walletIntelError, setWalletIntelError] = useState<string | null>(null);

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [gameplayFilter, setGameplayFilter] = useState<'all' | 'real' | 'demo'>('all');
    const [chainFilter, setChainFilter] = useState<string>('ALL');

    const getExplorerUrl = (currency: string, hash: string) => {
        if (!hash || hash === 'INTERNAL') return null;
        switch (currency.toUpperCase()) {
            case 'BNB': return `https://bscscan.com/tx/${hash}`;
            case 'NEAR': return `https://nearblocks.io/txns/${hash}`;
            case 'SOL': return `https://solscan.io/tx/${hash}`;
            case 'SUI': return `https://suiscan.xyz/tx/${hash}`;
            case 'XTZ': return `https://tzkt.io/${hash}`;
            case 'XLM': return `https://stellar.expert/explorer/public/tx/${hash}`;
            case 'STRK': return `https://starkscan.co/tx/${hash}`;
            default: return null;
        }
    };

    const runWalletIntel = async () => {
        const q = walletIntelQuery.trim();
        if (!q) return;
        setWalletIntelLoading(true);
        setWalletIntelError(null);
        try {
            const res = await fetch(`/api/admin/wallet-insights?address=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Lookup failed');
            setWalletIntel(data);
        } catch (e: unknown) {
            setWalletIntelError(e instanceof Error ? e.message : 'Lookup failed');
            setWalletIntel(null);
        } finally {
            setWalletIntelLoading(false);
        }
    };

    const exportAccessCodes = () => {
        const headers = ["Access Code", "Status", "Wallet Link", "Authorized At"];
        const rows = accessCodes.map(c => [
            c.code,
            c.is_used ? "Consumed" : "Ready",
            c.wallet_address || "UNLINKED",
            c.used_at ? new Date(c.used_at).toLocaleString() : "---"
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `bynomo_access_codes_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        const auth = localStorage.getItem('admin_authorized');
        if (auth === 'true') {
            setIsAuthorized(true);
            fetchData();
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === '1704') {
            setIsAuthorized(true);
            localStorage.setItem('admin_authorized', 'true');
            fetchData();
        } else {
            alert('Yanlış şifre!');
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            fetchData();
        }
    }, [isAuthorized]);

    const fetchData = async () => {
        setLoading(true);
        setWaitlistError(null);
        try {
            const [statsRes, usersRes, txRes, mktRes, gameRes, dangerRes, bannedRes, waitlistRes, accessCodesRes, pendingWithdrawalsRes] = await Promise.all([
                fetch('/api/admin/stats'),
                fetch('/api/admin/users'),
                fetch('/api/admin/transactions'),
                fetch('/api/admin/currencies'),
                fetch('/api/admin/game-history'),
                fetch('/api/admin/danger-zone'),
                fetch('/api/admin/banned-wallets'),
                fetch('/api/admin/waitlist'),
                fetch('/api/admin/access-codes'),
                fetch('/api/admin/withdrawal-requests/pending')
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
            if (dangerRes.ok) {
                const data = await dangerRes.json();
                setSuspiciousUsers(data.suspiciousUsers || []);
            }
            if (bannedRes.ok) {
                const data = await bannedRes.json();
                setBannedWallets(data.bans || []);
            }
            if (waitlistRes.ok) {
                const data = await waitlistRes.json();
                setWaitlist(data.waitlist || []);
                setWaitlistError(null);
            } else {
                try {
                    const data = await waitlistRes.json();
                    setWaitlistError(data?.error || `Failed to load waitlist (HTTP ${waitlistRes.status})`);
                } catch {
                    setWaitlistError(`Failed to load waitlist (HTTP ${waitlistRes.status})`);
                }
            }
            if (accessCodesRes.ok) {
                const data = await accessCodesRes.json();
                setAccessCodes(data.codes || []);
            }
            if (pendingWithdrawalsRes.ok) {
                const data = await pendingWithdrawalsRes.json();
                setPendingWithdrawals(data.requests || []);
            }
        } catch (error) {
            console.error('Failed to fetch admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateAccessCodes = async (count: number = 5) => {
        try {
            const res = await fetch('/api/admin/access-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Failed to generate codes:', error);
        }
    };

    const addGlobalBan = async () => {
        const addr = banAddressInput.trim();
        if (!addr) return;
        try {
            const res = await fetch('/api/admin/banned-wallets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: addr,
                    reason: banReasonInput.trim() || 'Banned by administrator',
                }),
            });
            if (res.ok) {
                setBanAddressInput('');
                setBanReasonInput('');
                fetchData();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err?.error || 'Failed to add ban');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const removeGlobalBan = async (walletAddress: string) => {
        try {
            const res = await fetch(
                `/api/admin/banned-wallets?walletAddress=${encodeURIComponent(walletAddress)}`,
                { method: 'DELETE' }
            );
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const updateUserStatus = async (userAddress: string, status: string) => {
        try {
            const res = await fetch('/api/admin/users/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userAddress, status })
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const acceptWithdrawalRequest = async (requestId: number) => {
        try {
            const res = await fetch(`/api/admin/withdrawal-requests/${requestId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) await fetchData();
        } catch (e) {
            console.error('Failed to accept withdrawal request:', e);
        }
    };

    const rejectWithdrawalRequest = async (requestId: number) => {
        try {
            const res = await fetch(`/api/admin/withdrawal-requests/${requestId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) await fetchData();
        } catch (e) {
            console.error('Failed to reject withdrawal request:', e);
        }
    };

    const marketSummary = useMemo(() => {
        const summary: Record<string, number> = {};
        marketTokens.forEach(t => {
            if (!summary[t.category]) summary[t.category] = 0;
            summary[t.category]++;
        });
        return summary;
    }, [marketTokens]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Neural Access</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold mt-2">Restricted Area</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <input
                                type="password"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="ACCESS KEY"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white font-mono text-sm tracking-[0.5em] placeholder:tracking-normal placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-white text-black font-bold uppercase tracking-widest text-xs py-3 rounded-xl hover:bg-white/90 transition-colors"
                        >
                            Authorize
                        </button>
                    </form>
                </div>
            </div>
        );
    }

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

                {/* Betting economics: never show a single “$” or one mixed total as PnL — use per-chain native token table */}
                <div className="space-y-6">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Real Mode Stats</div>
                    <NetworkTokenEconomicsTable rows={stats?.real?.platformPnLByNetwork} title="Betting economics by chain (native tokens)" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatBox
                            title="Total bets (real)"
                            value={(stats?.real?.totalBets ?? 0).toLocaleString()}
                            label="Settled bets in history"
                        />
                        <StatBox
                            title="Σ staked (mixed)"
                            value={fmtPnL(stats?.real?.totalVolume)}
                            label="Raw sum of stake amounts — mixed tokens, not one currency"
                        />
                        <StatBox title="Registered Nodes" value={stats?.real?.totalUsers.toString() || '0'} label="Unique Wallet Addresses" />
                        <StatBox title="Total Referrals" value={(stats?.real?.totalReferrals ?? 0).toString()} label="Network Growth" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatBox title="Market Assets" value={marketTokens.length.toString()} label="Active Price Feeds" />
                    </div>

                    <div className="pt-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Demo Mode Stats</div>
                    <NetworkTokenEconomicsTable rows={stats?.demo?.platformPnLByNetwork} title="Demo — betting economics by chain (native tokens)" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatBox
                            title="Total bets (demo)"
                            value={(stats?.demo?.totalBets ?? 0).toLocaleString()}
                            label="Settled bets in history"
                        />
                        <StatBox
                            title="Σ staked (mixed)"
                            value={fmtPnL(stats?.demo?.totalVolume)}
                            label="Raw sum of stake amounts — mixed tokens"
                        />
                        <StatBox title="Registered Nodes" value={stats?.demo?.totalUsers.toString() || '0'} label="Unique Wallet Addresses" />
                        <StatBox title="Total Referrals" value={(stats?.demo?.totalReferrals ?? 0).toString()} label="Network Growth" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatBox title="Market Assets" value={marketTokens.length.toString()} label="Active Price Feeds" />
                    </div>
                </div>

                {/* Navigation & Search */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
                        <div className="flex flex-wrap gap-8">
                            <TabBtn active={activeTab === 'wallet_intel'} onClick={() => setActiveTab('wallet_intel')} label="Wallet Intel" />
                            <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Ledger" />
                            <TabBtn active={activeTab === 'gameplay'} onClick={() => setActiveTab('gameplay')} label="Gameplay" />
                            <TabBtn active={activeTab === 'financial'} onClick={() => setActiveTab('financial')} label="Financials" />
                            <TabBtn active={activeTab === 'markets'} onClick={() => setActiveTab('markets')} label="Inventory" />
                            <TabBtn active={activeTab === 'referrals'} onClick={() => setActiveTab('referrals')} label="Referrals" />
                            <TabBtn active={activeTab === 'waitlist'} onClick={() => setActiveTab('waitlist')} label="Waitlist" />
                            <TabBtn active={activeTab === 'access_codes'} onClick={() => setActiveTab('access_codes')} label="Access Codes" />
                            <TabBtn active={activeTab === 'danger'} onClick={() => setActiveTab('danger')} label="Danger Zone" />
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
                                {activeTab === 'wallet_intel' && (
                                    <div key="wallet_intel" className="p-8 space-y-8 text-left">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/35">Cross-chain wallet intelligence</p>
                                            <p className="text-xs text-white/45 max-w-3xl leading-relaxed">
                                                Enter any address (EVM, Solana, Sui, etc.). We match stored variants (e.g. EVM checksum) and aggregate{' '}
                                                <span className="text-white/70">house balances</span>,{' '}
                                                <span className="text-white/70">audit log</span>,{' '}
                                                <span className="text-white/70">bets</span>, and{' '}
                                                <span className="text-white/70">withdrawal requests</span>.
                                                Amounts are <span className="text-amber-200/90">native units per currency</span>, not USD.
                                            </p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center max-w-4xl">
                                            <input
                                                value={walletIntelQuery}
                                                onChange={e => setWalletIntelQuery(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && runWalletIntel()}
                                                placeholder="e.g. Csx2cq3q7GeV79hFUuRR4Pa2T6JUBoC2UjWGbkVqQ4t4 or 0x…"
                                                className="flex-1 px-5 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-sm font-mono placeholder:text-white/25"
                                            />
                                            <button
                                                type="button"
                                                onClick={runWalletIntel}
                                                disabled={walletIntelLoading}
                                                className="px-8 py-3 rounded-xl bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-white/90 disabled:opacity-50"
                                            >
                                                {walletIntelLoading ? 'Scanning…' : 'Analyze wallet'}
                                            </button>
                                        </div>
                                        {walletIntelError && (
                                            <p className="text-sm text-rose-400 font-mono">{walletIntelError}</p>
                                        )}
                                        {walletIntel && (
                                            <div className="space-y-8 border-t border-white/10 pt-8">
                                                <div className="flex flex-wrap gap-3 text-[11px]">
                                                    <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-white/80">
                                                        Query: <span className="text-white">{walletIntel.query}</span>
                                                    </span>
                                                    {walletIntel.bannedGlobally && (
                                                        <span className="px-3 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 font-black uppercase text-[10px]">
                                                            Globally banned
                                                        </span>
                                                    )}
                                                    {walletIntel.aggregates?.audit?.auditTruncated && (
                                                        <span className="text-amber-400/90">Audit log truncated (cap {walletIntel.aggregates.audit.cappedAt})</span>
                                                    )}
                                                    {walletIntel.aggregates?.betting?.betsTruncated && (
                                                        <span className="text-amber-400/90">Bets truncated (cap {walletIntel.aggregates.betting.betsCappedAt})</span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">House balances (per currency)</p>
                                                        {(!walletIntel.balances || walletIntel.balances.length === 0) && (
                                                            <p className="text-white/30 text-sm">No balance rows for this address.</p>
                                                        )}
                                                        <div className="space-y-2">
                                                            {walletIntel.balances?.map((b: any) => (
                                                                <div key={b.currency + (b.status || '')} className="flex flex-wrap justify-between gap-2 text-sm border-b border-white/5 pb-2">
                                                                    <span className="font-mono text-white/70">{b.currency}</span>
                                                                    <span className="font-mono text-white">Balance {Number(b.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                                    <span className={`text-[10px] font-black uppercase ${b.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>{b.status}</span>
                                                                    <span className="text-[10px] text-white/40 w-full sm:w-auto">
                                                                        Withdrawable now:{' '}
                                                                        <span className="text-emerald-300/90 font-mono">{Number(b.withdrawableNow).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                                        {walletIntel.bannedGlobally && ' (0 if banned)'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Deposits & withdrawals (audit log)</p>
                                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                                            <div>
                                                                <p className="text-[9px] uppercase text-white/35">Deposits count</p>
                                                                <p className="font-mono text-lg text-emerald-400">{walletIntel.aggregates?.audit?.depositCount ?? 0}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] uppercase text-white/35">Withdrawals count</p>
                                                                <p className="font-mono text-lg text-rose-300">{walletIntel.aggregates?.audit?.withdrawalCount ?? 0}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1 text-xs font-mono">
                                                            <p className="text-[10px] text-white/40 uppercase">Σ deposits by currency</p>
                                                            {Object.entries(walletIntel.aggregates?.audit?.totalDepositsByCurrency || {}).map(([c, v]) => (
                                                                <div key={c} className="flex justify-between text-emerald-300/90">
                                                                    <span>{c}</span>
                                                                    <span>+{Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                                </div>
                                                            ))}
                                                            {Object.keys(walletIntel.aggregates?.audit?.totalDepositsByCurrency || {}).length === 0 && (
                                                                <span className="text-white/25">—</span>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1 text-xs font-mono">
                                                            <p className="text-[10px] text-white/40 uppercase">Σ withdrawals by currency</p>
                                                            {Object.entries(walletIntel.aggregates?.audit?.totalWithdrawalsByCurrency || {}).map(([c, v]) => (
                                                                <div key={c} className="flex justify-between text-rose-300/90">
                                                                    <span>{c}</span>
                                                                    <span>-{Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                                </div>
                                                            ))}
                                                            {Object.keys(walletIntel.aggregates?.audit?.totalWithdrawalsByCurrency || {}).length === 0 && (
                                                                <span className="text-white/25">—</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Betting performance</p>
                                                    {['real', 'demo', 'all'].map(mode => {
                                                        const b = walletIntel.aggregates?.betting?.[mode];
                                                        if (!b) return null;
                                                        return (
                                                            <div key={mode} className="border border-white/5 rounded-xl p-4 space-y-2">
                                                                <p className="text-[10px] font-black uppercase text-white/50">{mode === 'all' ? 'All bets' : mode === 'real' ? 'Real wallets only' : 'Demo wallets only'}</p>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                                                    <div><span className="text-white/35 text-[9px] uppercase block">Bets</span><span className="font-mono text-white">{b.totalBets}</span></div>
                                                                    <div><span className="text-white/35 text-[9px] uppercase block">Wins</span><span className="font-mono text-emerald-400">{b.wins}</span></div>
                                                                    <div><span className="text-white/35 text-[9px] uppercase block">Losses</span><span className="font-mono text-rose-400">{b.losses}</span></div>
                                                                    <div><span className="text-white/35 text-[9px] uppercase block">Win rate</span><span className="font-mono text-white">{(b.winRate * 100).toFixed(1)}%</span></div>
                                                                    <div><span className="text-white/35 text-[9px] uppercase block">Total wagered</span><span className="font-mono text-white">{b.totalWagered.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></div>
                                                                    <div><span className="text-white/35 text-[9px] uppercase block">Total payout</span><span className="font-mono text-white">{b.totalPayoutReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></div>
                                                                    <div><span className="text-white/35 text-[9px] uppercase block">User net (payout−wager)</span><span className={`font-mono ${b.netBettingPLUser >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{b.netBettingPLUser.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span></div>
                                                                </div>
                                                                {b.byNetwork && Object.keys(b.byNetwork).length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-white/5 text-[11px] font-mono space-y-1">
                                                                        <p className="text-[9px] uppercase text-white/30 mb-1">By network</p>
                                                                        {Object.entries(b.byNetwork).map(([net, row]: [string, any]) => (
                                                                            <div key={net} className="flex flex-wrap gap-x-4 justify-between text-white/70">
                                                                                <span className="text-white">{net}</span>
                                                                                <span>net {Number(row.net).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                                                                                <span className="text-white/40">{row.bets} bets · {row.wins}W/{row.losses}L</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Withdrawal requests</p>
                                                        <p className="text-xs text-white/50 mb-2">
                                                            Pending: {walletIntel.aggregates?.withdrawals?.pending?.length ?? 0} · Accepted: {walletIntel.aggregates?.withdrawals?.accepted?.length ?? 0} · Rejected: {walletIntel.aggregates?.withdrawals?.rejected?.length ?? 0}
                                                        </p>
                                                        <div className="text-xs font-mono space-y-1">
                                                            <p className="text-[10px] uppercase text-white/35">Pending amount by currency</p>
                                                            {Object.entries(walletIntel.aggregates?.withdrawals?.pendingTotalByCurrency || {}).map(([c, v]) => (
                                                                <div key={c} className="flex justify-between text-amber-200/90">
                                                                    <span>{c}</span>
                                                                    <span>{Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                                </div>
                                                            ))}
                                                            {Object.keys(walletIntel.aggregates?.withdrawals?.pendingTotalByCurrency || {}).length === 0 && (
                                                                <span className="text-white/25">No pending withdrawals</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Profile & referrals</p>
                                                        <p className="text-sm text-white/60">
                                                            Username:{' '}
                                                            <span className="text-white font-mono">{walletIntel.profile?.username || '—'}</span>
                                                        </p>
                                                        {walletIntel.referral && (
                                                            <p className="text-xs text-white/50 font-mono">
                                                                Code {walletIntel.referral.referral_code} · {walletIntel.referral.referral_count} referrals
                                                                {walletIntel.referral.referred_by ? ` · referred by ${walletIntel.referral.referred_by}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 overflow-x-auto">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Recent audit (latest 80)</p>
                                                    <table className="w-full text-left text-[11px] font-mono">
                                                        <thead>
                                                            <tr className="text-white/35 border-b border-white/10">
                                                                <th className="py-2 pr-4">Time</th>
                                                                <th className="py-2 pr-4">Type</th>
                                                                <th className="py-2 pr-4">CCY</th>
                                                                <th className="py-2 pr-4">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {walletIntel.recentAudit?.map((r: any) => (
                                                                <tr key={r.id} className="border-b border-white/5 text-white/70">
                                                                    <td className="py-2 pr-4 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                                                                    <td className="py-2 pr-4">{r.operation_type}</td>
                                                                    <td className="py-2 pr-4">{r.currency}</td>
                                                                    <td className="py-2 pr-4">{Number(r.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 overflow-x-auto">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Recent bets (latest 80)</p>
                                                    <table className="w-full text-left text-[11px] font-mono">
                                                        <thead>
                                                            <tr className="text-white/35 border-b border-white/10">
                                                                <th className="py-2 pr-4">Time</th>
                                                                <th className="py-2 pr-4">Asset</th>
                                                                <th className="py-2 pr-4">Net</th>
                                                                <th className="py-2 pr-4">Won</th>
                                                                <th className="py-2 pr-4">Network</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {walletIntel.recentBets?.map((r: any) => (
                                                                <tr key={r.id} className="border-b border-white/5 text-white/70">
                                                                    <td className="py-2 pr-4 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                                                                    <td className="py-2 pr-4">{r.asset}</td>
                                                                    <td className="py-2 pr-4">{(Number(r.payout) - Number(r.amount)).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                                                                    <td className="py-2 pr-4">{r.won ? 'yes' : 'no'}</td>
                                                                    <td className="py-2 pr-4">{r.network}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {activeTab === 'users' && (
                                    <Table key="users">
                                        <THead labels={['Identity', 'Protocol', 'Liquidity', 'Referral', 'Engagement', 'Value', 'Tier']} />
                                        <tbody>
                                            {loading ? <LoadingRow /> : users
                                                .filter(u => !searchTerm || u.user_address.toLowerCase().includes(searchTerm.toLowerCase()) || (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())))
                                                .map(u => (
                                                    <tr key={u.user_address + u.currency} className="hover:bg-white/[0.02] transition-colors group border-b border-white/5">
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-white text-sm font-bold">{u.username || 'Anonymous'}</span>
                                                                <span className="font-mono text-white/20 text-[10px]">{shortenAddress(u.user_address)}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6"><span className="text-[10px] font-black border border-white/10 rounded px-2 py-1 uppercase">{u.currency}</span></td>
                                                        <td className="px-8 py-6 text-white font-mono font-bold">{u.balance.toFixed(4)}</td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-white/60">{u.referral?.referral_code || '---'}</span>
                                                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">{u.referral?.referral_count || 0} REFS</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-white/40">{u.activity.totalBets} plays</td>
                                                        <td className="px-8 py-6 text-white font-mono font-black">
                                                            {u.activity.totalVolume.toLocaleString()}{' '}
                                                            <span className="text-[9px] font-bold text-white/30 uppercase">mixed native</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${u.activity.totalVolume > 500 ? 'bg-purple-500/10 text-purple-400' : u.activity.totalVolume > 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-white/20'}`}>
                                                                {u.activity.totalVolume > 500 ? 'VIP' : u.activity.totalVolume > 50 ? 'Standard' : 'Free'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>
                                )}

                                {activeTab === 'gameplay' && (
                                    <div key="gameplay" className="space-y-6">
                                        <div className="p-6 border-b border-white/5 flex flex-wrap gap-6 items-center bg-white/[0.01]">
                                            <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                                                <button
                                                    onClick={() => setGameplayFilter('all')}
                                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${gameplayFilter === 'all' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    All Modes
                                                </button>
                                                <button
                                                    onClick={() => setGameplayFilter('real')}
                                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${gameplayFilter === 'real' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    Real Wallet
                                                </button>
                                                <button
                                                    onClick={() => setGameplayFilter('demo')}
                                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${gameplayFilter === 'demo' ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'text-white/40 hover:text-white'}`}
                                                >
                                                    Demo Mode
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'BNB', value: 'BNB' },
                                                    { label: 'SOL', value: 'SOL' },
                                                    { label: 'SUI', value: 'SUI' },
                                                    { label: 'XLM', value: 'XLM' },
                                                    { label: 'XTZ', value: 'XTZ' },
                                                    { label: 'NEAR', value: 'NEAR' },
                                                    { label: 'STRK', value: 'STRK' },
                                                    // Push Chain bets are stored with `network = 'PC'`
                                                    { label: 'PUSH', value: 'PC' },
                                                ].map(({ label, value }) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => setChainFilter(prev => prev === value ? 'ALL' : value)}
                                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border transition-all ${chainFilter === value ? 'bg-white/10 border-white/30 text-white' : 'bg-transparent border-white/5 text-white/30 hover:border-white/20'}`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <Table>
                                            <THead labels={['Time', 'Asset', 'Direction', 'Wager (native)', 'Outcome (native)', 'Node', 'Account']} />
                                            <tbody>
                                                {loading ? <LoadingRow /> : gameHistory
                                                    .filter(b => {
                                                        const isDemo = b.id.toString().startsWith('demo-');
                                                        if (gameplayFilter === 'real' && isDemo) return false;
                                                        if (gameplayFilter === 'demo' && !isDemo) return false;
                                                        return true;
                                                    })
                                                    .filter(b => chainFilter === 'ALL' || b.id.toString().toUpperCase().includes(chainFilter) || (b as any).network === chainFilter)
                                                    .map(b => {
                                                        const isDemo = b.id.toString().startsWith('demo-');
                                                        const net = String((b as { network?: string }).network || 'BNB');
                                                        const tok = tokenSymbolForNetwork(net);
                                                        return (
                                                            <tr key={b.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                                                                <td className="px-8 py-6 text-[10px] font-mono">{new Date(b.created_at).toLocaleString()}</td>
                                                                <td className="px-8 py-6 font-black text-white">{b.asset}</td>
                                                                <td className="px-8 py-6">
                                                                    <span className={b.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}>{b.direction}</span>
                                                                </td>
                                                                <td className="px-8 py-6 text-white font-mono tabular-nums">
                                                                    {b.amount.toFixed(4)} <span className="text-[10px] text-white/35">{tok}</span>
                                                                </td>
                                                                <td className="px-8 py-6">
                                                                    <span className={b.won ? 'text-emerald-400 font-bold' : 'text-white/20'}>
                                                                        {b.won
                                                                            ? `+${b.payout.toFixed(4)} ${tok}`
                                                                            : `−${b.amount.toFixed(4)} ${tok}`}
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-6 font-mono text-[10px]">{shortenAddress(b.wallet_address)}</td>
                                                                <td className="px-8 py-6 text-right">
                                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isDemo ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                                        {isDemo ? 'Demo' : 'Real'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}

                                {activeTab === 'financial' && (
                                    <Table key="financial">
                                        <THead labels={['Time', 'Identity', 'Operation', 'Amount', 'Ref']} />
                                        <tbody>
                                            {loading ? <LoadingRow /> : (
                                                <>
                                                    {/* Pending withdrawals require manual acceptance */}
                                                    {pendingWithdrawals && pendingWithdrawals.length > 0 && pendingWithdrawals.map((w: any) => (
                                                        <tr key={w.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                                                            <td className="px-8 py-6 text-[10px] font-mono">
                                                                {w.requested_at ? new Date(w.requested_at).toLocaleString() : '---'}
                                                            </td>
                                                            <td className="px-8 py-6 font-mono text-xs">{shortenAddress(w.user_address)}</td>
                                                            <td className="px-8 py-6">
                                                                <span className="text-amber-300 bg-amber-300/10 px-2 py-0.5 rounded uppercase text-[9px] font-black">
                                                                    pending_withdrawal
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6 text-white font-mono font-bold">
                                                                -{Number(w.amount).toFixed(4)} {w.currency}
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <div className="flex gap-2 justify-end">
                                                                    <button
                                                                        onClick={() => acceptWithdrawalRequest(w.id)}
                                                                        className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded text-[9px] font-black uppercase hover:bg-emerald-500/20 transition-colors"
                                                                    >
                                                                        Accept
                                                                    </button>
                                                                    <button
                                                                        onClick={() => rejectWithdrawalRequest(w.id)}
                                                                        className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded text-[9px] font-black uppercase hover:bg-rose-500/20 transition-colors"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {/* Existing deposits/withdrawals audit log */}
                                                    {transactions.map(t => {
                                                        const explorerUrl = getExplorerUrl(t.currency, t.transaction_hash);
                                                        return (
                                                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                                                                <td className="px-8 py-6 text-[10px] font-mono">{new Date(t.created_at).toLocaleString()}</td>
                                                                <td className="px-8 py-6 font-mono text-xs">{shortenAddress(t.user_address)}</td>
                                                                <td className="px-8 py-6">
                                                                    <span className={t.operation_type === 'deposit' ? 'text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded uppercase text-[9px] font-black' : 'text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded uppercase text-[9px] font-black'}>
                                                                        {t.operation_type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-8 py-6 text-white font-mono font-bold">{t.operation_type === 'deposit' ? '+' : '-'}{t.amount.toFixed(4)} {t.currency}</td>
                                                                <td className="px-8 py-6 text-right">
                                                                    {explorerUrl ? (
                                                                        <a
                                                                            href={explorerUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="font-mono text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/30"
                                                                        >
                                                                            {t.transaction_hash.slice(0, 10)}...
                                                                        </a>
                                                                    ) : (
                                                                        <span className="font-mono text-[10px] text-white/20">{t.transaction_hash || 'INTERNAL'}</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </>
                                            )}
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

                                {activeTab === 'referrals' && (
                                    <Table key="referrals">
                                        <THead labels={['Identity', 'Personal Code', 'Referred By', 'Network Size', 'Status']} />
                                        <tbody>
                                            {loading ? <LoadingRow /> : users
                                                .filter(u => u.referral?.referral_code && u.referral.referral_code !== 'NONE')
                                                .sort((a, b) => (b.referral?.referral_count || 0) - (a.referral?.referral_count || 0))
                                                .map(u => (
                                                    <tr key={u.user_address} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                                                        <td className="px-8 py-6 font-mono text-white text-sm">{shortenAddress(u.user_address)}</td>
                                                        <td className="px-8 py-6 font-black text-white uppercase tracking-widest">{u.referral?.referral_code}</td>
                                                        <td className="px-8 py-6 text-white/40 font-mono text-xs">{u.referral?.referred_by ? shortenAddress(u.referral.referred_by) : 'DIRECT'}</td>
                                                        <td className="px-8 py-6">
                                                            <span className="text-xl font-black text-white">{u.referral?.referral_count || 0}</span>
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${(u.referral?.referral_count || 0) > 10 ? 'text-purple-400 bg-purple-400/10' : (u.referral?.referral_count || 0) > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-white/20 bg-white/5'}`}>
                                                                {(u.referral?.referral_count || 0) > 10 ? 'Ambassador' : (u.referral?.referral_count || 0) > 0 ? 'Pro' : 'Starter'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </Table>
                                )}

                                {activeTab === 'danger' && (
                                    <div key="danger" className="space-y-10">
                                    <div className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-[2rem] space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400/80">Global wallet ban list</p>
                                        <p className="text-[11px] text-white/40 leading-relaxed max-w-2xl">
                                            Blocks deposits, bets, payouts, and withdrawals for an address across every currency. EVM addresses are matched case-insensitively; Solana and other non-EVM addresses must match exactly.
                                        </p>
                                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Wallet address</label>
                                                <input
                                                    value={banAddressInput}
                                                    onChange={e => setBanAddressInput(e.target.value)}
                                                    placeholder="0x… or Solana base58…"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-mono placeholder:text-white/20"
                                                />
                                            </div>
                                            <div className="flex-[2] space-y-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30">Reason (optional)</label>
                                                <input
                                                    value={banReasonInput}
                                                    onChange={e => setBanReasonInput(e.target.value)}
                                                    placeholder="e.g. manipulation / abuse"
                                                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-white/20"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addGlobalBan}
                                                className="px-6 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-black uppercase text-[10px] tracking-widest rounded-xl transition-all"
                                            >
                                                Ban wallet
                                            </button>
                                        </div>
                                        <Table>
                                            <THead labels={['Address', 'Reason', 'Added', '']} />
                                            <tbody>
                                                {loading ? (
                                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest animate-pulse text-white/20">Loading…</td></tr>
                                                ) : bannedWallets.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest text-white/15">
                                                            No global bans yet
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    bannedWallets.map(b => (
                                                        <tr key={b.wallet_address} className="border-b border-white/5">
                                                            <td className="px-4 py-4 font-mono text-xs text-white break-all">{b.wallet_address}</td>
                                                            <td className="px-4 py-4 text-white/50 text-xs max-w-xs">{b.reason || '—'}</td>
                                                            <td className="px-4 py-4 text-white/30 text-[10px] font-mono whitespace-nowrap">
                                                                {new Date(b.created_at).toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeGlobalBan(b.wallet_address)}
                                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] font-bold text-white/70 uppercase"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </Table>
                                    </div>

                                    <Table key="danger-table">
                                        <THead labels={['Node Identity', 'Max Streak', 'Pattern', 'Current Status', 'Operations']} />
                                        <tbody>
                                            {loading ? <LoadingRow /> : suspiciousUsers.map(u => (
                                                <tr key={u.user_address} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0">
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-white text-sm">{shortenAddress(u.user_address)}</span>
                                                            <span className="text-[10px] text-white/20">Balance: {parseFloat(u.balance).toFixed(4)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-rose-500 font-black text-xl tracking-tighter">{u.maxStreak} wins</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex gap-1">
                                                            {u.latestBets.map((won: boolean, i: number) => (
                                                                <div key={i} className={`w-1.5 h-4 rounded-full ${won ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500/20'}`} />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${u.status === 'banned' ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' :
                                                            u.status === 'frozen' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                                                                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                            }`}>
                                                            {u.status || 'active'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {u.status !== 'frozen' && u.status !== 'banned' && (
                                                                <button
                                                                    onClick={() => updateUserStatus(u.user_address, 'frozen')}
                                                                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-[9px] font-bold text-amber-500 uppercase transition-all"
                                                                >
                                                                    Freeze
                                                                </button>
                                                            )}
                                                            {u.status !== 'banned' && (
                                                                <button
                                                                    onClick={() => updateUserStatus(u.user_address, 'banned')}
                                                                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded text-[9px] font-bold text-rose-500 uppercase transition-all"
                                                                >
                                                                    Ban
                                                                </button>
                                                            )}
                                                            {(u.status === 'frozen' || u.status === 'banned') && (
                                                                <button
                                                                    onClick={() => updateUserStatus(u.user_address, 'active')}
                                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] font-bold text-white uppercase transition-all"
                                                                >
                                                                    Reactivate
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {suspiciousUsers.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-32 text-center text-[10px] font-black uppercase tracking-widest text-white/10"> No suspicious activity detected in core neural layers.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                    </div>
                                )}

                                {activeTab === 'waitlist' && (
                                    <Table key="waitlist">
                                        <THead labels={['Position', 'Email Instance', 'Timestamp', 'Status']} />
                                        <tbody>
                                            {loading ? (
                                                <LoadingRow />
                                            ) : waitlist.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-8 py-32 text-center text-[10px] font-black uppercase tracking-widest text-white/10">
                                                        {waitlistError ? waitlistError : 'No waitlist emails yet.'}
                                                    </td>
                                                </tr>
                                            ) : waitlist.map((w, i) => (
                                                <tr key={w.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                                                    <td className="px-8 py-6 font-mono text-white/20 text-[10px]">#{waitlist.length - i}</td>
                                                    <td className="px-8 py-6 font-bold text-white tracking-tight">{w.email}</td>
                                                    <td className="px-8 py-6 text-white/40 text-[10px] uppercase font-mono">{new Date(w.created_at).toLocaleString()}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-black uppercase text-white/40">Registered</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}

                                {activeTab === 'access_codes' && (
                                    <div key="access_codes">
                                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Code Generator</p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={exportAccessCodes}
                                                    className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black uppercase text-[9px] tracking-widest rounded-lg hover:bg-blue-500/20 transition-all"
                                                >
                                                    Export to Google Sheets (CSV)
                                                </button>
                                                <button
                                                    onClick={() => generateAccessCodes(5)}
                                                    className="px-4 py-2 bg-white text-black font-black uppercase text-[9px] tracking-widest rounded-lg hover:bg-gray-200 transition-all"
                                                >
                                                    Generate 5 Codes
                                                </button>
                                            </div>
                                        </div>
                                        <Table>
                                            <THead labels={['Access Code', 'Status', 'Wallet Link', 'Authorized At']} />
                                            <tbody>
                                                {loading ? <LoadingRow /> : accessCodes.map(c => (
                                                    <tr key={c.code} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                                                        <td className="px-8 py-6 font-mono font-black text-white text-lg tracking-widest uppercase">{c.code}</td>
                                                        <td className="px-8 py-6">
                                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${c.is_used ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                                                                {c.is_used ? 'Consumed' : 'Ready'}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 font-mono text-[10px] text-white/40">
                                                            {c.wallet_address ? shortenAddress(c.wallet_address) : 'UNLINKED'}
                                                        </td>
                                                        <td className="px-8 py-6 text-right text-white/20 text-[10px] font-mono">
                                                            {c.used_at ? new Date(c.used_at).toLocaleString() : '---'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
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
