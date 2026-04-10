# Litepaper Changelog

## v1.3.0 - 2026-04-09

- Bumped document version and “current state” to reflect Aptos (APT) and treasury/backend hardening.
- Multi-chain topology: Aptos adapter and treasury node in architecture diagram; expanded adapter list in prose.
- Scope: clarified Blitz entry fee in native gas vs house ledger; noted separate SUI vs USDC house ledgers on Sui.
- Risk: auto-approval threshold for APT (10) aligned with production config.
- Security: documented optional `BALANCE_INTERNAL_SECRET` / `x-bynomo-balance-key` gate for balance mutation routes.
- Roadmap: chain-expansion note on matching treasury keys (NEAR full-access, Aptos Ed25519, etc.).
- Removed unused `Metadata` import on `/litepaper` page; fixed `'use client'` directive formatting.

## v1.0.0 - 2026-04-01

- Initial public litepaper published.
- Added core sections for architecture, risk, security, utility, and roadmap.
- Published web route at `/litepaper`.

