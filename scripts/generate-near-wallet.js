const nearAPI = require("near-api-js");
const fs = require("fs");

const { KeyPair } = nearAPI;

const keyPair = KeyPair.fromRandom("ed25519");
const publicKey = keyPair.publicKey.toString();
const privateKey = keyPair.toString();

// On NEAR, the implicit account ID is the lowercase hex representation of the public key's data
const accountId = Buffer.from(keyPair.publicKey.data).toString('hex');

const output = `NEAR Treasury Wallet Generated:
Account ID: ${accountId}
Public Key: ${publicKey}
Private Key: ${privateKey}

Add these to your .env file:
NEXT_PUBLIC_NEAR_TREASURY_ADDRESS=${accountId}
NEAR_TREASURY_ACCOUNT_ID=${accountId}
NEAR_TREASURY_PRIVATE_KEY=${privateKey}
`;

fs.writeFileSync("near-wallet.txt", output);
try {
  fs.chmodSync("near-wallet.txt", 0o600);
} catch (_) {
  // Best effort only; some filesystems do not support chmod.
}
console.log("Wallet generated in near-wallet.txt");
console.log("Private key has been written to the file only. Handle it as a secret and rotate if exposed.");
