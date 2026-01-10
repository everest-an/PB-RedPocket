/**
 * @fileoverview XCM Chain Configuration
 * @description Configuration for supported chains and bridge routes
 * @module lib/blockchain/xcm/config
 */

import {
  ChainId,
  ChainType,
  ChainConfig,
  AssetId,
  BridgeRoute,
  BridgeProtocol,
} from './types';

/**
 * Common asset definitions used across chains
 */
export const COMMON_ASSETS: Record<string, Omit<AssetId, 'originChain' | 'address'>> = {
  USDC: { symbol: 'USDC', decimals: 6 },
  USDT: { symbol: 'USDT', decimals: 6 },
  ETH: { symbol: 'ETH', decimals: 18 },
  DOT: { symbol: 'DOT', decimals: 10 },
  GLMR: { symbol: 'GLMR', decimals: 18 },
  ASTR: { symbol: 'ASTR', decimals: 18 },
  ACA: { symbol: 'ACA', decimals: 12 },
};

/**
 * Chain configurations for all supported networks
 */
export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  // Base Mainnet
  [ChainId.BASE_MAINNET]: {
    chainId: ChainId.BASE_MAINNET,
    type: ChainType.EVM,
    name: 'Base',
    rpcUrl: process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.BASE_MAINNET, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.BASE_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    bridgeContract: process.env.BASE_BRIDGE_CONTRACT,
    isActive: true,
    blockTime: 2000,
    finalityTime: 12000,
  },

  // Base Sepolia (Testnet)
  [ChainId.BASE_SEPOLIA]: {
    chainId: ChainId.BASE_SEPOLIA,
    type: ChainType.EVM,
    name: 'Base Sepolia',
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.BASE_SEPOLIA, address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.BASE_SEPOLIA, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    bridgeContract: process.env.BASE_SEPOLIA_BRIDGE_CONTRACT,
    isActive: true,
    blockTime: 2000,
    finalityTime: 12000,
  },

  // Polygon Mainnet
  [ChainId.POLYGON_MAINNET]: {
    chainId: ChainId.POLYGON_MAINNET,
    type: ChainType.EVM,
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeToken: 'MATIC',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.POLYGON_MAINNET, address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.POLYGON_MAINNET, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', ...COMMON_ASSETS.USDT },
    ],
    bridgeContract: process.env.POLYGON_BRIDGE_CONTRACT,
    isActive: true,
    blockTime: 2000,
    finalityTime: 128000,
  },

  // Polygon Mumbai (Testnet)
  [ChainId.POLYGON_MUMBAI]: {
    chainId: ChainId.POLYGON_MUMBAI,
    type: ChainType.EVM,
    name: 'Polygon Mumbai',
    rpcUrl: process.env.POLYGON_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeToken: 'MATIC',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.POLYGON_MUMBAI, address: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23', ...COMMON_ASSETS.USDC },
    ],
    bridgeContract: process.env.POLYGON_MUMBAI_BRIDGE_CONTRACT,
    isActive: true,
    blockTime: 2000,
    finalityTime: 128000,
  },

  // Ethereum Mainnet
  [ChainId.ETHEREUM_MAINNET]: {
    chainId: ChainId.ETHEREUM_MAINNET,
    type: ChainType.EVM,
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_MAINNET_RPC_URL || 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.ETHEREUM_MAINNET, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.ETHEREUM_MAINNET, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', ...COMMON_ASSETS.USDT },
      { originChain: ChainId.ETHEREUM_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    bridgeContract: process.env.ETHEREUM_BRIDGE_CONTRACT,
    isActive: true,
    blockTime: 12000,
    finalityTime: 900000, // ~15 minutes for finality
  },

  // Ethereum Sepolia (Testnet)
  [ChainId.ETHEREUM_SEPOLIA]: {
    chainId: ChainId.ETHEREUM_SEPOLIA,
    type: ChainType.EVM,
    name: 'Ethereum Sepolia',
    rpcUrl: process.env.ETHEREUM_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.ETHEREUM_SEPOLIA, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    bridgeContract: process.env.ETHEREUM_SEPOLIA_BRIDGE_CONTRACT,
    isActive: true,
    blockTime: 12000,
    finalityTime: 900000,
  },

  // Polkadot Relay Chain
  [ChainId.POLKADOT_RELAY]: {
    chainId: ChainId.POLKADOT_RELAY,
    type: ChainType.RELAY,
    name: 'Polkadot',
    rpcUrl: process.env.POLKADOT_RPC_URL || 'https://rpc.polkadot.io',
    wsUrl: process.env.POLKADOT_WS_URL || 'wss://rpc.polkadot.io',
    explorerUrl: 'https://polkadot.subscan.io',
    nativeToken: 'DOT',
    nativeDecimals: 10,
    supportedAssets: [
      { originChain: ChainId.POLKADOT_RELAY, address: 'native', ...COMMON_ASSETS.DOT },
    ],
    isActive: true,
    blockTime: 6000,
    finalityTime: 60000,
  },

  // Moonbeam Parachain
  [ChainId.MOONBEAM]: {
    chainId: ChainId.MOONBEAM,
    type: ChainType.SUBSTRATE,
    name: 'Moonbeam',
    rpcUrl: process.env.MOONBEAM_RPC_URL || 'https://rpc.api.moonbeam.network',
    wsUrl: process.env.MOONBEAM_WS_URL || 'wss://wss.api.moonbeam.network',
    explorerUrl: 'https://moonbeam.subscan.io',
    nativeToken: 'GLMR',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.MOONBEAM, address: 'native', ...COMMON_ASSETS.GLMR },
      { originChain: ChainId.MOONBEAM, address: '0xFFfffffF7D2B0B761Af01Ca8e25242976ac0aD7D', ...COMMON_ASSETS.USDC },
    ],
    isActive: true,
    blockTime: 12000,
    finalityTime: 24000,
  },

  // Acala Parachain
  [ChainId.ACALA]: {
    chainId: ChainId.ACALA,
    type: ChainType.SUBSTRATE,
    name: 'Acala',
    rpcUrl: process.env.ACALA_RPC_URL || 'https://acala-rpc.dwellir.com',
    wsUrl: process.env.ACALA_WS_URL || 'wss://acala-rpc.dwellir.com',
    explorerUrl: 'https://acala.subscan.io',
    nativeToken: 'ACA',
    nativeDecimals: 12,
    supportedAssets: [
      { originChain: ChainId.ACALA, address: 'native', ...COMMON_ASSETS.ACA },
    ],
    isActive: true,
    blockTime: 12000,
    finalityTime: 24000,
  },

  // Astar Parachain
  [ChainId.ASTAR]: {
    chainId: ChainId.ASTAR,
    type: ChainType.SUBSTRATE,
    name: 'Astar',
    rpcUrl: process.env.ASTAR_RPC_URL || 'https://evm.astar.network',
    wsUrl: process.env.ASTAR_WS_URL || 'wss://rpc.astar.network',
    explorerUrl: 'https://astar.subscan.io',
    nativeToken: 'ASTR',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.ASTAR, address: 'native', ...COMMON_ASSETS.ASTR },
    ],
    isActive: true,
    blockTime: 12000,
    finalityTime: 24000,
  },
};

