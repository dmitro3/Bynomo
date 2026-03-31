/**
 * POST /api/balance/deposit endpoint
 * 
 * Task: 7.2 Update deposit endpoint for Sui
 * Requirements: 2.4
 * 
 * Called by blockchain event listener after deposit transaction.
 * Updates Supabase balance by adding deposit amount.
 * Inserts audit log entry with operation_type='deposit'.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';
import { ethers } from 'ethers';
import { getBNBConfig } from '@/lib/bnb/config';
import { getPushConfig } from '@/lib/push/config';
import { getSomniaConfig } from '@/lib/somnia/config';
import { getZGConfig } from '@/lib/zg/config';
import { calculateFeeAmount, collectPlatformFeeFromTreasury, getFeePercentLabel } from '@/lib/fees/platformFee';
import { isWalletGloballyBanned } from '@/lib/bans/walletBan';

interface DepositRequest {
  userAddress: string;
  amount: number;
  txHash: string;
  currency: string;
  userTier?: 'free' | 'standard' | 'vip';
}

async function verifyEvmDepositTx(
  txHash: string,
  userAddress: string,
  amount: number,
  currency: string
): Promise<boolean> {
  let rpc = '';
  let treasury = '';
  if (currency === 'BNB') {
    const cfg = getBNBConfig();
    rpc = cfg.rpcEndpoint;
    treasury = cfg.treasuryAddress;
  } else if (currency === 'PC' || currency === 'PUSH') {
    const cfg = getPushConfig();
    rpc = cfg.rpcEndpoint;
    treasury = cfg.treasuryAddress;
  } else if (currency === 'STT' || currency === 'SOMNIA') {
    const cfg = getSomniaConfig();
    rpc = cfg.rpcUrls[0];
    treasury = String(cfg.treasuryAddress || '');
  } else if (currency === '0G') {
    const cfg = getZGConfig();
    rpc = cfg.rpcUrls[0];
    treasury = String(cfg.treasuryAddress || '');
  } else {
    return true;
  }

  if (!rpc || !treasury) return false;

  const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('RPC timeout')), ms))]);

  try {
    const provider = new ethers.JsonRpcProvider(rpc);
    const [tx, receipt] = await Promise.all([
      withTimeout(provider.getTransaction(txHash), 12_000),
      withTimeout(provider.getTransactionReceipt(txHash), 12_000),
    ]);
    if (!tx || !receipt || receipt.status !== 1) return false;

    if (!tx.from || tx.from.toLowerCase() !== userAddress.toLowerCase()) {
      // Privy/relayed BNB deposits can have a relayer "from" address.
      // Keep strict sender checks for PUSH/SOMNIA, but allow BNB if treasury/value checks pass.
      if (currency !== 'BNB') return false;
      console.warn('[verifyEvmDepositTx] BNB sender mismatch; accepting based on treasury/value checks', {
        userAddress,
        txFrom: tx.from,
        txHash,
      });
    }
    if (!tx.to || tx.to.toLowerCase() !== treasury.toLowerCase()) return false;

    const minWei = ethers.parseEther(amount.toString());
    return tx.value >= minWei;
  } catch (err) {
    console.error('[verifyEvmDepositTx] RPC error:', err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: DepositRequest = await request.json();
    const { userAddress, amount, txHash, currency = 'BNB', userTier = 'free' } = body;

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount, txHash' },
        { status: 400 }
      );
    }

    // Validate address (support BNB, Solana, Sui, Starknet, Stellar and Tezos)
    let isValid = false;

    // Check if it's a valid EVM address
    if (ethers.isAddress(userAddress)) {
      isValid = true;
    } else if (/^0x[0-9a-fA-F]{64}$/.test(userAddress)) {
      // Check if it's a valid Sui address
      isValid = true;
    } else if (/^0x[0-9a-fA-F]{1,64}$/.test(userAddress)) {
      // Check if it's a valid Starknet address
      isValid = true;
    } else if (/^(tz1|tz2|tz3|KT1)[a-zA-Z0-9]{33}$/.test(userAddress)) {
      // Check if it's a valid Tezos address
      isValid = true;
    } else if (/^init1[a-z0-9]{38}$/.test(userAddress)) {
      // Check if it's a valid Initia bech32 address
      isValid = true;
    } else {
      // Check if it's a valid Solana address
      try {
        const { PublicKey } = await import('@solana/web3.js');
        const pk = new PublicKey(userAddress);
        isValid = pk.toBuffer().length === 32;
      } catch (e) {
        // Check if it's a valid Stellar address (starts with G, 56 characters)
        if (/^G[A-Z2-7]{55}$/.test(userAddress)) {
          isValid = true;
        } else if (/^(([a-z\d]+[-_])*[a-z\d]+\.)+[a-z\d]+\.(near|testnet)$/.test(userAddress)) {
          // Check if it's a valid NEAR address (named account ending in .near/.testnet)
          isValid = true;
        } else {
          isValid = false;
        }
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid wallet address format (BNB, Solana, Sui, Starknet, Stellar, Tezos or NEAR required)' },
        { status: 400 }
      );
    }

    if (await isWalletGloballyBanned(userAddress)) {
      return NextResponse.json(
        { error: 'This wallet is banned from the platform.' },
        { status: 403 }
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Deposit amount must be greater than zero' },
        { status: 400 }
      );
    }

    // For EVM-like chains, verify tx sender/recipient/value on-chain before crediting.
    const normalizedCurrency = currency.toUpperCase();
    const feeAmount = calculateFeeAmount(amount, userTier);
    const netDepositAmount = amount - feeAmount;
    const feePercentLabel = getFeePercentLabel(userTier);

    if (netDepositAmount <= 0) {
      return NextResponse.json(
        { error: `Deposit amount after ${feePercentLabel} fee must be greater than zero` },
        { status: 400 }
      );
    }

    const isEvmLike =
      normalizedCurrency === 'BNB' ||
      normalizedCurrency === 'PUSH' ||
      normalizedCurrency === 'PC' ||
      normalizedCurrency === 'SOMNIA' ||
      normalizedCurrency === 'STT' ||
      normalizedCurrency === '0G';
    if (isEvmLike) {
      const isValidTx = await verifyEvmDepositTx(txHash, userAddress, amount, normalizedCurrency);
      if (!isValidTx) {
        return NextResponse.json(
          { error: 'Deposit transaction could not be verified on-chain' },
          { status: 400 }
        );
      }
    }

    // Initia deposit verification
    if (normalizedCurrency === 'INIT') {
      try {
        const { verifyInitiaDepositTx } = await import('@/lib/initia/backend-client');
        const verified = await verifyInitiaDepositTx(txHash);
        if (!verified.confirmed || verified.amountINIT < amount * 0.99) {
          return NextResponse.json(
            { error: 'Initia deposit transaction could not be verified on-chain' },
            { status: 400 }
          );
        }
      } catch (verifyErr) {
        console.error('[deposit] Initia verification failed:', verifyErr);
        return NextResponse.json(
          { error: 'Failed to verify Initia transaction' },
          { status: 400 }
        );
      }
    }

    // Tiered platform/protocol fee: move the fee portion from treasury to a dedicated collector wallet.
    // A failure here must NOT block the user's deposit — log the error and continue.
    let feeTxHash: string | null = null;
    try {
      feeTxHash = await collectPlatformFeeFromTreasury(normalizedCurrency, feeAmount);
    } catch (feeErr) {
      console.error('[deposit] Fee collection failed (non-blocking):', feeErr);
    }
    const combinedTxHash = feeTxHash ? `${txHash}|feeTx:${feeTxHash}` : txHash;

    // Call update_balance_for_deposit stored procedure
    const { data, error } = await supabase.rpc('update_balance_for_deposit', {
      p_user_address: userAddress,
      p_deposit_amount: netDepositAmount,
      p_currency: normalizedCurrency,
      p_transaction_hash: combinedTxHash,
    });

    // Handle database errors
    if (error) {
      console.error('Database error in deposit:', error);
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }

    // Parse the JSON result from the stored procedure
    const result = data as { success: boolean; error: string | null; new_balance: number };

    // Check if the procedure reported an error
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Deposit failed' },
        { status: 400 }
      );
    }

    // Return success with new balance
    return NextResponse.json({
      success: true,
      newBalance: parseFloat(result.new_balance.toString()),
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error in POST /api/balance/deposit:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
