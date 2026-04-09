'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOverflowStore } from '@/lib/store';
import { useToast } from '@/lib/hooks/useToast';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useWalletClient, useAccount } from 'wagmi';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';

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

  const { address, withdrawFunds, houseBalance, network, refreshWalletBalance, isConnected } = useOverflowStore();
  const toast = useToast();
  const { wallets } = useWallets();
  const { authenticated } = usePrivy();
  const { data: walletClient } = useWalletClient();
  const { connector } = useAccount();

  // Aptos Hook
  const { signMessage: signAptosMessage, connected: isAptosConnected } = useAptosWallet();

  const selectedCurrency = useOverflowStore(state => state.selectedCurrency);
  const setSelectedCurrency = useOverflowStore(state => state.setSelectedCurrency);
  const suiToken = network === 'SUI' ? (selectedCurrency === 'USDC' ? 'USDC' : 'SUI') : null;
  const userTier = useOverflowStore(state => state.userTier);
  const feePercent = userTier === 'vip' ? 0.08 : userTier === 'standard' ? 0.09 : 0.10;
  const feeLabel = `${Math.round(feePercent * 100)}%`;
  const currencySymbol =
    network === 'SUI' ? (suiToken ?? 'SUI') :
      network === 'SOL' ? (selectedCurrency || 'SOL') :
        network === 'APT' ? 'APT' :
          network === 'XLM' ? 'XLM' :
            network === 'XTZ' ? 'XTZ' :
              network === 'NEAR' ? 'NEAR' :
                network === 'STRK' ? 'STRK' :
                  network === 'PUSH' ? 'PC' :
                    network === 'SOMNIA' ? 'STT' :
                      network === 'OCT' ? 'OCT' :
                        network === 'ZG' ? '0G' :
                          network === 'INIT' ? 'INIT' :
                            'BNB';

  const networkName =
    network === 'SUI' ? 'Sui Network' :
      network === 'SOL' ? 'Solana' :
        network === 'APT' ? 'Aptos Mainnet' :
          network === 'XLM' ? 'Stellar' :
            network === 'XTZ' ? 'Tezos' :
              network === 'NEAR' ? 'NEAR Protocol' :
                network === 'STRK' ? 'Starknet Mainnet' :
                  network === 'PUSH' ? 'Push Chain' :
                    network === 'SOMNIA' ? 'Somnia Testnet' :
                      network === 'OCT' ? 'OneChain' :
                        network === 'ZG' ? '0G Mainnet' :
                          network === 'INIT' ? 'Initia Mainnet' :
                            'BNB Chain';

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

    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const withdrawAmount = parseFloat(amount);
      toast.info('Processing withdrawal...');

      let signature: string | undefined;
      let signedAt: number | undefined;
      const isEvmLike = network === 'BNB' || network === 'PUSH' || network === 'SOMNIA' || network === 'ZG';

      if (isEvmLike) {
        signedAt = Date.now();
        const message = `BYNOMO withdrawal authorization\naddress:${address}\namount:${withdrawAmount.toFixed(8)}\ncurrency:${currencySymbol}\nsignedAt:${signedAt}`;

        if (walletClient) {
          // MetaMask / any wagmi-connected wallet (works for BNB, PUSH, SOMNIA, ZG)
          signature = await walletClient.signMessage({ account: address as `0x${string}`, message });
        } else if (connector && network === 'ZG') {
          // Fallback: use wagmi connector provider for 0G signing
          const connectorProvider = await connector.getProvider() as any;
          const ethersModule = await import('ethers');
          const signer = await new ethersModule.ethers.BrowserProvider(connectorProvider).getSigner();
          signature = await signer.signMessage(message);
        } else if (authenticated) {
          // Privy embedded wallet fallback (BNB only)
          const wallet = wallets.find((w) => w.address.toLowerCase() === address.toLowerCase());
          if (!wallet) throw new Error('Wallet not found for signing');
          const provider = await wallet.getEthereumProvider();
          const ethersModule = await import('ethers');
          const signer = await new ethersModule.ethers.BrowserProvider(provider).getSigner();
          signature = await signer.signMessage(message);
        } else {
          throw new Error('Unable to sign withdrawal authorization message for this wallet');
        }
      } else if (network === 'APT') {
        if (!isAptosConnected) throw new Error('Aptos wallet not connected');
        signedAt = Date.now();
        const message = `BYNOMO withdrawal authorization\naddress:${address}\namount:${withdrawAmount.toFixed(8)}\ncurrency:APT\nsignedAt:${signedAt}`;
        
        toast.info('Please sign the withdrawal authorization message in your Aptos wallet...');
        
        const response = await signAptosMessage({
          message: message,
          nonce: signedAt.toString(),
        });
        
        signature = (response as any).signature;
      }

      // Call the withdrawal store action (which calls the backend)
      const result = await withdrawFunds(address, withdrawAmount, { signature, signedAt });

      // Refresh balances
      refreshWalletBalance();

      const txHash = (result && (result as any).txHash) ? String((result as any).txHash) : 'PENDING';
      const status = result && (result as any).status;
      const frequencyReview = result && (result as any).frequencyReview;

      if (status === 'pending') {
        if (frequencyReview) {
          toast.success('Your withdrawal request has been submitted for manual review due to high withdrawal frequency. An admin will process it shortly.');
        } else {
          toast.success('Withdrawal request submitted. Awaiting manual approval.');
        }
        if (onSuccess) onSuccess(withdrawAmount, txHash);
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Withdrawal successful:', txHash);
        }
        toast.success(
          `Successfully withdrew ${withdrawAmount.toFixed(4)} ${currencySymbol}! Balance updated.`
        );
        if (onSuccess) onSuccess(withdrawAmount, txHash);
      }
      onClose();
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Withdrawal error:', err);
      }
      const errorMessage = err.message || 'Failed to withdraw funds';
      setError(errorMessage);
      toast.error(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Withdraw ${currencySymbol}`}
      showCloseButton={!isLoading}
    >
      <div className="space-y-4">
        {/* SUI token selector */}
        {network === 'SUI' && (
          <div className="flex gap-2">
            {(['SUI', 'USDC'] as const).map(tok => (
              <button
                key={tok}
                onClick={() => { setSelectedCurrency(tok); setAmount(''); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-black uppercase tracking-widest transition-colors ${
                  suiToken === tok
                    ? 'border-[#FF006E]/60 bg-[#FF006E]/10 text-[#FF006E]'
                    : 'border-white/10 bg-white/[0.03] text-white/30 hover:text-white/60'
                }`}
              >
                <img
                  src={tok === 'SUI' ? '/sui-logo.png' : '/logos/usdc-logo.png'}
                  alt={tok}
                  className="w-4 h-4 rounded-full"
                />
                {tok}
              </button>
            ))}
          </div>
        )}

        <div className="bg-gradient-to-br from-[#FF006E]/10 to-purple-500/10 border border-[#FF006E]/30 rounded-lg p-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#FF006E]/20 text-[#FF006E] text-[8px] font-bold uppercase tracking-tighter rounded-bl-lg">
            {networkName}
          </div>
          <p className="text-gray-400 text-[10px] uppercase tracking-wider mb-1 font-mono">
            Available to Withdraw
          </p>
          <p className="text-[#FF006E] text-xl font-bold font-mono flex items-center gap-2">
            {network === 'SUI' && suiToken === 'USDC' && <img src="/logos/usdc-logo.png" alt="USDC" className="w-5 h-5" />}
            {network === 'SUI' && suiToken === 'SUI' && <img src="/sui-logo.png" alt="SUI" className="w-5 h-5 rounded-full" />}
            {network === 'XTZ' && <img src="/logos/tezos-xtz-logo.png" alt="XTZ" className="w-5 h-5" />}
            {network === 'BNB' && <img src="/logos/bnb-bnb-logo.png" alt="BNB" className="w-5 h-5" />}
            {network === 'SOMNIA' && <img src="/logos/somnia.jpg" alt="SOMNIA" className="w-5 h-5" />}
            {network === 'ZG' && <img src="/logos/0g.png" alt="0G" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).src = '/logos/ethereum-eth-logo.png'; }} />}
            {currencySymbol === 'BYNOMO' ? <img src="/overflowlogo.png" alt="BYNOMO" className="w-5 h-5" /> : (network === 'SOL' && <img src="/logos/solana-sol-logo.png" alt="SOL" className="w-5 h-5" />)}
            {network === 'XLM' && <img src="/logos/stellar-xlm-logo.png" alt="XLM" className="w-5 h-5" />}
            {network === 'NEAR' && <img src="/logos/near.png" alt="NEAR" className="w-5 h-5" />}
            {network === 'STRK' && <img src="/logos/starknet-strk-logo.svg" alt="STRK" className="w-5 h-5" />}
            {network === 'PUSH' && <img src="/logos/push-logo.png" alt="PC" className="w-5 h-5" />}
            {network === 'OCT' && <img src="/logos/onechain.png" alt="OCT" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            {network === 'INIT' && <img src="/logos/initia.png" alt="INIT" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            {network === 'APT' && <img src="/logos/aptos-logo.png" alt="APT" className="w-5 h-5" onError={(e) => { (e.target as HTMLImageElement).src = 'https://cryptologos.cc/logos/aptos-apt-logo.png'; }} />}
            {houseBalance.toFixed(4)} {currencySymbol}
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
              {currencySymbol}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={handleMaxClick}
              disabled={isLoading || houseBalance === 0}
              className="text-[10px] text-[#FF006E] hover:text-[#FF006E]/80 font-mono disabled:opacity-50 transition-colors uppercase tracking-wider"
            >
              Withdraw All
            </button>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-mono">
                Admin Fee: <span className="text-red-400">{feeLabel}</span>
              </p>
              {amount && !isNaN(parseFloat(amount)) && (
                <p className="text-[10px] text-gray-400 font-mono">
                  You Receive: <span className="text-green-400">{(parseFloat(amount) * (1 - feePercent)).toFixed(4)} {currencySymbol}</span>
                </p>
              )}
            </div>
          </div>
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
              `Withdraw ${currencySymbol}`
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
