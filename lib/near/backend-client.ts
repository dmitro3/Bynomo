import * as nearAPI from "near-api-js";
import { NEAR_CONFIG } from "./config";

const { connect, KeyPair, keyStores, utils } = nearAPI;

export const transferNEARFromTreasury = async (
    receiverId: string,
    amount: number
): Promise<string> => {
    const accountId = process.env.NEAR_TREASURY_ACCOUNT_ID;
    const privateKey = process.env.NEAR_TREASURY_PRIVATE_KEY;

    if (!accountId || !privateKey) {
        throw new Error("Missing NEAR treasury credentials in environment");
    }

    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(privateKey);
    await keyStore.setKey("mainnet", accountId, keyPair);

    const near = await connect({
        ...NEAR_CONFIG,
        keyStore,
    });

    const account = await near.account(accountId);

    // Convert amount to yoctoNEAR
    const amountInYocto = utils.format.parseNearAmount(amount.toString());

    if (!amountInYocto) {
        throw new Error("Invalid amount for NEAR transfer");
    }

    const result = await account.sendMoney(receiverId, amountInYocto);

    return result.transaction.hash;
};
