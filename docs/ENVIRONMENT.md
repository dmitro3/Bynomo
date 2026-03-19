# Environment Variables (Local Run)

This project uses a `.env.local` file (copied from `.env.example`) to configure:
frontend config (public / client-side),
and backend-only secrets (treasury/private keys).

Do not commit `.env.local`, and do not paste secret values into chat/tools. If you ever expose a treasury/private key, rotate it immediately.

## 1) Copy the template

```bash
cp .env.example .env.local
```

## 2) Fill in the required values

### Public (frontend and client-side usage)

Set these in `.env.local`:

`NEXT_PUBLIC_APP_NAME`
`NEXT_PUBLIC_ROUND_DURATION`
`NEXT_PUBLIC_PRICE_UPDATE_INTERVAL`
`NEXT_PUBLIC_CHART_TIME_WINDOW`

`NEXT_PUBLIC_SUPABASE_URL`
`NEXT_PUBLIC_SUPABASE_ANON_KEY`

`NEXT_PUBLIC_PRIVY_APP_ID`

`NEXT_PUBLIC_TREASURY_ADDRESS`

`NEXT_PUBLIC_BNB_NETWORK`
`NEXT_PUBLIC_BNB_RPC_ENDPOINT`
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

`NEXT_PUBLIC_PUSH_RPC_ENDPOINT`
`NEXT_PUBLIC_PUSH_TREASURY_ADDRESS`

`NEXT_PUBLIC_SOLANA_NETWORK`
`NEXT_PUBLIC_SOLANA_RPC_ENDPOINT`
`NEXT_PUBLIC_SOL_TREASURY_ADDRESS`

`NEXT_PUBLIC_SUI_NETWORK`
`NEXT_PUBLIC_SUI_RPC_ENDPOINT`
`NEXT_PUBLIC_SUI_TREASURY_ADDRESS`
`NEXT_PUBLIC_USDC_TYPE`

`NEXT_PUBLIC_STELLAR_NETWORK`
`NEXT_PUBLIC_STELLAR_HORIZON_URL`
`NEXT_PUBLIC_STELLAR_TREASURY_ADDRESS`

`NEXT_PUBLIC_TEZOS_RPC_URL`
`NEXT_PUBLIC_TEZOS_TREASURY_ADDRESS`

`NEXT_PUBLIC_NEAR_TREASURY_ADDRESS`

`NEXT_PUBLIC_STARKNET_RPC_URL`
`NEXT_PUBLIC_STARKNET_CHAIN_ID`
`NEXT_PUBLIC_STARKNET_TREASURY_ADDRESS`
`NEXT_PUBLIC_STARKNET_STRK_TOKEN_ADDRESS`

`NEXT_PUBLIC_POSTHOG_KEY`
`NEXT_PUBLIC_POSTHOG_HOST`

### Server-only (backend secrets; do not put real values in README/chat)

Set these in `.env.local`:

`PRIVY_APP_SECRET`

BNB treasury:
`BNB_TREASURY_SECRET_KEY`

Push treasury:
`PUSH_TREASURY_SECRET_KEY`

Solana treasury:
`SOL_TREASURY_SECRET_KEY`

Sui treasury:
`SUI_TREASURY_SECRET_KEY`

Stellar treasury:
`STELLAR_TREASURY_SECRET`

Tezos treasury:
`TEZOS_TREASURY_SECRET_KEY`

Near treasury:
`NEAR_TREASURY_ACCOUNT_ID`
`NEAR_TREASURY_PRIVATE_KEY`

Starknet treasury:
`STARKNET_TREASURY_PRIVATE_KEY`
`STARKNET_TREASURY_CAIRO_VERSION`

## 3) Local run

Start the dev server:

```bash
yarn dev
```

The app should be available at:
`http://localhost:3000`

## 4) Which networks do you need?

If you only want to test one withdrawal path locally (for example BNB), you can leave other chain treasury secrets blank, but you must ensure the secrets/RPC config exist for any chain you attempt to withdraw on.

