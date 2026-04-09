import { NextRequest, NextResponse } from 'next/server';

const HEADER = 'x-bynomo-balance-key';

function getAllowedOrigins(request: NextRequest): Set<string> {
  return new Set(
    [
      request.nextUrl.origin,
      process.env.NEXT_PUBLIC_APP_URL?.trim(),
      'https://bynomo.fun',
      'https://www.bynomo.fun',
    ].filter((value): value is string => Boolean(value)),
  );
}

function matchesAllowedOrigin(urlValue: string | null, allowedOrigins: Set<string>): boolean {
  if (!urlValue) return false;
  try {
    return allowedOrigins.has(new URL(urlValue).origin);
  } catch {
    return false;
  }
}

/**
 * When BALANCE_INTERNAL_SECRET is set, balance mutation routes require the same
 * value in `x-bynomo-balance-key` (or Authorization: Bearer …).
 * Pair with NEXT_PUBLIC_BALANCE_API_KEY in the browser (same value).
 * This blocks anonymous bulk abuse; it is not a substitute for on-chain deposit verification.
 *
 * In non-production environments, same-origin requests are allowed without the browser
 * key so that local dev and preview deployments work without extra env setup.
 */
export function assertBalanceApiAuthorized(request: NextRequest): NextResponse | null {
  const secret = process.env.BALANCE_INTERNAL_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Balance API auth is not configured on server.' },
        { status: 503 },
      );
    }
    return null;
  }

  const allowedOrigins = getAllowedOrigins(request);
  const isFirstPartyBrowserRequest =
    matchesAllowedOrigin(request.headers.get('origin'), allowedOrigins) ||
    matchesAllowedOrigin(request.headers.get('referer'), allowedOrigins);

  // In non-production, same-origin requests are trusted without the API key.
  // NEXT_PUBLIC_BALANCE_API_KEY may not be embedded in the dev bundle yet.
  if (process.env.NODE_ENV !== 'production' && isFirstPartyBrowserRequest) {
    return null;
  }

  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (bearerToken) {
    if (bearerToken === secret) return null;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_BALANCE_API_KEY?.trim();
  const browserKey = request.headers.get(HEADER)?.trim();

  if (!browserKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFirstPartyBrowserRequest) {
    return NextResponse.json({ error: 'Unauthorized origin' }, { status: 401 });
  }

  if (browserKey !== (publicKey || secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
