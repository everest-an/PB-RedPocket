/**
 * @fileoverview Cross-Chain Bridge Service
 * @description Service for managing cross-chain transfers and XCM messaging
 * @module lib/blockchain/xcm/bridge-service
 */

import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { base, polygon, mainnet } from 'viem/chains';
import {
  ChainId,
  ChainType,
  CrossChainTransfer,
  TransferStatus,
  XCMMessage,
  CrossChainResult,
  GasEstimate,
  AssetId,
  BridgeRoute,
} from './types';
import { getChainConfig, findBestRoute, getAvailableRoutes, CHAIN_CONFIGS } from './config';

/**
 * Cross-chain bridge service for managing transfers between different blockchains
 * Supports both EVM chains (via LayerZero) and Polkadot ecosystem (via XCM)
 */
export class BridgeService {
  /** EVM public clients for reading chain state */
  private evmClients: Map<ChainId, PublicClient> = new Map();
  
  /** Pending transfers being tracked */
  private pendingTransfers: Map<string, CrossChainTransfer> = new Map();
  
  /** Transfer event listeners */
  private listeners: Map<string, ((transfer: CrossChainTransfer) => void)[]> = new Map();

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize blockchain clients for all supported chains
   * @private
   */
  private initializeClients(): void {
    // Initialize EVM clients
    const evmChains = [
      { chainId: ChainId.BASE_MAINNET, chain: base },
      { chainId: ChainId.BASE_SEPOLIA, chain: base },
      { chainId: ChainId.POLYGON_MAINNET, chain: polygon },
      { chainId: ChainId.ETHEREUM_MAINNET, chain: mainnet },
    ];

    for (const { chainId, chain } of evmChains) {
      const config = getChainConfig(chainId);
      if (config && config.isActive) {
        const client = createPublicClient({
          chain,
          transport: http(config.rpcUrl),
        });
        this.evmClients.set(chainId, client);
      }
    }
  }

