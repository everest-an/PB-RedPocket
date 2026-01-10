/**
 * @fileoverview Identity Binding Service
 * @description Links social platform identities to AA wallets
 * @module lib/auth/identity-service
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AuthPlatform,
  PlatformUser,
  IdentityBinding,
  IdentityMergeRequest,
  AuthResult,
} from './types';
import { generateIdentityHash } from './crypto';

// ============================================================================
// Types
// ============================================================================

interface WalletInfo {
  address: string;
  chainId: number;
  isDeployed: boolean;
  salt: string;
}

// ============================================================================
// Mock Storage (Replace with actual DB in production)
// ============================================================================

const identityStore = new Map<string, IdentityBinding>();
const userWallets = new Map<string, WalletInfo>();
const mergeRequests = new Map<string, IdentityMergeRequest>();

// ============================================================================
// Identity Service
// ============================================================================

export class IdentityService {
  private factoryAddress: string;
  private defaultChainId: number;

  constructor(factoryAddress: string = '0x0000000000000000000000000000000000000000', defaultChainId: number = 8453) {
    this.factoryAddress = factoryAddress;
    this.defaultChainId = defaultChainId;
  }

  /**
   * Get or create identity binding for a platform user
   * Creates AA wallet address deterministically if new user
   * @param platformUser - Platform user info
   * @returns Auth result with wallet address
   */
  async getOrCreateIdentity(platformUser: PlatformUser): Promise<AuthResult> {
    const bindingKey = `${platformUser.platform}:${platformUser.platformId}`;
    
    // Check existing binding
    let binding = identityStore.get(bindingKey);
    let isNewUser = false;

    if (!binding) {
      // Create new identity binding
      isNewUser = true;
      const userId = uuidv4();
      const walletAddress = await this.computeWalletAddress(platformUser);

      binding = {
        userId,
        platform: platformUser.platform,
        platformId: platformUser.platformId,
        walletAddress,
        isPrimary: true,
        createdAt: new Date(),
      };

      identityStore.set(bindingKey, binding);

      // Store wallet info
      const salt = generateIdentityHash(platformUser.platform, platformUser.platformId);
      userWallets.set(userId, {
        address: walletAddress,
        chainId: this.defaultChainId,
        isDeployed: false,
        salt,
      });
    }

    return {
      success: true,
      user: platformUser,
      walletAddress: binding.walletAddress,
      isNewUser,
    };
  }

  /**
   * Compute deterministic AA wallet address using CREATE2
   * @param platformUser - Platform user info
   * @returns Computed wallet address
   */
  async computeWalletAddress(platformUser: PlatformUser): Promise<string> {
    // Generate deterministic salt from platform identity
    const salt = generateIdentityHash(platformUser.platform, platformUser.platformId);
    
    // In production, this would call the SimpleAccountFactory contract
    // to compute the counterfactual address using CREATE2
    // For now, we simulate with a deterministic hash
    const addressHash = generateIdentityHash(
      this.factoryAddress,
      salt
    );
    
    // Return checksummed address (first 40 hex chars)
    return '0x' + addressHash.slice(0, 40);
  }

  /**
   * Get identity binding by platform and ID
   * @param platform - Platform type
   * @param platformId - Platform user ID
   * @returns Identity binding or null
   */
  async getIdentity(platform: AuthPlatform, platformId: string): Promise<IdentityBinding | null> {
    const bindingKey = `${platform}:${platformId}`;
    return identityStore.get(bindingKey) || null;
  }

  /**
   * Get all identities linked to a user
   * @param userId - User ID
   * @returns Array of identity bindings
   */
  async getUserIdentities(userId: string): Promise<IdentityBinding[]> {
    const identities: IdentityBinding[] = [];
    for (const binding of identityStore.values()) {
      if (binding.userId === userId) {
        identities.push(binding);
      }
    }
    return identities;
  }

  /**
   * Link additional platform identity to existing user
   * @param userId - Existing user ID
   * @param platformUser - New platform identity
   * @returns Updated identity binding
   */
  async linkIdentity(userId: string, platformUser: PlatformUser): Promise<IdentityBinding> {
    const bindingKey = `${platformUser.platform}:${platformUser.platformId}`;
    
    // Check if this platform identity is already linked
    const existing = identityStore.get(bindingKey);
    if (existing) {
      if (existing.userId === userId) {
        return existing; // Already linked to this user
      }
      throw new Error('Platform identity already linked to another user');
    }

    // Get user's primary wallet
    const userIdentities = await this.getUserIdentities(userId);
    const primaryIdentity = userIdentities.find(i => i.isPrimary);
    if (!primaryIdentity) {
      throw new Error('User has no primary identity');
    }

    // Create new binding with same wallet address
    const binding: IdentityBinding = {
      userId,
      platform: platformUser.platform,
      platformId: platformUser.platformId,
      walletAddress: primaryIdentity.walletAddress,
      isPrimary: false,
      verifiedAt: new Date(),
      createdAt: new Date(),
    };

    identityStore.set(bindingKey, binding);
    return binding;
  }

  /**
   * Request to merge two user accounts
   * @param sourceUserId - User ID to merge from
   * @param targetUserId - User ID to merge into
   * @param sourcePlatform - Source platform
   * @param targetPlatform - Target platform
   * @returns Merge request
   */
  async requestMerge(
    sourceUserId: string,
    targetUserId: string,
    sourcePlatform: AuthPlatform,
    targetPlatform: AuthPlatform
  ): Promise<IdentityMergeRequest> {
    const request: IdentityMergeRequest = {
      sourceUserId,
      targetUserId,
      sourcePlatform,
      targetPlatform,
      status: 'pending',
      createdAt: new Date(),
    };

    const requestId = uuidv4();
    mergeRequests.set(requestId, request);
    return request;
  }

  /**
   * Complete account merge after verification
   * @param requestId - Merge request ID
   * @returns Whether merge was successful
   */
  async completeMerge(requestId: string): Promise<boolean> {
    const request = mergeRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    // Get source user's identities
    const sourceIdentities = await this.getUserIdentities(request.sourceUserId);
    
    // Get target user's primary wallet
    const targetIdentities = await this.getUserIdentities(request.targetUserId);
    const targetPrimary = targetIdentities.find(i => i.isPrimary);
    if (!targetPrimary) {
      return false;
    }

    // Transfer all source identities to target user
    for (const identity of sourceIdentities) {
      const bindingKey = `${identity.platform}:${identity.platformId}`;
      identity.userId = request.targetUserId;
      identity.walletAddress = targetPrimary.walletAddress;
      identity.isPrimary = false;
      identityStore.set(bindingKey, identity);
    }

    // Update request status
    request.status = 'completed';
    request.completedAt = new Date();
    mergeRequests.set(requestId, request);

    // TODO: Transfer on-chain assets from source wallet to target wallet

    return true;
  }

  /**
   * Get wallet info for a user
   * @param userId - User ID
   * @returns Wallet info or null
   */
  async getWalletInfo(userId: string): Promise<WalletInfo | null> {
    return userWallets.get(userId) || null;
  }

  /**
   * Mark wallet as deployed on-chain
   * @param userId - User ID
   * @param chainId - Chain where deployed
   */
  async markWalletDeployed(userId: string, chainId: number): Promise<void> {
    const wallet = userWallets.get(userId);
    if (wallet) {
      wallet.isDeployed = true;
      wallet.chainId = chainId;
      userWallets.set(userId, wallet);
    }
  }

  /**
   * Verify identity ownership (for security-sensitive operations)
   * @param userId - User ID
   * @param platform - Platform to verify
   * @param platformId - Platform user ID
   * @returns Whether identity is verified
   */
  async verifyIdentityOwnership(
    userId: string,
    platform: AuthPlatform,
    platformId: string
  ): Promise<boolean> {
    const binding = await this.getIdentity(platform, platformId);
    return binding !== null && binding.userId === userId;
  }
}

// Export singleton instance
export const identityService = new IdentityService();
