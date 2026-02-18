import { Account, KeyPair, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import { NEAR_CONFIG } from "./config";

export const transferNEARFromTreasury = async (
    receiverId: string,
    amount: number
): Promise<string> => {
    const accountId = process.env.NEAR_TREASURY_ACCOUNT_ID;
    const privateKey = process.env.NEAR_TREASURY_PRIVATE_KEY;

    if (!accountId || !privateKey) {
        throw new Error("Missing NEAR treasury credentials in environment");
    }

    // Create provider
    const provider = new JsonRpcProvider({ url: NEAR_CONFIG.nodeUrl });

    // Create signer from private key
    const keyPair = KeyPair.fromString(privateKey as any);
    const signer = new KeyPairSigner(keyPair);

    // Create account instance
    const account = new Account(accountId, provider, signer);

    // Convert amount to yoctoNEAR (1 NEAR = 10^24 yoctoNEAR)
    // Use toFixed to avoid scientific notation
    const amountInYocto = (amount * 1e24).toFixed(0);

    // Transfer NEAR tokens
    const result = await account.transfer({
        receiverId,
        amount: amountInYocto
    });

    return result.transaction.hash;
};