  /**
   * Initiate a cross-chain transfer
   * @param fromChain - Source chain ID
   * @param toChain - Destination chain ID
   * @param asset - Asset to transfer
   * @param amount - Amount to transfer (in smallest unit)
   * @param sender - Sender address
   * @param recipient - Recipient address
   * @returns Transfer result with ID and status
   */
  async initiateTransfer(
    fromChain: ChainId,
    toChain: ChainId,
    asset: AssetId,
    amount: bigint,
    sender: string,
    recipient: string
  ): Promise<CrossChainResult> {
    try {
      // Validate chains are supported
      const sourceConfig = getChainConfig(fromChain);
      const destConfig = getChainConfig(toChain);
      
      if (!sourceConfig || !destConfig) {
        return { success: false, error: 'Unsupported chain' };
      }

      if (!sourceConfig.isActive || !destConfig.isActive) {
        return { success: false, error: 'Chain is currently inactive' };
      }

      // Find best route
      const route = findBestRoute(fromChain, toChain);
      if (!route) {
        return { success: false, error: 'No available route between chains' };
      }

      // Create transfer record
      const transferId = this.generateTransferId();
      const transfer: CrossChainTransfer = {
        id: transferId,
        fromChain,
        toChain,
        asset,
        amount,
        sender,
        recipient,
        status: TransferStatus.PENDING,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Store pending transfer
      this.pendingTransfers.set(transferId, transfer);

      // Execute transfer based on route protocol
      const result = await this.executeTransfer(transfer, route);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute the actual transfer based on bridge protocol
   * @private
   */
  private async executeTransfer(
    transfer: CrossChainTransfer,
    route: BridgeRoute
  ): Promise<CrossChainResult> {
    const sourceConfig = getChainConfig(transfer.fromChain);
    const destConfig = getChainConfig(transfer.toChain);

    if (!sourceConfig || !destConfig) {
      return { success: false, error: 'Invalid chain configuration' };
    }

    // Update transfer status
    transfer.status = TransferStatus.BRIDGING;
    transfer.updatedAt = Date.now();
    this.notifyListeners(transfer);

    // For now, return a simulated successful result
    // In production, this would interact with actual bridge contracts
    return {
      success: true,
      transferId: transfer.id,
      estimatedCompletionTime: Date.now() + route.estimatedTime,
    };
  }

  /**
   * Get transfer status by ID
   * @param transferId - The transfer ID to query
   * @returns Transfer details or undefined if not found
   */
  getTransferStatus(transferId: string): CrossChainTransfer | undefined {
    return this.pendingTransfers.get(transferId);
  }

  /**
   * Get all pending transfers for a user
   * @param userAddress - User's wallet address
   * @returns Array of pending transfers
   */
  getPendingTransfers(userAddress: string): CrossChainTransfer[] {
    return Array.from(this.pendingTransfers.values()).filter(
      transfer => 
        transfer.sender.toLowerCase() === userAddress.toLowerCase() ||
        transfer.recipient.toLowerCase() === userAddress.toLowerCase()
    );
  }

  /**
   * Estimate gas cost for a cross-chain transfer
   * @param fromChain - Source chain ID
   * @param toChain - Destination chain ID
   * @param asset - Asset to transfer
   * @param amount - Amount to transfer
   * @returns Gas estimate with costs
   */
  async estimateGas(
    fromChain: ChainId,
    toChain: ChainId,
    asset: AssetId,
    amount: bigint
  ): Promise<GasEstimate> {
    const route = findBestRoute(fromChain, toChain);
    const sourceConfig = getChainConfig(fromChain);

    if (!route || !sourceConfig) {
      return {
        gasLimit: BigInt(0),
        gasPrice: BigInt(0),
        totalCost: BigInt(0),
        costUsd: 0,
      };
    }

    // Get current gas price from source chain
    let gasPrice = BigInt(0);
    if (sourceConfig.type === ChainType.EVM) {
      const client = this.evmClients.get(fromChain);
      if (client) {
        try {
          gasPrice = await client.getGasPrice();
        } catch {
          gasPrice = BigInt(20000000000); // Default 20 gwei
        }
      }
    }

    // Estimate gas limit based on operation type
    const gasLimit = BigInt(200000); // Typical cross-chain transfer gas
    const totalCost = gasLimit * gasPrice + route.baseFee;

    // Approximate USD cost (would need price oracle in production)
    const costUsd = Number(totalCost) / 1e18 * 2000; // Assuming $2000/ETH

    return {
      gasLimit,
      gasPrice,
      totalCost,
      costUsd,
    };
  }

  /**
   * Get available routes from a source chain
   * @param fromChain - Source chain ID
   * @returns Array of available bridge routes
   */
  getAvailableRoutes(fromChain: ChainId): BridgeRoute[] {
    return getAvailableRoutes(fromChain);
  }

  /**
   * Find the optimal chain for a transaction based on current gas costs
   * @param chains - Array of chain IDs to compare
   * @returns Chain ID with lowest estimated cost
   */
  async findOptimalChain(chains: ChainId[]): Promise<ChainId | null> {
    let lowestCost = BigInt(Number.MAX_SAFE_INTEGER);
    let optimalChain: ChainId | null = null;

    for (const chainId of chains) {
      const config = getChainConfig(chainId);
      if (!config || !config.isActive || config.type !== ChainType.EVM) {
        continue;
      }

      const client = this.evmClients.get(chainId);
      if (!client) continue;

      try {
        const gasPrice = await client.getGasPrice();
        // Normalize cost based on typical transaction gas
        const estimatedCost = gasPrice * BigInt(21000);
        
        if (estimatedCost < lowestCost) {
          lowestCost = estimatedCost;
          optimalChain = chainId;
        }
      } catch {
        // Skip chains with RPC errors
        continue;
      }
    }

    return optimalChain;
  }

  /**
   * Subscribe to transfer status updates
   * @param transferId - Transfer ID to watch
   * @param callback - Callback function for status updates
   */
  subscribeToTransfer(
    transferId: string,
    callback: (transfer: CrossChainTransfer) => void
  ): void {
    const listeners = this.listeners.get(transferId) || [];
    listeners.push(callback);
    this.listeners.set(transferId, listeners);
  }

  /**
   * Unsubscribe from transfer updates
   * @param transferId - Transfer ID to stop watching
   * @param callback - Callback function to remove
   */
  unsubscribeFromTransfer(
    transferId: string,
    callback: (transfer: CrossChainTransfer) => void
  ): void {
    const listeners = this.listeners.get(transferId) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      this.listeners.set(transferId, listeners);
    }
  }

  /**
   * Notify all listeners of a transfer update
   * @private
   */
  private notifyListeners(transfer: CrossChainTransfer): void {
    const listeners = this.listeners.get(transfer.id) || [];
    for (const callback of listeners) {
      try {
        callback(transfer);
      } catch (error) {
        console.error('Error in transfer listener:', error);
      }
    }
  }

  /**
   * Generate a unique transfer ID
   * @private
   */
  private generateTransferId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `xfer_${timestamp}_${random}`;
  }

  /**
   * Check if a chain supports a specific asset
   * @param chainId - Chain to check
   * @param assetSymbol - Asset symbol to look for
   * @returns Whether the asset is supported
   */
  isAssetSupported(chainId: ChainId, assetSymbol: string): boolean {
    const config = getChainConfig(chainId);
    if (!config) return false;
    
    return config.supportedAssets.some(
      asset => asset.symbol.toLowerCase() === assetSymbol.toLowerCase()
    );
  }

  /**
   * Get asset details on a specific chain
   * @param chainId - Chain to query
   * @param assetSymbol - Asset symbol
   * @returns Asset details or undefined
   */
  getAssetOnChain(chainId: ChainId, assetSymbol: string): AssetId | undefined {
    const config = getChainConfig(chainId);
    if (!config) return undefined;
    
    return config.supportedAssets.find(
      asset => asset.symbol.toLowerCase() === assetSymbol.toLowerCase()
    );
  }
}

// Export singleton instance
export const bridgeService = new BridgeService();
