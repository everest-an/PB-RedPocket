/**
 * @fileoverview Chain Selection and Failover Service
 * @description Intelligent chain selection based on cost, congestion, and availability
 * @module lib/blockchain/xcm/chain-selector
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { base, polygon, mainnet } from 'viem/chains';
import { ChainId, ChainType, ChainConfig, GasEstimate } from './types';
import { getChainConfig, getActiveChains, CHAIN_CONFIGS } from './config';

/**
 * Chain health status
 */
export interface ChainHealth {
  chainId: ChainId;
  isHealthy: boolean;
  latency: number;
  blockHeight: bigint;
  gasPrice: bigint;
  congestionLevel: CongestionLevel;
  lastChecked: number;
}

/**
 * Congestion level classification
 */
export enum CongestionLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Chain selection criteria
 */
export interface SelectionCriteria {
  /** Prefer lowest gas cost */
  preferLowCost: boolean;
  /** Prefer fastest finality */
  preferFastFinality: boolean;
  /** Maximum acceptable gas price (in gwei) */
  maxGasPrice?: bigint;
  /** Required asset support */
  requiredAsset?: string;
  /** Exclude specific chains */
  excludeChains?: ChainId[];
}

/**
 * Retry configuration for failover
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay between retries (ms) */
  initialDelay: number;
  /** Maximum delay between retries (ms) */
  maxDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Gas price thresholds for congestion detection (in gwei)
 */
const CONGESTION_THRESHOLDS = {
  [CongestionLevel.LOW]: BigInt(20) * BigInt(1e9),
  [CongestionLevel.MEDIUM]: BigInt(50) * BigInt(1e9),
  [CongestionLevel.HIGH]: BigInt(100) * BigInt(1e9),
  [CongestionLevel.CRITICAL]: BigInt(200) * BigInt(1e9),
};

/**
 * Chain selector service for intelligent routing and failover
 */
export class ChainSelector {
  /** EVM clients for health checks */
  private clients: Map<ChainId, PublicClient> = new Map();
  
  /** Cached chain health data */
  private healthCache: Map<ChainId, ChainHealth> = new Map();
  
  /** Health check interval (ms) */
  private healthCheckInterval: number = 30000;
  
