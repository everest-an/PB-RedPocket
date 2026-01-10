/**
 * @fileoverview XCM (Cross-Consensus Message) Type Definitions
 * @description Type definitions for cross-chain messaging in Polkadot ecosystem
 * @module lib/blockchain/xcm/types
 */

/**
 * Supported blockchain networks for cross-chain operations
 */
export enum ChainId {
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

/**
 * Chain type classification
 */
export enum ChainType {
  EVM = 'evm',
  SUBSTRATE = 'substrate',
  RELAY = 'relay',
}

/**
 * Asset identifier for cross-chain transfers
 */
export interface AssetId {
  /** Chain where the asset originates */
  originChain: ChainId;
  /** Token contract address (for EVM) or asset ID (for Substrate) */
  address: string;
  /** Human-readable symbol */
  symbol: string;
  /** Decimal places */
  decimals: number;
}

/**
 * Cross-chain transfer request
 */
export interface CrossChainTransfer {
  /** Unique transfer ID */
  id: string;
  /** Source chain */
  fromChain: ChainId;
  /** Destination chain */
  toChain: ChainId;
  /** Asset being transferred */
  asset: AssetId;
  /** Transfer amount (in smallest unit) */
  amount: bigint;
  /** Sender address */
  sender: string;
  /** Recipient address */
  recipient: string;
  /** Transfer status */
  status: TransferStatus;
  /** Source chain transaction hash */
  sourceTxHash?: string;
  /** Destination chain transaction hash */
  destTxHash?: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Transfer status enumeration
 */
export enum TransferStatus {
  PENDING = 'pending',
  SOURCE_CONFIRMED = 'source_confirmed',
  BRIDGING = 'bridging',
  DEST_CONFIRMED = 'dest_confirmed',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * XCM message structure for Polkadot ecosystem
 */
export interface XCMMessage {
  /** Message version */
  version: number;
  /** Destination parachain ID */
  destParaId: number;
  /** Beneficiary account */
  beneficiary: string;
  /** Assets to transfer */
  assets: XCMAsset[];
  /** Fee payment asset */
  feeAsset: XCMAsset;
  /** Weight limit for execution */
  weightLimit: bigint;
}

/**
 * XCM asset representation
 */
export interface XCMAsset {
  /** Asset location (MultiLocation) */
  location: MultiLocation;
  /** Amount in smallest unit */
  amount: bigint;
}

/**
 * MultiLocation for XCM asset addressing
 */
export interface MultiLocation {
  /** Number of parent hops */
  parents: number;
  /** Interior junctions */
  interior: Junction[];
}

/**
 * Junction types for MultiLocation
 */
export type Junction =
  | { type: 'Parachain'; id: number }
  | { type: 'AccountId32'; id: string }
  | { type: 'AccountKey20'; key: string }
  | { type: 'PalletInstance'; index: number }
  | { type: 'GeneralIndex'; index: bigint }
  | { type: 'GeneralKey'; key: string };

/**
 * Chain configuration for cross-chain operations
 */
export interface ChainConfig {
  /** Chain identifier */
  chainId: ChainId;
  /** Chain type */
  type: ChainType;
  /** Human-readable name */
  name: string;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** WebSocket endpoint (for Substrate chains) */
  wsUrl?: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** Native token symbol */
  nativeToken: string;
  /** Native token decimals */
  nativeDecimals: number;
  /** Supported assets on this chain */
  supportedAssets: AssetId[];
  /** Bridge contract address (for EVM chains) */
  bridgeContract?: string;
  /** Whether chain is currently active */
  isActive: boolean;
  /** Average block time in milliseconds */
  blockTime: number;
  /** Estimated finality time in milliseconds */
  finalityTime: number;
}

/**
 * Bridge route between two chains
 */
export interface BridgeRoute {
  /** Source chain */
  fromChain: ChainId;
  /** Destination chain */
  toChain: ChainId;
  /** Bridge protocol used */
  protocol: BridgeProtocol;
  /** Estimated transfer time in milliseconds */
  estimatedTime: number;
  /** Base fee for the route */
  baseFee: bigint;
  /** Fee token */
  feeToken: AssetId;
  /** Whether route is currently available */
  isAvailable: boolean;
}

/**
 * Supported bridge protocols
 */
export enum BridgeProtocol {
  XCM = 'xcm',
  LAYER_ZERO = 'layerzero',
  WORMHOLE = 'wormhole',
  NATIVE = 'native',
}

/**
 * Gas estimation result
 */
export interface GasEstimate {
  /** Estimated gas units */
  gasLimit: bigint;
  /** Gas price in native token */
  gasPrice: bigint;
  /** Total estimated cost */
  totalCost: bigint;
  /** Cost in USD (approximate) */
  costUsd: number;
}

/**
 * Cross-chain operation result
 */
export interface CrossChainResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Transfer ID if successful */
  transferId?: string;
  /** Transaction hash on source chain */
  txHash?: string;
  /** Error message if failed */
  error?: string;
  /** Estimated completion time */
  estimatedCompletionTime?: number;
}
