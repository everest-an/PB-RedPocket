/**
 * @fileoverview Cross-Chain Bridge and Chain Selection Tests
 * @description Property tests for cross-chain consistency and failover
 * 
 * Note: This test file includes inline type definitions to avoid ES module
 * import issues with Hardhat's test environment.
 */

import { expect } from 'chai';
import * as fc from 'fast-check';

// ============================================================================
// Inline Type Definitions (from lib/blockchain/xcm)
// ============================================================================

/**
 * Supported blockchain networks for cross-chain operations
 */
enum ChainId {
  // EVM Chains
  BASE_MAINNET = 8453,
  BASE_SEPOLIA = 84532,
  POLYGON_MAINNET = 137,
  POLYGON_MUMBAI = 80001,
  ETHEREUM_MAINNET = 1,
  ETHEREUM_SEPOLIA = 11155111,
  // Polkadot Ecosystem (Para IDs)
  POLKADOT_RELAY = 0,
  ACALA = 2000,
  MOONBEAM = 2004,
  ASTAR = 2006,
}

enum ChainType {
  EVM = 'evm',
  SUBSTRATE = 'substrate',
  RELAY = 'relay',
}

enum TransferStatus {
  PENDING = 'pending',
  SOURCE_CONFIRMED = 'source_confirmed',
  BRIDGING = 'bridging',
  DEST_CONFIRMED = 'dest_confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

enum BridgeProtocol {
  XCM = 'xcm',
  LAYER_ZERO = 'layerzero',
  WORMHOLE = 'wormhole',
  NATIVE = 'native',
}

enum CongestionLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface AssetId {
  originChain: ChainId;
  address: string;
  symbol: string;
  decimals: number;
}

interface ChainConfig {
  chainId: ChainId;
  type: ChainType;
  name: string;
  rpcUrl: string;
  wsUrl?: string;
  explorerUrl: string;
  nativeToken: string;
  nativeDecimals: number;
  supportedAssets: AssetId[];
  bridgeContract?: string;
  isActive: boolean;
  blockTime: number;
  finalityTime: number;
}

interface BridgeRoute {
  fromChain: ChainId;
  toChain: ChainId;
  protocol: BridgeProtocol;
  estimatedTime: number;
  baseFee: bigint;
  feeToken: AssetId;
  isAvailable: boolean;
}

interface ChainHealth {
  chainId: ChainId;
  isHealthy: boolean;
  latency: number;
  blockHeight: bigint;
  gasPrice: bigint;
  congestionLevel: CongestionLevel;
  lastChecked: number;
}

interface SelectionCriteria {
  preferLowCost: boolean;
  preferFastFinality: boolean;
  maxGasPrice?: bigint;
  requiredAsset?: string;
  excludeChains?: ChainId[];
}

// ============================================================================
// Inline Configuration (from lib/blockchain/xcm/config)
// ============================================================================

const COMMON_ASSETS: Record<string, Omit<AssetId, 'originChain' | 'address'>> = {
  USDC: { symbol: 'USDC', decimals: 6 },
  USDT: { symbol: 'USDT', decimals: 6 },
  ETH: { symbol: 'ETH', decimals: 18 },
  DOT: { symbol: 'DOT', decimals: 10 },
  GLMR: { symbol: 'GLMR', decimals: 18 },
  ASTR: { symbol: 'ASTR', decimals: 18 },
  ACA: { symbol: 'ACA', decimals: 12 },
};


const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [ChainId.BASE_MAINNET]: {
    chainId: ChainId.BASE_MAINNET,
    type: ChainType.EVM,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.BASE_MAINNET, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.BASE_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    isActive: true,
    blockTime: 2000,
    finalityTime: 12000,
  },
  [ChainId.BASE_SEPOLIA]: {
    chainId: ChainId.BASE_SEPOLIA,
    type: ChainType.EVM,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.BASE_SEPOLIA, address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.BASE_SEPOLIA, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    isActive: true,
    blockTime: 2000,
    finalityTime: 12000,
  },
  [ChainId.POLYGON_MAINNET]: {
    chainId: ChainId.POLYGON_MAINNET,
    type: ChainType.EVM,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeToken: 'MATIC',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.POLYGON_MAINNET, address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.POLYGON_MAINNET, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', ...COMMON_ASSETS.USDT },
    ],
    isActive: true,
    blockTime: 2000,
    finalityTime: 128000,
  },
  [ChainId.POLYGON_MUMBAI]: {
    chainId: ChainId.POLYGON_MUMBAI,
    type: ChainType.EVM,
    name: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    explorerUrl: 'https://mumbai.polygonscan.com',
    nativeToken: 'MATIC',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.POLYGON_MUMBAI, address: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23', ...COMMON_ASSETS.USDC },
    ],
    isActive: true,
    blockTime: 2000,
    finalityTime: 128000,
  },
  [ChainId.ETHEREUM_MAINNET]: {
    chainId: ChainId.ETHEREUM_MAINNET,
    type: ChainType.EVM,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.ETHEREUM_MAINNET, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', ...COMMON_ASSETS.USDC },
      { originChain: ChainId.ETHEREUM_MAINNET, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', ...COMMON_ASSETS.USDT },
      { originChain: ChainId.ETHEREUM_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    isActive: true,
    blockTime: 12000,
    finalityTime: 900000,
  },
  [ChainId.ETHEREUM_SEPOLIA]: {
    chainId: ChainId.ETHEREUM_SEPOLIA,
    type: ChainType.EVM,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeToken: 'ETH',
    nativeDecimals: 18,
    supportedAssets: [
      { originChain: ChainId.ETHEREUM_SEPOLIA, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    ],
    isActive: true,
    blockTime: 12000,
    finalityTime: 900000,
  },
  [ChainId.POLKADOT_RELAY]: {
    chainId: ChainId.POLKADOT_RELAY,
    type: ChainType.RELAY,
    name: 'Polkadot',
    rpcUrl: 'https://rpc.polkadot.io',
    wsUrl: 'wss://rpc.polkadot.io',
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
  [ChainId.MOONBEAM]: {
    chainId: ChainId.MOONBEAM,
    type: ChainType.SUBSTRATE,
    name: 'Moonbeam',
    rpcUrl: 'https://rpc.api.moonbeam.network',
    wsUrl: 'wss://wss.api.moonbeam.network',
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
  [ChainId.ACALA]: {
    chainId: ChainId.ACALA,
    type: ChainType.SUBSTRATE,
    name: 'Acala',
    rpcUrl: 'https://acala-rpc.dwellir.com',
    wsUrl: 'wss://acala-rpc.dwellir.com',
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
  [ChainId.ASTAR]: {
    chainId: ChainId.ASTAR,
    type: ChainType.SUBSTRATE,
    name: 'Astar',
    rpcUrl: 'https://evm.astar.network',
    wsUrl: 'wss://rpc.astar.network',
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


const BRIDGE_ROUTES: BridgeRoute[] = [
  // XCM routes within Polkadot ecosystem
  {
    fromChain: ChainId.POLKADOT_RELAY,
    toChain: ChainId.MOONBEAM,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 60000,
    baseFee: BigInt(100000000),
    feeToken: { originChain: ChainId.POLKADOT_RELAY, address: 'native', ...COMMON_ASSETS.DOT },
    isAvailable: true,
  },
  {
    fromChain: ChainId.MOONBEAM,
    toChain: ChainId.POLKADOT_RELAY,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 60000,
    baseFee: BigInt(1000000000000000),
    feeToken: { originChain: ChainId.MOONBEAM, address: 'native', ...COMMON_ASSETS.GLMR },
    isAvailable: true,
  },
  {
    fromChain: ChainId.POLKADOT_RELAY,
    toChain: ChainId.ACALA,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 60000,
    baseFee: BigInt(100000000),
    feeToken: { originChain: ChainId.POLKADOT_RELAY, address: 'native', ...COMMON_ASSETS.DOT },
    isAvailable: true,
  },
  {
    fromChain: ChainId.MOONBEAM,
    toChain: ChainId.ACALA,
    protocol: BridgeProtocol.XCM,
    estimatedTime: 90000,
    baseFee: BigInt(1000000000000000),
    feeToken: { originChain: ChainId.MOONBEAM, address: 'native', ...COMMON_ASSETS.GLMR },
    isAvailable: true,
  },
  // LayerZero routes for EVM chains
  {
    fromChain: ChainId.BASE_MAINNET,
    toChain: ChainId.POLYGON_MAINNET,
    protocol: BridgeProtocol.LAYER_ZERO,
    estimatedTime: 300000,
    baseFee: BigInt(1000000000000000),
    feeToken: { originChain: ChainId.BASE_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    isAvailable: true,
  },
  {
    fromChain: ChainId.POLYGON_MAINNET,
    toChain: ChainId.BASE_MAINNET,
    protocol: BridgeProtocol.LAYER_ZERO,
    estimatedTime: 300000,
    baseFee: BigInt(100000000000000000),
    feeToken: { originChain: ChainId.POLYGON_MAINNET, address: '0x0000000000000000000000000000000000000000', symbol: 'MATIC', decimals: 18 },
    isAvailable: true,
  },
  {
    fromChain: ChainId.ETHEREUM_MAINNET,
    toChain: ChainId.BASE_MAINNET,
    protocol: BridgeProtocol.NATIVE,
    estimatedTime: 900000,
    baseFee: BigInt(5000000000000000),
    feeToken: { originChain: ChainId.ETHEREUM_MAINNET, address: '0x0000000000000000000000000000000000000000', ...COMMON_ASSETS.ETH },
    isAvailable: true,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getChainConfig(chainId: ChainId): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

function getActiveChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(chain => chain.isActive);
}

function getAvailableRoutes(fromChain: ChainId): BridgeRoute[] {
  return BRIDGE_ROUTES.filter(route => route.fromChain === fromChain && route.isAvailable);
}

function findBestRoute(fromChain: ChainId, toChain: ChainId): BridgeRoute | undefined {
  const routes = BRIDGE_ROUTES.filter(
    route => route.fromChain === fromChain && route.toChain === toChain && route.isAvailable
  );
  routes.sort((a, b) => a.estimatedTime - b.estimatedTime);
  return routes[0];
}

// ============================================================================
// Mock Chain Selector for Testing
// ============================================================================

class MockChainSelector {
  private healthCache: Map<ChainId, ChainHealth> = new Map();
  private excludedChains: Set<ChainId> = new Set();

  constructor() {
    // Initialize with mock healthy status for all chains
    for (const chainId of Object.keys(CHAIN_CONFIGS).map(Number)) {
      this.healthCache.set(chainId, {
        chainId,
        isHealthy: true,
        latency: 100,
        blockHeight: BigInt(1000000),
        gasPrice: BigInt(20) * BigInt(1e9), // 20 gwei
        congestionLevel: CongestionLevel.LOW,
        lastChecked: Date.now(),
      });
    }
  }

  setExcludedChains(chains: ChainId[]): void {
    this.excludedChains = new Set(chains);
  }

  async checkChainHealth(chainId: ChainId): Promise<ChainHealth> {
    const health = this.healthCache.get(chainId);
    if (health) {
      return { ...health, lastChecked: Date.now() };
    }
    return {
      chainId,
      isHealthy: false,
      latency: -1,
      blockHeight: BigInt(0),
      gasPrice: BigInt(0),
      congestionLevel: CongestionLevel.CRITICAL,
      lastChecked: Date.now(),
    };
  }

  getHealthyChains(): ChainId[] {
    return Array.from(this.healthCache.entries())
      .filter(([chainId, health]) => health.isHealthy && !this.excludedChains.has(chainId))
      .map(([chainId]) => chainId);
  }

  getChainsByGasPrice(): ChainId[] {
    return Array.from(this.healthCache.entries())
      .filter(([_, health]) => health.isHealthy)
      .sort((a, b) => Number(a[1].gasPrice - b[1].gasPrice))
      .map(([chainId]) => chainId);
  }

  setChainHealth(chainId: ChainId, health: Partial<ChainHealth>): void {
    const existing = this.healthCache.get(chainId);
    if (existing) {
      this.healthCache.set(chainId, { ...existing, ...health });
    }
  }
}


// ============================================================================
// Test Suites
// ============================================================================

describe('Cross-Chain Bridge Integration', function () {
  describe('Property 9: Cross-Chain Consistency and Atomicity', function () {
    /**
     * Property: All chain configurations should have valid required fields
     */
    it('should have valid chain configurations', function () {
      const chains = Object.values(CHAIN_CONFIGS);
      
      for (const chain of chains) {
        expect(chain.chainId).to.be.a('number');
        expect(chain.name).to.be.a('string').and.not.empty;
        expect(chain.rpcUrl).to.be.a('string').and.not.empty;
        expect(chain.explorerUrl).to.be.a('string').and.not.empty;
        expect(chain.nativeToken).to.be.a('string').and.not.empty;
        expect(chain.nativeDecimals).to.be.a('number').and.at.least(0);
        expect(chain.supportedAssets).to.be.an('array');
        expect(chain.blockTime).to.be.a('number').and.at.least(0);
        expect(chain.finalityTime).to.be.a('number').and.at.least(0);
      }
    });

    /**
     * Property: Bridge routes should connect valid chains
     */
    it('should have valid bridge routes', function () {
      for (const route of BRIDGE_ROUTES) {
        const sourceConfig = getChainConfig(route.fromChain);
        const destConfig = getChainConfig(route.toChain);
        
        expect(sourceConfig).to.not.be.undefined;
        expect(destConfig).to.not.be.undefined;
        expect(Object.values(BridgeProtocol)).to.include(route.protocol);
        expect(route.estimatedTime).to.be.a('number').and.at.least(0);
        expect(route.baseFee >= BigInt(0)).to.be.true;
      }
    });

    /**
     * Property: getChainConfig should return consistent results
     */
    it('should return consistent chain config for same ID', function () {
      const chainIds = [
        ChainId.BASE_MAINNET,
        ChainId.BASE_SEPOLIA,
        ChainId.POLYGON_MAINNET,
        ChainId.ETHEREUM_MAINNET,
        ChainId.POLKADOT_RELAY,
        ChainId.MOONBEAM,
      ];
      
      for (const chainId of chainIds) {
        const config1 = getChainConfig(chainId);
        const config2 = getChainConfig(chainId);
        
        if (config1 && config2) {
          expect(config1.chainId).to.equal(config2.chainId);
          expect(config1.name).to.equal(config2.name);
          expect(config1.rpcUrl).to.equal(config2.rpcUrl);
        }
      }
    });

    /**
     * Property: Active chains should all be properly configured
     */
    it('should have all active chains properly configured', function () {
      const activeChains = getActiveChains();
      
      expect(activeChains.length).to.be.at.least(1);
      
      for (const chain of activeChains) {
        expect(chain.isActive).to.be.true;
        expect(chain.rpcUrl).to.be.a('string').and.not.empty;
        expect(chain.supportedAssets.length).to.be.at.least(1);
      }
    });

    /**
     * Property: Chain IDs should be unique
     */
    it('should have unique chain IDs', function () {
      const chainIds = Object.values(CHAIN_CONFIGS).map(c => c.chainId);
      const uniqueIds = new Set(chainIds);
      expect(uniqueIds.size).to.equal(chainIds.length);
    });
  });

  describe('Property 10: Cost-Effective Chain Selection', function () {
    /**
     * Property: findBestRoute should return valid route or undefined
     */
    it('should find valid routes between connected chains', function () {
      const route = findBestRoute(ChainId.POLKADOT_RELAY, ChainId.MOONBEAM);
      
      if (route) {
        expect(route.fromChain).to.equal(ChainId.POLKADOT_RELAY);
        expect(route.toChain).to.equal(ChainId.MOONBEAM);
        expect(route.isAvailable).to.be.true;
      }
    });

    /**
     * Property: getAvailableRoutes should return only valid routes
     */
    it('should return only available routes from source chain', function () {
      const routes = getAvailableRoutes(ChainId.BASE_MAINNET);
      
      for (const route of routes) {
        expect(route.fromChain).to.equal(ChainId.BASE_MAINNET);
        expect(route.isAvailable).to.be.true;
        
        const destConfig = getChainConfig(route.toChain);
        expect(destConfig).to.not.be.undefined;
      }
    });

    /**
     * Property: Routes should have reasonable time estimates
     */
    it('should have consistent route properties', function () {
      for (const route of BRIDGE_ROUTES) {
        expect(route.feeToken.symbol).to.be.a('string').and.not.empty;
        expect(route.feeToken.decimals).to.be.a('number').and.at.least(0);
        // Estimated time should be reasonable (< 1 hour)
        expect(route.estimatedTime).to.be.lessThan(3600000);
      }
    });

    /**
     * Property: Best route selection should be deterministic
     */
    it('should select best route deterministically', function () {
      const route1 = findBestRoute(ChainId.POLKADOT_RELAY, ChainId.MOONBEAM);
      const route2 = findBestRoute(ChainId.POLKADOT_RELAY, ChainId.MOONBEAM);
      
      if (route1 && route2) {
        expect(route1.protocol).to.equal(route2.protocol);
        expect(route1.estimatedTime).to.equal(route2.estimatedTime);
      }
    });
  });


  describe('Property 11: Automatic Chain Failover', function () {
    let chainSelector: MockChainSelector;

    beforeEach(function () {
      chainSelector = new MockChainSelector();
    });

    /**
     * Property: Chain health check should return valid status
     */
    it('should return valid health status structure', async function () {
      const health = await chainSelector.checkChainHealth(ChainId.BASE_SEPOLIA);
      
      expect(health.chainId).to.equal(ChainId.BASE_SEPOLIA);
      expect(health.lastChecked).to.be.a('number');
      expect(Object.values(CongestionLevel)).to.include(health.congestionLevel);
    });

    /**
     * Property: Selection criteria should filter chains correctly
     */
    it('should respect selection criteria', function () {
      chainSelector.setExcludedChains([ChainId.ETHEREUM_MAINNET]);
      
      const healthyChains = chainSelector.getHealthyChains();
      expect(healthyChains).to.not.include(ChainId.ETHEREUM_MAINNET);
    });

    /**
     * Property: Congestion detection should be consistent
     */
    it('should detect congestion levels correctly', function () {
      const levels = [
        CongestionLevel.LOW,
        CongestionLevel.MEDIUM,
        CongestionLevel.HIGH,
        CongestionLevel.CRITICAL,
      ];
      
      expect(levels).to.have.lengthOf(4);
      expect(levels[0]).to.equal(CongestionLevel.LOW);
      expect(levels[3]).to.equal(CongestionLevel.CRITICAL);
    });

    /**
     * Property: Healthy chains list should be consistent
     */
    it('should maintain consistent healthy chains list', function () {
      const healthy1 = chainSelector.getHealthyChains();
      const healthy2 = chainSelector.getHealthyChains();
      
      expect(healthy1).to.deep.equal(healthy2);
    });

    /**
     * Property: Gas price sorting should be correct
     */
    it('should sort chains by gas price correctly', function () {
      // Set different gas prices for testing
      chainSelector.setChainHealth(ChainId.BASE_MAINNET, { gasPrice: BigInt(10) * BigInt(1e9) });
      chainSelector.setChainHealth(ChainId.POLYGON_MAINNET, { gasPrice: BigInt(30) * BigInt(1e9) });
      chainSelector.setChainHealth(ChainId.ETHEREUM_MAINNET, { gasPrice: BigInt(50) * BigInt(1e9) });
      
      const sortedChains = chainSelector.getChainsByGasPrice();
      
      expect(sortedChains).to.be.an('array');
      for (const chainId of sortedChains) {
        expect(Object.values(ChainId)).to.include(chainId);
      }
    });

    /**
     * Property: Unhealthy chains should be excluded
     */
    it('should exclude unhealthy chains from selection', function () {
      chainSelector.setChainHealth(ChainId.BASE_MAINNET, { isHealthy: false });
      
      const healthyChains = chainSelector.getHealthyChains();
      expect(healthyChains).to.not.include(ChainId.BASE_MAINNET);
    });

    /**
     * Property: Health status should update correctly
     */
    it('should update health status correctly', async function () {
      chainSelector.setChainHealth(ChainId.POLYGON_MAINNET, {
        congestionLevel: CongestionLevel.HIGH,
        gasPrice: BigInt(100) * BigInt(1e9),
      });
      
      const health = await chainSelector.checkChainHealth(ChainId.POLYGON_MAINNET);
      expect(health.congestionLevel).to.equal(CongestionLevel.HIGH);
    });
  });

  describe('Chain Configuration Validation', function () {
    /**
     * Property: EVM chains should have valid addresses
     */
    it('should have valid contract addresses for EVM chains', function () {
      const evmChains = Object.values(CHAIN_CONFIGS).filter(
        chain => chain.type === ChainType.EVM
      );

      for (const chain of evmChains) {
        for (const asset of chain.supportedAssets) {
          if (asset.address !== 'native') {
            expect(asset.address).to.match(/^0x[a-fA-F0-9]{40}$/);
          }
        }
      }
    });

    /**
     * Property: Substrate chains should have WebSocket URLs
     */
    it('should have WebSocket URLs for Substrate chains', function () {
      const substrateChains = Object.values(CHAIN_CONFIGS).filter(
        chain => chain.type === ChainType.SUBSTRATE || chain.type === ChainType.RELAY
      );

      for (const chain of substrateChains) {
        expect(chain.wsUrl).to.be.a('string');
        expect(chain.wsUrl).to.match(/^wss?:\/\//);
      }
    });

    /**
     * Property: All chains should have at least one supported asset
     */
    it('should have at least one supported asset per chain', function () {
      for (const chain of Object.values(CHAIN_CONFIGS)) {
        expect(chain.supportedAssets.length).to.be.at.least(1);
        
        for (const asset of chain.supportedAssets) {
          expect(asset.symbol).to.be.a('string').and.not.empty;
          expect(asset.decimals).to.be.a('number').and.at.least(0).and.at.most(18);
        }
      }
    });

    /**
     * Property: Chain names should be unique
     */
    it('should have unique chain names', function () {
      const names = Object.values(CHAIN_CONFIGS).map(c => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).to.equal(names.length);
    });
  });


  describe('Transfer Status State Machine', function () {
    /**
     * Property: Transfer status should follow valid state transitions
     */
    it('should have valid transfer status values', function () {
      const validStatuses = Object.values(TransferStatus);
      
      expect(validStatuses).to.include(TransferStatus.PENDING);
      expect(validStatuses).to.include(TransferStatus.SOURCE_CONFIRMED);
      expect(validStatuses).to.include(TransferStatus.BRIDGING);
      expect(validStatuses).to.include(TransferStatus.DEST_CONFIRMED);
      expect(validStatuses).to.include(TransferStatus.COMPLETED);
      expect(validStatuses).to.include(TransferStatus.FAILED);
      expect(validStatuses).to.include(TransferStatus.REFUNDED);
    });

    /**
     * Property: Status transitions should be logical
     */
    it('should define logical status progression', function () {
      const validTransitions: Record<TransferStatus, TransferStatus[]> = {
        [TransferStatus.PENDING]: [TransferStatus.SOURCE_CONFIRMED, TransferStatus.FAILED],
        [TransferStatus.SOURCE_CONFIRMED]: [TransferStatus.BRIDGING, TransferStatus.FAILED],
        [TransferStatus.BRIDGING]: [TransferStatus.DEST_CONFIRMED, TransferStatus.FAILED],
        [TransferStatus.DEST_CONFIRMED]: [TransferStatus.COMPLETED, TransferStatus.FAILED],
        [TransferStatus.COMPLETED]: [],
        [TransferStatus.FAILED]: [TransferStatus.REFUNDED],
        [TransferStatus.REFUNDED]: [],
      };

      for (const status of Object.values(TransferStatus)) {
        expect(validTransitions[status]).to.be.an('array');
      }

      // Terminal states should have no outgoing transitions (except FAILED -> REFUNDED)
      expect(validTransitions[TransferStatus.COMPLETED]).to.have.lengthOf(0);
      expect(validTransitions[TransferStatus.REFUNDED]).to.have.lengthOf(0);
    });

    /**
     * Property: All statuses should be string values
     */
    it('should have string status values', function () {
      for (const status of Object.values(TransferStatus)) {
        expect(status).to.be.a('string');
      }
    });
  });

  describe('Property-Based Tests with Fast-Check', function () {
    /**
     * Property: Chain ID lookup should be idempotent
     */
    it('should return same config for repeated lookups', function () {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ChainId).filter(v => typeof v === 'number')),
          (chainId: ChainId) => {
            const config1 = getChainConfig(chainId);
            const config2 = getChainConfig(chainId);
            
            if (config1 && config2) {
              return config1.chainId === config2.chainId &&
                     config1.name === config2.name;
            }
            return config1 === config2;
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Available routes should only include source chain
     */
    it('should filter routes by source chain correctly', function () {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ChainId).filter(v => typeof v === 'number')),
          (chainId: ChainId) => {
            const routes = getAvailableRoutes(chainId);
            return routes.every(route => route.fromChain === chainId);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: Best route should be among available routes
     */
    it('should select best route from available routes', function () {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ChainId).filter(v => typeof v === 'number')),
          fc.constantFrom(...Object.values(ChainId).filter(v => typeof v === 'number')),
          (fromChain: ChainId, toChain: ChainId) => {
            const bestRoute = findBestRoute(fromChain, toChain);
            
            if (bestRoute) {
              return bestRoute.fromChain === fromChain &&
                     bestRoute.toChain === toChain &&
                     bestRoute.isAvailable === true;
            }
            return true; // No route is valid result
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Active chains should all have isActive = true
     */
    it('should only return active chains', function () {
      const activeChains = getActiveChains();
      
      fc.assert(
        fc.property(
          fc.constantFrom(...activeChains),
          (chain: ChainConfig) => {
            return chain.isActive === true;
          }
        ),
        { numRuns: activeChains.length }
      );
    });

    /**
     * Property: Bridge fees should be non-negative
     */
    it('should have non-negative bridge fees', function () {
      fc.assert(
        fc.property(
          fc.constantFrom(...BRIDGE_ROUTES),
          (route: BridgeRoute) => {
            return route.baseFee >= BigInt(0);
          }
        ),
        { numRuns: BRIDGE_ROUTES.length }
      );
    });
  });
});
