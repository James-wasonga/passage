require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '0x'.padEnd(66, '1');

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    'base-sepolia': {
      url: process.env.BASE_RPC_URL || 'https://sepolia.base.org',
      accounts: [WALLET_PRIVATE_KEY],
      chainId: 84532,
    },
    base: {
      url: process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
      accounts: [WALLET_PRIVATE_KEY],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || '',
    },
  },
};
