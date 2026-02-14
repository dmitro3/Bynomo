/**
 * Stellar (XLM) wallet kit – connect/disconnect via @creit.tech/stellar-wallets-kit
 */

import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
} from '@creit.tech/stellar-wallets-kit';

let kitInstance: StellarWalletsKit | null = null;

function getKit(): StellarWalletsKit {
  if (!kitInstance) {
    kitInstance = new StellarWalletsKit({
      network: WalletNetwork.PUBLIC,
      modules: allowAllModules(),
    });
  }
  return kitInstance;
}

/**
 * Initialize the Stellar Wallet Kit (creates the singleton). Call once on app load if you use XLM.
 */
export async function initWalletKit(): Promise<void> {
  getKit();
}

/**
 * Open the Stellar wallet selection modal and return the selected address, or null if closed/canceled.
 */
export async function openWalletModal(): Promise<string | null> {
  return new Promise((resolve) => {
    const kit = getKit();
    kit
      .openModal({
        onWalletSelected: async (option) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            resolve(address);
          } catch {
            resolve(null);
          }
        },
        onClosed: () => {
          resolve(null);
        },
      })
      .catch(() => resolve(null));
  });
}

/**
 * Disconnect the current Stellar wallet (clears stored address in the kit).
 */
export async function disconnectWallet(): Promise<void> {
  const kit = kitInstance;
  if (kit) {
    await kit.disconnect();
  }
}
