import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side admin authentication guard.
 *
 * The client sends the admin password as the `x-admin-token` header on every
 * request.  We validate it against the `DASHBOARD_PASSWORD` environment
 * variable on the server.  The password is NEVER exposed in client bundles —
 * only read inside this server-side helper.
 *
 * Usage in any route handler:
 *   const deny = requireAdminAuth(request);
 *   if (deny) return deny;
 */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  const password = process.env.DASHBOARD_PASSWORD;

  if (!password) {
    // Env var not configured — deny all requests to avoid an open backdoor.
    return NextResponse.json(
      { error: 'Admin auth not configured on server. Set DASHBOARD_PASSWORD.' },
      { status: 503 },
    );
  }

  const token = request.headers.get('x-admin-token');
  if (!token || token !== password) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // authenticated — continue
}
