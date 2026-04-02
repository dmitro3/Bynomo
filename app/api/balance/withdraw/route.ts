import { NextRequest, NextResponse } from 'next/server';
import { supabaseService as supabase } from '@/lib/supabase/serviceClient';

const FREQUENCY_REVIEW_THRESHOLD = 10; // withdrawals before manual review kicks in
import { transferBNBFromTreasury } from '@/lib/bnb/backend-client';
import { transferSOMNIAFromTreasury } from '@/lib/somnia/backend-client';
import { transferOCTFromTreasury } from '@/lib/onechain/backend-client';
import { transferZGFromTreasury } from '@/lib/zg/backend-client';
import { transferINITFromTreasury } from '@/lib/initia/backend-client';
import { ethers } from 'ethers';
import { calculateFeeAmount, collectPlatformFeeFromTreasury, getFeePercentLabel } from '@/lib/fees/platformFee';
import { isWalletGloballyBanned } from '@/lib/bans/walletBan';
import { walletAddressSearchVariants } from '@/lib/admin/walletAddressVariants';
import { canonicalHouseUserAddress } from '@/lib/wallet/canonicalAddress';

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

    if (await isWalletGloballyBanned(userAddress)) {
      return NextResponse.json(
        { error: 'This wallet is banned from the platform.' },
        { status: 403 }
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
      if (canonicalHouseUserAddress(recovered) !== canonicalHouseUserAddress(userAddress)) {
        return NextResponse.json(
          { error: 'Invalid withdrawal signature' },
          { status: 401 }
        );
      }
    }

    const addrVariants = walletAddressSearchVariants(userAddress);

    // 1. Get house balance and status from Supabase and validate (merge legacy EVM casing rows)
    const { data: balRows, error: userError } = await supabase
      .from('user_balances')
      .select('balance, status, user_address')
      .in('user_address', addrVariants)
      .eq('currency', currency);

    if (userError || !balRows?.length) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    for (const row of balRows) {
      if (row.status === 'frozen') {
        return NextResponse.json({ error: 'Account is frozen. Withdrawals are disabled.' }, { status: 403 });
      }
      if (row.status === 'banned') {
        return NextResponse.json({ error: 'Account is banned.' }, { status: 403 });
      }
    }

    const sortedByBal = [...balRows].sort((a, b) => Number(b.balance) - Number(a.balance));
    const userRow = sortedByBal.find(r => Number(r.balance) >= amount);
    if (!userRow) {
      return NextResponse.json({ error: `Insufficient house balance in ${currency}` }, { status: 400 });
    }

    const dbAddress = userRow.user_address;
    const userData = { balance: userRow.balance, status: userRow.status };

    // ── Withdrawal-frequency guard ─────────────────────────────────────────
    // Count ALL completed + pending withdrawals for this user across all chains.
    // Completed ones are tracked in balance_audit_log (operation_type='withdrawal').
    // Pending (not yet processed) ones are in withdrawal_requests with status='pending'.
    // We intentionally count across ALL currencies/chains — abuse detection is global.
    let withdrawalCount = 0;
    if (accountType === 'real') {
      const [auditCountRes, pendingCountRes] = await Promise.all([
        supabase
          .from('balance_audit_log')
          .select('id', { count: 'exact', head: true })
          .eq('operation_type', 'withdrawal')
          .in('user_address', addrVariants),
        supabase
          .from('withdrawal_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
          .in('user_address', addrVariants),
      ]);
      withdrawalCount = (auditCountRes.count ?? 0) + (pendingCountRes.count ?? 0);
    }
    const triggersFrequencyReview = accountType === 'real' && withdrawalCount >= FREQUENCY_REVIEW_THRESHOLD;

    // Manual approval thresholds — amounts ABOVE these require admin review.
    // Below or equal to the threshold the withdrawal executes instantly.
    // Testnets (Somnia/Push) are always instant.
    const AUTO_THRESHOLDS: Record<string, number> = {
      BNB:    0.08,
      SOL:    0.45,
      BYNOMO: 0.45,
      SUI:    45,
      USDC:   45,
      XLM:    300,
      XTZ:    150,
      NEAR:   40,
      STRK:   1500,
      STT:    Infinity,
      SOMNIA: Infinity,
      PC:     Infinity,
      PUSH:   Infinity,
      OCT:    Infinity,
      '0G':   Infinity,
      INIT:   5,
    };

    const threshold = AUTO_THRESHOLDS[normalizedCurrency] ?? 0;
    // requiresManualApproval: either amount exceeds auto-threshold OR frequency guard triggered
    const requiresManualApproval =
      accountType === 'real' && (amount > threshold || triggersFrequencyReview);

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
          user_address: canonicalHouseUserAddress(userAddress),
          currency: currency,
          amount,
          fee_amount: feeAmount,
          net_amount: netWithdrawAmount,
          signature: authorizationSignature || null,
          signed_at: signedAt || null,
          status: 'pending',
          // Stamp the reason so the dashboard can distinguish frequency-flagged requests
          decided_by: triggersFrequencyReview ? `FREQUENCY_REVIEW:count=${withdrawalCount + 1}` : null,
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
        frequencyReview: triggersFrequencyReview,
        withdrawalCount: withdrawalCount + 1,
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
      p_user_address: dbAddress,
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
