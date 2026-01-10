/**
 * @fileoverview XCM Module Exports
 * @description Central export point for cross-chain messaging functionality
 * @module lib/blockchain/xcm
 */

// Type definitions
export * from './types';

// Configuration
export * from './config';

// Bridge service
export { BridgeService, bridgeService } from './bridge-service';

// Chain selector and failover
export { ChainSelector, chainSelector, CongestionLevel } from './chain-selector';
export type { ChainHealth, SelectionCriteria, RetryConfig } from './chain-selector';
