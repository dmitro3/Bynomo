import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOverflowStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number, txHash: string) => void;
  onError?: (error: string) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { address, withdrawFunds, houseBalance, fetchBalance } = useOverflowStore();
  const toast = useToast();

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

    if (numValue > houseBalance) {
      return 'Insufficient house balance';
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

  const handleMaxClick = () => {
    if (houseBalance > 0) {
      setAmount(houseBalance.toString());
      setError(null);
    }
  };

  const handleWithdraw = async () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const withdrawAmount = parseFloat(amount);

      toast.info('Processing withdrawal...');

      // Call the withdrawal API
      // The backend will handle the Solana transfer from the treasury wallet
      const response = await fetch('/api/balance/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          amount: withdrawAmount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process withdrawal');
      }

      console.log('Withdrawal successful:', result.txHash);

      // Update local state
      await fetchBalance(address);

      toast.success(
        `Successfully withdrew ${withdrawAmount.toFixed(4)} BNB! Balance updated.`
      );

      if (onSuccess) {
        onSuccess(withdrawAmount, result.txHash);
      }

      onClose();
    } catch (err) {
      console.error('Withdrawal error:', err);
      let errorMessage = 'Failed to withdraw funds';
      if (err instanceof Error) {
        errorMessage = err.message;
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
      title="Withdraw BNB"
      showCloseButton={!isLoading}
    >
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-[#FF006E]/10 to-purple-500/10 border border-[#FF006E]/30 rounded-lg p-3">
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-mono">
            Available to Withdraw
          </p>
          <p className="text-[#FF006E] text-xl font-bold font-mono">
            {houseBalance.toFixed(4)} BNB
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="withdraw-amount" className="text-gray-400 text-xs font-mono uppercase">Amount to Withdraw</label>
          <div className="relative">
            <input
              id="withdraw-amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              disabled={isLoading}
              className={`
                w-full px-4 py-3 bg-black/50 border rounded-lg text-lg
                text-white font-mono
                focus:outline-none focus:ring-1 focus:ring-[#FF006E]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? 'border-red-500' : 'border-[#FF006E]/30'}
              `}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
              BNB
            </span>
          </div>

          <button
            onClick={handleMaxClick}
            disabled={isLoading || houseBalance === 0}
            className="text-[10px] text-[#FF006E] hover:text-[#FF006E]/80 font-mono disabled:opacity-50 transition-colors uppercase tracking-wider"
          >
            Withdraw All
          </button>
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
            onClick={handleWithdraw}
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
              'Withdraw BNB'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
