import "dotenv/config";
import "@nomicfoundation/hardhat-verify";
import { HardhatUserConfig } from "hardhat/config";

const SOMNIA_RPC =
  process.env.NEXT_PUBLIC_SOMNIA_TESTNET_RPC || "https://dream-rpc.somnia.network";

// Shannon explorer exposes an etherscan-compatible API endpoint.
const SOMNIA_EXPLORER_API = "https://shannon-explorer.somnia.network/api";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.23",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.30",
        settings: {
          optimizer: {
            enabled: false,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    cache: "./cache/hardhat",
    artifacts: "./artifacts/hardhat",
  },
  networks: {
    somnia: {
      type: "http",
      chainType: "l1",
      url: SOMNIA_RPC,
      accounts: process.env.SOMNIA_TREASURY_SECRET_KEY
        ? [
            process.env.SOMNIA_TREASURY_SECRET_KEY.startsWith("0x")
              ? process.env.SOMNIA_TREASURY_SECRET_KEY
              : `0x${process.env.SOMNIA_TREASURY_SECRET_KEY}`,
          ]
        : [],
    },
  },
  // Verification on Somnia is done through the explorer API flow in scripts/terminal.
};

export default config;