  /** Health check timer */
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize blockchain clients
   * @private
   */
  private initializeClients(): void {
    const evmChainConfigs = [
      { chainId: ChainId.BASE_MAINNET, chain: base },
      { chainId: ChainId.BASE_SEPOLIA, chain: base },
      { chainId: ChainId.POLYGON_MAINNET, chain: polygon },
      { chainId: ChainId.POLYGON_MUMBAI, chain: polygon },
      { chainId: ChainId.ETHEREUM_MAINNET, chain: mainnet },
      { chainId: ChainId.ETHEREUM_SEPOLIA, chain: mainnet },
    ];

    for (const { chainId, chain } of evmChainConfigs) {
      const config = getChainConfig(chainId);
      if (config && config.isActive) {
        try {
          const client = createPublicClient({
            chain,
            transport: http(config.rpcUrl),
          });
          this.clients.set(chainId, client);
        } catch (error) {
          console.error(`Failed to initialize client for chain ${chainId}:`, error);
        }
      }
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    // Run initial health check
    this.checkAllChains();
    
    // Schedule periodic checks
    this.healthCheckTimer = setInterval(() => {
      this.checkAllChains();
    }, this.healthCheckInterval);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Check health of all chains
   * @private
   */
  private async checkAllChains(): Promise<void> {
    const chains = Array.from(this.clients.keys());
    await Promise.all(chains.map(chainId => this.checkChainHealth(chainId)));
  }

  /**
   * Check health of a specific chain
   * @param chainId - Chain to check
   * @returns Chain health status
   */
  async checkChainHealth(chainId: ChainId): Promise<ChainHealth> {
    const client = this.clients.get(chainId);
    const config = getChainConfig(chainId);

    if (!client || !config) {
      const unhealthyStatus: ChainHealth = {
        chainId,
        isHealthy: false,
        latency: -1,
        blockHeight: BigInt(0),
        gasPrice: BigInt(0),
        congestionLevel: CongestionLevel.CRITICAL,
        lastChecked: Date.now(),
      };
      this.healthCache.set(chainId, unhealthyStatus);
      return unhealthyStatus;
    }

    const startTime = Date.now();
    
    try {
      // Fetch block number and gas price concurrently
      const [blockNumber, gasPrice] = await Promise.all([
        client.getBlockNumber(),
        client.getGasPrice(),
      ]);

      const latency = Date.now() - startTime;
      const congestionLevel = this.calculateCongestionLevel(gasPrice);

      const health: ChainHealth = {
        chainId,
        isHealthy: true,
        latency,
        blockHeight: blockNumber,
        gasPrice,
        congestionLevel,
        lastChecked: Date.now(),
      };

      this.healthCache.set(chainId, health);
      return health;
    } catch (error) {
      const unhealthyStatus: ChainHealth = {
        chainId,
        isHealthy: false,
        latency: Date.now() - startTime,
        blockHeight: BigInt(0),
        gasPrice: BigInt(0),
        congestionLevel: CongestionLevel.CRITICAL,
        lastChecked: Date.now(),
      };
      this.healthCache.set(chainId, unhealthyStatus);
      return unhealthyStatus;
    }
  }

  /**
   * Calculate congestion level based on gas price
   * @private
   */
  private calculateCongestionLevel(gasPrice: bigint): CongestionLevel {
    if (gasPrice >= CONGESTION_THRESHOLDS[CongestionLevel.CRITICAL]) {
      return CongestionLevel.CRITICAL;
    }
    if (gasPrice >= CONGESTION_THRESHOLDS[CongestionLevel.HIGH]) {
      return CongestionLevel.HIGH;
    }
    if (gasPrice >= CONGESTION_THRESHOLDS[CongestionLevel.MEDIUM]) {
      return CongestionLevel.MEDIUM;
    }
    return CongestionLevel.LOW;
  }

  /**
   * Select the optimal chain based on criteria
   * @param criteria - Selection criteria
   * @returns Best chain ID or null if none available
   */
  async selectOptimalChain(criteria: SelectionCriteria): Promise<ChainId | null> {
    const candidates = await this.getCandidateChains(criteria);
    
    if (candidates.length === 0) {
      return null;
    }

    // Score each candidate
    const scoredChains = candidates.map(health => ({
      health,
      score: this.calculateChainScore(health, criteria),
    }));

    // Sort by score (higher is better)
    scoredChains.sort((a, b) => b.score - a.score);

    return scoredChains[0].health.chainId;
  }

  /**
   * Get candidate chains that meet criteria
   * @private
   */
  private async getCandidateChains(criteria: SelectionCriteria): Promise<ChainHealth[]> {
    const candidates: ChainHealth[] = [];
    
    for (const [chainId, health] of this.healthCache) {
      // Skip unhealthy chains
      if (!health.isHealthy) continue;
      
      // Skip excluded chains
      if (criteria.excludeChains?.includes(chainId)) continue;
      
      // Check max gas price
      if (criteria.maxGasPrice && health.gasPrice > criteria.maxGasPrice) continue;
      
      // Check required asset support
      if (criteria.requiredAsset) {
        const config = getChainConfig(chainId);
        const hasAsset = config?.supportedAssets.some(
          asset => asset.symbol.toLowerCase() === criteria.requiredAsset!.toLowerCase()
        );
        if (!hasAsset) continue;
      }
      
      candidates.push(health);
    }
    
    return candidates;
  }

  /**
   * Calculate score for a chain based on criteria
   * @private
   */
  private calculateChainScore(health: ChainHealth, criteria: SelectionCriteria): number {
    let score = 100;
    const config = getChainConfig(health.chainId);
    
    if (!config) return 0;

    // Penalize based on congestion
    switch (health.congestionLevel) {
      case CongestionLevel.LOW:
        score += 20;
        break;
      case CongestionLevel.MEDIUM:
        score += 10;
        break;
      case CongestionLevel.HIGH:
        score -= 10;
        break;
      case CongestionLevel.CRITICAL:
        score -= 30;
        break;
    }

    // Adjust for cost preference
    if (criteria.preferLowCost) {
      // Lower gas price = higher score
      const gasPriceGwei = Number(health.gasPrice / BigInt(1e9));
      score += Math.max(0, 50 - gasPriceGwei);
    }

    // Adjust for finality preference
    if (criteria.preferFastFinality) {
      // Faster finality = higher score
      const finalitySeconds = config.finalityTime / 1000;
      score += Math.max(0, 30 - finalitySeconds / 10);
    }

    // Penalize high latency
    if (health.latency > 1000) {
      score -= Math.min(20, (health.latency - 1000) / 100);
    }

    return score;
  }

  /**
   * Execute operation with automatic failover
   * @param operation - Async operation to execute
   * @param chainIds - Ordered list of chains to try
   * @param retryConfig - Retry configuration
   * @returns Operation result
   */
  async executeWithFailover<T>(
    operation: (chainId: ChainId) => Promise<T>,
    chainIds: ChainId[],
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<{ result: T; chainId: ChainId } | null> {
    for (const chainId of chainIds) {
      const health = this.healthCache.get(chainId);
      
      // Skip unhealthy chains
      if (health && !health.isHealthy) {
        continue;
      }

      // Try operation with retries
      const result = await this.executeWithRetry(
        () => operation(chainId),
        retryConfig
      );

      if (result !== null) {
        return { result, chainId };
      }

      // Mark chain as unhealthy after failure
      if (health) {
        health.isHealthy = false;
        health.lastChecked = Date.now();
      }
    }

    return null;
  }

  /**
   * Execute operation with exponential backoff retry
   * @private
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T | null> {
    let lastError: Error | null = null;
    let delay = config.initialDelay;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < config.maxRetries) {
          await this.sleep(delay);
          delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
        }
      }
    }

    console.error('Operation failed after retries:', lastError);
    return null;
  }

  /**
   * Sleep utility
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cached health for a chain
   * @param chainId - Chain to query
   * @returns Cached health or undefined
   */
  getChainHealth(chainId: ChainId): ChainHealth | undefined {
    return this.healthCache.get(chainId);
  }

  /**
   * Get all healthy chains
   * @returns Array of healthy chain IDs
   */
  getHealthyChains(): ChainId[] {
    return Array.from(this.healthCache.entries())
      .filter(([_, health]) => health.isHealthy)
      .map(([chainId, _]) => chainId);
  }

  /**
   * Get chains sorted by gas price (lowest first)
   * @returns Sorted array of chain IDs
   */
  getChainsByGasPrice(): ChainId[] {
    return Array.from(this.healthCache.entries())
      .filter(([_, health]) => health.isHealthy)
      .sort((a, b) => Number(a[1].gasPrice - b[1].gasPrice))
      .map(([chainId, _]) => chainId);
  }

  /**
   * Check if a chain is congested
   * @param chainId - Chain to check
   * @returns Whether chain is congested (HIGH or CRITICAL)
   */
  isChainCongested(chainId: ChainId): boolean {
    const health = this.healthCache.get(chainId);
    if (!health) return true;
    
    return health.congestionLevel === CongestionLevel.HIGH ||
           health.congestionLevel === CongestionLevel.CRITICAL;
  }
}

// Export singleton instance
export const chainSelector = new ChainSelector();
