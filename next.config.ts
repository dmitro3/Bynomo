import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Ignore TypeScript errors in near-docs folder during build
    ignoreBuildErrors: false,
  },
  // Empty turbopack config to silence warning
  turbopack: {},
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // Privy needs unsafe-eval for its embedded wallet SDK; posthog analytics.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.posthog.com https://*.privy.io https://*.privy.systems",
      // Privy loads fonts/styles from its own CDN.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://assets.privy.io https://*.privy.systems",
      "font-src 'self' https://fonts.gstatic.com https://assets.privy.io data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https: wss:",
      // Privy embedded-wallet iframes + existing embeds.
      "frame-src https://www.youtube.com https://youtube.com https://dexscreener.com https://docs.google.com https://auth.privy.io https://*.privy.systems",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // same-origin-allow-popups lets MetaMask/WalletConnect popups communicate
          // back to the opener window. "same-origin" breaks wallet connections.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          // Restrict browser CORS to first-party origin only.
          { key: "Access-Control-Allow-Origin", value: "https://bynomo.fun" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
