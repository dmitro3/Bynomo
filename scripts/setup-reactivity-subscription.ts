/**
 * One-time setup script for Somnia Reactivity subscriptions.
 *
 * Registers: BynomoTreasury.Deposited(address,uint256,uint256)
 *   -> BynomoTreasuryReactor.onEvent() via Somnia Reactivity precompile.
 *
 * Notes:
 * - Requires SOMNIA_OWNER_PRIVATE_KEY (owner account holding enough native balance)
 * - Requires BynomoTreasury and BynomoTreasuryReactor to be deployed.
 */

import { http, keccak256, parseGwei, toHex, type Hex, type Address, createPublicClient, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SDK } from '@somnia-chain/reactivity';
import { somniaTestnet } from '../lib/bnb/wagmi';
import { getRpcUrl, getSomniaConfig } from '../lib/somnia/config';

// bytes4(keccak256("onEvent(address,bytes32[],bytes)"))
const ON_EVENT_SELECTOR: Hex = '0x0d5f0e3b';

// BynomoTreasury: Deposited(address,uint256,uint256)
const DEPOSITED_TOPIC: Hex = keccak256(toHex('Deposited(address,uint256,uint256)')) as Hex;

// Gas config (matches reference guidance)
const REACTIVITY_GAS_CONFIG = {
  priorityFeePerGas: parseGwei('1'),
  maxFeePerGas: parseGwei('10'),
  gasLimit: 2_000_000n,
} as const;

async function main() {
  const rawPrivateKey = process.env.SOMNIA_OWNER_PRIVATE_KEY;
  const privateKey = (
    rawPrivateKey
      ? (rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`)
      : undefined
  ) as Hex | undefined;
  const treasuryAddress =
    (process.env.NEXT_PUBLIC_SOMNIA_TREASURY_ADDRESS || process.env.TREASURY_ADDRESS) as Address | undefined;
  const reactorAddress =
    (process.env.NEXT_PUBLIC_SOMNIA_REACTOR_ADDRESS || process.env.REACTOR_ADDRESS) as Address | undefined;

  if (!privateKey) throw new Error('SOMNIA_OWNER_PRIVATE_KEY is required');
  if (!treasuryAddress) throw new Error('SOMNIA treasury address is required (NEXT_PUBLIC_SOMNIA_TREASURY_ADDRESS)');
  if (!reactorAddress) throw new Error('SOMNIA reactor address is required (NEXT_PUBLIC_SOMNIA_REACTOR_ADDRESS)');

  const HTTP_RPC = getRpcUrl();
  const { reactivityPrecompile } = getSomniaConfig();

  console.log('=== Somnia Reactivity Subscription Setup (Bynomo) ===');
  console.log('Treasury:', treasuryAddress);
  console.log('Reactor :', reactorAddress);
  console.log('Precompile:', reactivityPrecompile);
  console.log('');

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(HTTP_RPC),
  });
  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(HTTP_RPC),
  });

  const sdk = new SDK({ public: publicClient, wallet: walletClient });

  console.log('Registering Deposited -> Reactor subscription...');

  const txHash = await sdk.createSoliditySubscription({
    eventTopics: [DEPOSITED_TOPIC],
    emitter: treasuryAddress,
    handlerContractAddress: reactorAddress,
    handlerFunctionSelector: ON_EVENT_SELECTOR,
    ...REACTIVITY_GAS_CONFIG,
    isGuaranteed: true,
    isCoalesced: false,
  } as any);

  if (txHash instanceof Error) {
    throw txHash;
  }

  console.log('Subscription tx sent:', txHash);
  console.log('Done.');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});