/**
 * Available bridge routes between chains
 */
export const BRIDGE_ROUTES: BridgeRoute[] = [
  // XCM routes within Polkadot ecosystem
  {
    fromChain: ChainId.POLKADOT_RELAY,
    toChain: ChainId.MOONBEAM,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 60000,
    baseFee: BigInt(100000000), // 0.01 DOT
    feeToken: { originChain: ChainId.POLKADOT_RELAY, address: 'native', ...COMMON_ASSETS.DOT },
    isAvailable: true,
  },
  {
    fromChain: ChainId.MOONBEAM,
    toChain: ChainId.POLKADOT_RELAY,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 60000,
    baseFee: BigInt(1000000000000000), // 0.001 GLMR
    feeToken: { originChain: ChainId.MOONBEAM, address: 'native', ...COMMON_ASSETS.GLMR },
    isAvailable: true,
  },
  {
    fromChain: ChainId.POLKADOT_RELAY,
    toChain: ChainId.ACALA,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 60000,
    baseFee: BigInt(100000000), // 0.01 DOT
    feeToken: { originChain: ChainId.POLKADOT_RELAY, address: 'native', ...COMMON_ASSETS.DOT },
    isAvailable: true,
  },
  {
    fromChain: ChainId.MOONBEAM,
    toChain: ChainId.ACALA,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 90000,
    baseFee: BigInt(1000000000000000), // 0.001 GLMR
    feeToken: { originChain: ChainId.MOONBEAM, address: 'native', ...COMMON_ASSETS.GLMR },
    isAvailable: true,
  },

  // LayerZero routes for EVM chains
  {
    fromChain: ChainId.BASE_MAINNET,
    toChain: ChainId.POLYGON_MAINNET,
    protocol: BridgeProtocol.LAYER_ZERO,
    estimatedTime: 300000, // 5 minutes
    baseFee: BigInt(1000000000000000), // 0.001 ETH
    feeToken: { originChain: ChainId.BASE_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    isAvailable: true,
  },
  {
    fromChain: ChainId.POLYGON_MAINNET,
    toChain: ChainId.BASE_MAINNET,
    protocol: BridgeProtocol.LAYER_ZERO,
    estimatedTime: 300000,
    baseFee: BigInt(100000000000000000), // 0.1 MATIC equivalent
    feeToken: { originChain: ChainId.POLYGON_MAINNET, address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', decimals: 18 },
    isAvailable: true,
  },
  {
    fromChain: ChainId.ETHEREUM_MAINNET,
    toChain: ChainId.BASE_MAINNET,
    protocol: BridgeProtocol.NATIVE,
    estimatedTime: 900000, // 15 minutes
    baseFee: BigInt(5000000000000000), // 0.005 ETH
    feeToken: { originChain: ChainId.ETHEREUM_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    isAvailable: true,
  },
];

/**
 * Get chain configuration by chain ID
 * @param chainId - The chain identifier
 * @returns Chain configuration or undefined if not found
 */
export function getChainConfig(chainId: ChainId): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

/**
 * Get all active chains
 * @returns Array of active chain configurations
 */
export function getActiveChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(chain => chain.isActive);
}

/**
 * Get available bridge routes from a source chain
 * @param fromChain - Source chain ID
 * @returns Array of available bridge routes
 */
export function getAvailableRoutes(fromChain: ChainId): BridgeRoute[] {
  return BRIDGE_ROUTES.filter(route => route.fromChain === fromChain && route.isAvailable);
}

/**
 * Find the best route between two chains
 * @param fromChain - Source chain ID
 * @param toChain - Destination chain ID
 * @returns Best available route or undefined
 */
export function findBestRoute(fromChain: ChainId, toChain: ChainId): BridgeRoute | undefined {
  const routes = BRIDGE_ROUTES.filter(
    route => route.fromChain === fromChain && route.toChain === toChain && route.isAvailable
  );
  
  // Sort by estimated time (fastest first)
  routes.sort((a, b) => a.estimatedTime - b.estimatedTime);
  
  return routes[0];
}
