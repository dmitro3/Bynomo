import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin dashboard authentication.
 * The password is stored exclusively in the DASHBOARD_PASSWORD environment
 * variable on the server. It is never exposed in source code or client bundles.
 * Changing it requires access to the Vercel project's environment variables.
 */
export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        const stored = process.env.DASHBOARD_PASSWORD;
        if (!stored) {
            // Env var not configured — deny access to avoid an open backdoor.
            return NextResponse.json({ ok: false, error: 'Auth not configured on server.' }, { status: 503 });
        }

        if (password !== stored) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
    }
}
