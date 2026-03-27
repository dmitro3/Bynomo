import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { transferBNBFromTreasury } from '@/lib/bnb/backend-client';
import { transferSOMNIAFromTreasury } from '@/lib/somnia/backend-client';
import { transferOCTFromTreasury } from '@/lib/onechain/backend-client';
import { transferZGFromTreasury } from '@/lib/zg/backend-client';
import { transferINITFromTreasury } from '@/lib/initia/backend-client';
import { ethers } from 'ethers';
import { calculateFeeAmount, collectPlatformFeeFromTreasury, getFeePercentLabel } from '@/lib/fees/platformFee';

interface WithdrawRequest {
  userAddress: string;
  amount: number;
  currency: string;
  userTier?: 'free' | 'standard' | 'vip';
  signature?: string;
  signedAt?: number;
  accountType?: 'real' | 'demo';
}

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const {
      userAddress,
      amount,
      currency = 'BNB',
      userTier = 'free',
      signature: authorizationSignature,
      signedAt,
      accountType,
    } = body;
    const normalizedCurrency = currency.toUpperCase();

    // Validate required fields
    if (!userAddress || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount' },
        { status: 400 }
      );
    }

    // Validate address using utility
    const { isValidAddress } = await import('@/lib/utils/address');
    if (!(await isValidAddress(userAddress))) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Withdrawal amount must be greater than zero' },
        { status: 400 }
      );
    }

    // Require signed withdrawal intent for EVM-like chains.
    const requiresIntentSignature =
      normalizedCurrency === 'BNB' ||
      normalizedCurrency === 'PUSH' ||
      normalizedCurrency === 'PC' ||
      normalizedCurrency === 'SOMNIA' ||
      normalizedCurrency === 'STT' ||
      normalizedCurrency === '0G';

    if (requiresIntentSignature) {
      if (!authorizationSignature || !signedAt) {
        return NextResponse.json(
          { error: 'Missing signed withdrawal authorization' },
          { status: 401 }
        );
      }

      const ageMs = Date.now() - Number(signedAt);
      if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 5 * 60 * 1000) {
        return NextResponse.json(
          { error: 'Withdrawal authorization expired. Please sign again.' },
          { status: 401 }
        );
      }

      const displayCurrency =
        normalizedCurrency === 'PC' ? 'PC' :
        normalizedCurrency === 'STT' ? 'STT' :
        normalizedCurrency === '0G' ? '0G' :
        normalizedCurrency;
      const expectedMessage = `BYNOMO withdrawal authorization\naddress:${userAddress}\namount:${amount.toFixed(8)}\ncurrency:${displayCurrency}\nsignedAt:${signedAt}`;
      const recovered = ethers.verifyMessage(expectedMessage, authorizationSignature);
      if (recovered.toLowerCase() !== userAddress.toLowerCase()) {
        return NextResponse.json(
          { error: 'Invalid withdrawal signature' },
          { status: 401 }
        );
      }
    }

    // 1. Get house balance and status from Supabase and validate
    const { data: userData, error: userError } = await supabase
      .from('user_balances')
      .select('balance, status')
      .eq('user_address', userAddress)
      .eq('currency', currency)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    if (userData.status === 'frozen') {
      return NextResponse.json({ error: 'Account is frozen. Withdrawals are disabled.' }, { status: 403 });
    }

    if (userData.status === 'banned') {
      return NextResponse.json({ error: 'Account is banned.' }, { status: 403 });
    }

    if (userData.balance < amount) {
      return NextResponse.json({ error: `Insufficient house balance in ${currency}` }, { status: 400 });
    }

    // Manual approval thresholds — amounts ABOVE these require admin review.
    // Below or equal to the threshold the withdrawal executes instantly.
    // Testnets (Somnia/Push) are always instant.
    const AUTO_THRESHOLDS: Record<string, number> = {
      BNB:    0.08, // manual approval required only above 0.08 BNB
      SOL:    0.45,
      BYNOMO: 0.45,
      SUI:    45,
      USDC:   45,
      XLM:    300,
      XTZ:    150,
      NEAR:   40,
      STRK:   1500,
      // Testnets — always instant
      STT:    Infinity,
      SOMNIA: Infinity,
      PC:     Infinity,
      PUSH:   Infinity,
      OCT:    Infinity,
      '0G':   Infinity,
      INIT:   5,     // auto up to 5 INIT, manual above
    };

    const threshold = AUTO_THRESHOLDS[normalizedCurrency] ?? 0;
    const requiresManualApproval = accountType === 'real' && amount > threshold;

    // 2. Apply tiered Treasury Fee (platform/protocol fee)
    const feeAmount = calculateFeeAmount(amount, userTier);
    const netWithdrawAmount = amount - feeAmount;
    const feePercentLabel = getFeePercentLabel(userTier);

    if (netWithdrawAmount <= 0) {
      return NextResponse.json(
        { error: `Withdrawal amount after ${feePercentLabel} fee must be greater than zero` },
        { status: 400 }
      );
    }

    console.log(
      `Withdrawal Request: Total=${amount}, Fee=${feeAmount}, Net=${netWithdrawAmount}, Currency=${currency}, manual=${requiresManualApproval}`,
    );

    if (requiresManualApproval) {
      const { data: pendingRow, error: pendingError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_address: userAddress,
          currency: currency,
          amount,
          fee_amount: feeAmount,
          net_amount: netWithdrawAmount,
          signature: authorizationSignature || null,
          signed_at: signedAt || null,
          status: 'pending',
        })
        .select('*')
        .single();

      if (pendingError) {
        return NextResponse.json({ error: pendingError.message || 'Failed to create withdrawal request' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        status: 'pending',
        requestId: pendingRow.id,
        newBalance: userData.balance,
      });
    }

    // Otherwise, perform transfer immediately (demo account behavior).

    // Move the platform/protocol fee portion from treasury to the fee collector.
    // A failure here must NOT block the user's withdrawal — log the error and continue.
    let feeTxHash: string | null = null;
    try {
      feeTxHash = await collectPlatformFeeFromTreasury(normalizedCurrency, feeAmount);
    } catch (feeErr) {
      console.error('[withdraw] Fee collection failed (non-blocking):', feeErr);
    }

    // Perform net transfer from treasury to the user.
    let withdrawTxHash: string;
    try {
      if (normalizedCurrency === 'BNB') {
        withdrawTxHash = await transferBNBFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'SOL' || normalizedCurrency === 'BYNOMO') {
        if (normalizedCurrency === 'BYNOMO') {
          const { transferTokenFromTreasury } = await import('@/lib/solana/backend-client');
          const BYNOMO_MINT = 'Bi4NEEQhtrFdnoS9NjrXaWkQftXifh2t3RzQHSTQpump';
          withdrawTxHash = await transferTokenFromTreasury(userAddress, netWithdrawAmount, BYNOMO_MINT);
        } else {
          const { transferSOLFromTreasury } = await import('@/lib/solana/backend-client');
          withdrawTxHash = await transferSOLFromTreasury(userAddress, netWithdrawAmount);
        }
      } else if (normalizedCurrency === 'SUI') {
        const { transferUSDCFromTreasury } = await import('@/lib/sui/backend-client');
        withdrawTxHash = await transferUSDCFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'XLM') {
        const { transferXLMFromTreasury } = await import('@/lib/stellar/backend-client');
        withdrawTxHash = await transferXLMFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'XTZ') {
        const { transferXTZFromTreasury } = await import('@/lib/tezos/backend-client');
        withdrawTxHash = await transferXTZFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'NEAR') {
        const { transferNEARFromTreasury } = await import('@/lib/near/backend-client');
        withdrawTxHash = await transferNEARFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'STRK') {
        const { transferSTRKFromTreasury } = await import('@/lib/starknet/backend-client');
        withdrawTxHash = await transferSTRKFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'PUSH' || normalizedCurrency === 'PC') {
        const { transferPUSHFromTreasury } = await import('@/lib/push/backend-client');
        withdrawTxHash = await transferPUSHFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'SOMNIA' || normalizedCurrency === 'STT') {
        withdrawTxHash = await transferSOMNIAFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'OCT') {
        withdrawTxHash = await transferOCTFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === '0G') {
        withdrawTxHash = await transferZGFromTreasury(userAddress, netWithdrawAmount);
      } else if (normalizedCurrency === 'INIT') {
        withdrawTxHash = await transferINITFromTreasury(userAddress, netWithdrawAmount);
      } else {
        throw new Error(`Unsupported currency for withdrawal: ${currency}`);
      }
    } catch (error: unknown) {
      console.error('Transfer failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown transfer error';
      return NextResponse.json({ error: `Withdrawal failed: ${message}` }, { status: 500 });
    }

    const combinedTxHash = feeTxHash ? `${feeTxHash}|netTx:${withdrawTxHash}` : withdrawTxHash;

    // 3. Update Supabase balance using RPC
    const { data, error } = await supabase.rpc('update_balance_for_withdrawal', {
      p_user_address: userAddress,
      p_withdrawal_amount: amount,
      p_currency: currency,
      p_transaction_hash: combinedTxHash,
    });

    if (error) {
      console.error('Database error in withdrawal update:', error);
      // Note: At this point the BNB has been sent!
      return NextResponse.json(
        {
          success: true,
          txHash: withdrawTxHash,
          warning: 'BNB sent but balance update failed. Please contact support.',
          error: error.message
        },
        { status: 200 }
      );
    }

    const result = data as { success: boolean; error: string | null; new_balance: number };

    return NextResponse.json({
      success: true,
      txHash: withdrawTxHash,
      newBalance: result.new_balance,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/balance/withdraw:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
}
