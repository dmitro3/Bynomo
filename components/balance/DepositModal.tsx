import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useSendTransaction, useConfig } from 'wagmi';
import { ethers } from 'ethers';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOverflowStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';
import { getBNBConfig } from '@/lib/bnb/config';
import { getAddress } from 'viem';
import { useWallet } from '@solana/wallet-adapter-react';


interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, txHash: string) => void;
  onError?: (error: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [amount, setAmount] = useState<string>('');
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: balanceData, refetch } = useBalance({
    address: address,
  });

  const { depositFunds, network, walletBalance, refreshWalletBalance } = useOverflowStore();
  const toast = useToast();
  const { sendTransactionAsync } = useSendTransaction();

  // Solana hooks
  const { publicKey: solanaPublicKey, sendTransaction } = useWallet();

  const activeWalletBalance = walletBalance;
  const currencySymbol = network === 'SOL' ? 'SOL' : 'BNB';

  // Quick select amounts
  const quickAmounts = [0.1, 0.5, 1, 5];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const validateAmount = (value: string): string | null => {
    if (!value || value.trim() === '') {
      return 'Please enter an amount';
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }

    if (numValue <= 0) {
      return 'Amount must be greater than zero';
    }

    if (numValue > activeWalletBalance) {
      return `Insufficient ${currencySymbol} balance`;
    }

    return null;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError(null);
    }
  };

  const handleQuickSelect = (value: number) => {
    setAmount(value.toString());
    setError(null);
  };

  const handleMaxClick = () => {
    if (activeWalletBalance > 0) {
      // Leave a small amount for gas
      const gasBuffer = network === 'SOL' ? 0.001 : 0.005;
      const maxAmount = Math.max(0, activeWalletBalance - gasBuffer);
      setAmount(maxAmount.toFixed(4));
      setError(null);
    }
  };

  const handleDeposit = async () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (network === 'BNB' && (!address || !isConnected)) {
      setError('Please connect your BNB wallet');
      return;
    }

    if (network === 'SOL' && !solanaPublicKey) {
      setError('Please connect your Solana wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const depositAmount = parseFloat(amount);
      let tx: string;

      if (network === 'SOL') {
        const { buildDepositTransaction, getSolanaConnection } = await import('@/lib/solana/client');
        const connection = getSolanaConnection();
        const transaction = await buildDepositTransaction(depositAmount, solanaPublicKey!.toBase58());

        toast.info('Please confirm the transaction in your Solana wallet...');
        tx = await sendTransaction(transaction, connection);
      } else {
        const config = getBNBConfig();
        if (!config.treasuryAddress) {
          throw new Error('Treasury address not configured');
        }

        toast.info('Please confirm the transaction in your wallet...');
        tx = await sendTransactionAsync({
          to: getAddress(config.treasuryAddress),
          value: ethers.parseEther(depositAmount.toString()),
        });
      }

      toast.info('Transaction submitted. Waiting for confirmation...');

      // Update balance in database
      const userAddr = network === 'SOL' ? solanaPublicKey!.toBase58() : address!;
      await depositFunds(userAddr, depositAmount, tx);

      // Instant Balance Refetch (Both House and Wallet)
      refreshWalletBalance();

      toast.success(
        `Successfully deposited ${depositAmount.toFixed(4)} ${currencySymbol}! Balance updated.`
      );

      if (onSuccess) {
        onSuccess(depositAmount, tx);
      }

      onClose();
    } catch (err) {
      console.error('Deposit error:', err);
      let errorMessage = 'Failed to deposit funds';
      if (err instanceof Error) {
        const msg = err.message || "";
        if (msg.includes('rejected') || msg.includes('denied') || msg.includes('User rejected')) {
          errorMessage = 'User rejected transaction';
        } else {
          errorMessage = msg;
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Deposit ${currencySymbol}`}
      showCloseButton={!isLoading}
    >
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-[#00f5ff]/10 to-purple-500/10 border border-[#00f5ff]/30 rounded-lg p-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#00f5ff]/20 text-[#00f5ff] text-[8px] font-bold uppercase tracking-tighter rounded-bl-lg">
            {network === 'SOL'
              ? (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta')
              : (process.env.NEXT_PUBLIC_BNB_NETWORK || 'mainnet')
            }
          </div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-mono">
            Wallet Balance
          </p>
          <p className="text-[#00f5ff] text-xl font-bold font-mono">
            {activeWalletBalance.toFixed(4)} {currencySymbol}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="deposit-amount" className="text-gray-400 text-xs font-mono uppercase">Amount to Deposit</label>
          <div className="relative">
            <input
              id="deposit-amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              disabled={isLoading}
              className={`
                w-full px-4 py-3 bg-black/50 border rounded-lg text-lg
                text-white font-mono
                focus:outline-none focus:ring-1 focus:ring-[#00f5ff]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? 'border-red-500' : 'border-[#00f5ff]/30'}
              `}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
              {currencySymbol}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handleMaxClick}
              disabled={isLoading}
              className="text-[10px] text-[#00f5ff] hover:text-cyan-400 font-mono disabled:opacity-50 transition-colors uppercase tracking-wider"
            >
              Use Max (minus gas)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {quickAmounts.map((quickAmount) => (
            <button
              key={quickAmount}
              onClick={() => handleQuickSelect(quickAmount)}
              disabled={isLoading}
              className={`
                px-2 py-2 rounded border font-mono text-xs
                transition-all duration-200
                ${amount === quickAmount.toString()
                  ? 'bg-[#00f5ff]/20 border-[#00f5ff] text-[#00f5ff] shadow-[0_0_10px_rgba(0,245,255,0.3)]'
                  : 'bg-black/30 border-[#00f5ff]/30 text-gray-300 hover:border-[#00f5ff] hover:text-[#00f5ff]'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {quickAmount}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg px-3 py-2">
            <p className="text-red-400 text-xs font-mono">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            variant="primary"
            className="flex-1"
            disabled={isLoading || !amount || parseFloat(amount || '0') <= 0}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Processing</span>
              </span>
            ) : (
              `Deposit ${currencySymbol}`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
