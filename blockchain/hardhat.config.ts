import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import("@nomicfoundation/hardhat-foundry")

import * as dotenv from "dotenv"
dotenv.config()
const { PRIVATE_KEY, MUMBAI_RPC, SEPOLIA_RPC, POLYGONSCAN_API_KEY, ETHERSCAN_API_KEY } = process.env

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100000,
      },
    },
  },
  mocha: {
    timeout: 100000000,
    retries: 20,
    diff: true,
    parallel: false,
    allowUncaught: false,
    asyncOnly: true,
    fullTrace: true,
  },
  etherscan: {
    apiKey: POLYGONSCAN_API_KEY, //polygon
    // apiKey: ETHERSCAN_API_KEY, // sepolia
  },
  networks: {
    mumbai: {
      url: MUMBAI_RPC,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: [`0x${PRIVATE_KEY}`],
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
}

export default config
