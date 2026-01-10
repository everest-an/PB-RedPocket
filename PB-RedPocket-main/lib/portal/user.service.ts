/**
 * @fileoverview User Portal Service
 * @description User profile, identity linking, and reward aggregation
 * @module lib/portal/user
 */

import {
  SocialIdentity,
  UserProfile,
  RewardSummary,
  RewardByToken,
  RewardByPlatform,
  ClaimHistory,
  UserDashboard,
  MergeRequest,
  MergeResult,
} from './types';

// ============================================================================
// Mock Data Store (Replace with actual DB in production)
// ============================================================================

interface UserStore {
  users: Map<string, UserProfile>;
  claims: Map<string, ClaimHistory[]>;
  mergeRequests: Map<string, MergeRequest>;
}

const store: UserStore = {
  users: new Map(),
  claims: new Map(),
  mergeRequests: new Map(),
};

// ============================================================================
// User Service
// ============================================================================

export class UserService {
  /**
   * Get or create user by social identity
   * @param identity - Social identity
   * @returns User profile
   */
  async getOrCreateUser(identity: Omit<SocialIdentity, 'linkedAt' | 'verified'>): Promise<UserProfile> {
    // Check if user exists with this identity
    const existingUser = this.findUserByIdentity(identity.platform, identity.platformId);
    if (existingUser) {
      return existingUser;
    }

    // Create new user
    const userId = this.generateUserId();
    const fullIdentity: SocialIdentity = {
      ...identity,
      linkedAt: new Date(),
      verified: true,
    };

    const user: UserProfile = {
      userId,
      primaryIdentity: fullIdentity,
      linkedIdentities: [fullIdentity],
      createdAt: new Date(),
      lastActiveAt: new Date(),
    };

    store.users.set(userId, user);
    store.claims.set(userId, []);

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile | null> {
    return store.users.get(userId) || null;
  }

  /**
   * Find user by social identity
   */
  findUserByIdentity(platform: string, platformId: string): UserProfile | null {
    for (const user of store.users.values()) {
      if (user.linkedIdentities.some(
        i => i.platform === platform && i.platformId === platformId
      )) {
        return user;
      }
    }
    return null;
  }


  /**
   * Link additional social identity to user
   * @param userId - User ID
   * @param identity - New social identity to link
   * @returns Updated user profile
   */
  async linkIdentity(
    userId: string,
    identity: Omit<SocialIdentity, 'linkedAt' | 'verified'>
  ): Promise<UserProfile> {
    const user = store.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if identity is already linked to another user
    const existingUser = this.findUserByIdentity(identity.platform, identity.platformId);
    if (existingUser && existingUser.userId !== userId) {
      throw new Error('Identity already linked to another account');
    }

    // Check if already linked to this user
    if (user.linkedIdentities.some(
      i => i.platform === identity.platform && i.platformId === identity.platformId
    )) {
      return user;
    }

    const fullIdentity: SocialIdentity = {
      ...identity,
      linkedAt: new Date(),
      verified: true,
    };

    user.linkedIdentities.push(fullIdentity);
    user.lastActiveAt = new Date();

    return user;
  }

  /**
   * Set user's Web3 wallet address
   */
  async setWalletAddress(userId: string, walletAddress: string): Promise<UserProfile> {
    const user = store.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.walletAddress = walletAddress;
    user.lastActiveAt = new Date();

    return user;
  }

  /**
   * Set user's AA wallet address
   */
  async setAAWalletAddress(userId: string, aaWalletAddress: string): Promise<UserProfile> {
    const user = store.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.aaWalletAddress = aaWalletAddress;
    user.lastActiveAt = new Date();

    return user;
  }

  /**
   * Get user dashboard with aggregated data
   */
  async getDashboard(userId: string): Promise<UserDashboard> {
    const user = store.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const claims = store.claims.get(userId) || [];
    const rewardSummary = this.calculateRewardSummary(claims);
    const rewardsByToken = this.aggregateByToken(claims);
    const rewardsByPlatform = this.aggregateByPlatform(claims);

    return {
      profile: user,
      rewardSummary,
      rewardsByToken,
      rewardsByPlatform,
      recentClaims: claims.slice(-10).reverse(),
      pendingWithdrawals: [], // TODO: Fetch from withdrawal service
    };
  }

  /**
   * Record a claim for user
   */
  async recordClaim(userId: string, claim: Omit<ClaimHistory, 'id'>): Promise<ClaimHistory> {
    const user = store.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const fullClaim: ClaimHistory = {
      ...claim,
      id: this.generateClaimId(),
    };

    const claims = store.claims.get(userId) || [];
    claims.push(fullClaim);
    store.claims.set(userId, claims);

    user.lastActiveAt = new Date();

    return fullClaim;
  }

  /**
   * Get claim history for user
   */
  async getClaimHistory(
    userId: string,
    options?: { limit?: number; offset?: number; platform?: string }
  ): Promise<{ claims: ClaimHistory[]; total: number }> {
    let claims = store.claims.get(userId) || [];

    if (options?.platform) {
      claims = claims.filter(c => c.platform === options.platform);
    }

    const total = claims.length;

    // Sort by date descending
    claims = claims.sort((a, b) => b.claimedAt.getTime() - a.claimedAt.getTime());

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    claims = claims.slice(offset, offset + limit);

    return { claims, total };
  }


  // ==========================================================================
  // Account Merging
  // ==========================================================================

  /**
   * Request to merge two accounts
   * @param sourceUserId - Account to merge from
   * @param targetUserId - Account to merge into
   * @returns Merge request
   */
  async requestMerge(sourceUserId: string, targetUserId: string): Promise<MergeRequest> {
    const sourceUser = store.users.get(sourceUserId);
    const targetUser = store.users.get(targetUserId);

    if (!sourceUser || !targetUser) {
      throw new Error('One or both users not found');
    }

    if (sourceUserId === targetUserId) {
      throw new Error('Cannot merge account with itself');
    }

    const request: MergeRequest = {
      id: this.generateMergeId(),
      sourceUserId,
      targetUserId,
      sourceIdentity: sourceUser.primaryIdentity,
      targetIdentity: targetUser.primaryIdentity,
      status: 'pending',
      verificationCode: this.generateVerificationCode(),
      createdAt: new Date(),
    };

    store.mergeRequests.set(request.id, request);

    return request;
  }

  /**
   * Complete account merge
   * @param mergeRequestId - Merge request ID
   * @param verificationCode - Verification code
   * @returns Merge result
   */
  async completeMerge(mergeRequestId: string, verificationCode: string): Promise<MergeResult> {
    const request = store.mergeRequests.get(mergeRequestId);
    if (!request) {
      throw new Error('Merge request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Merge request is not pending');
    }

    if (request.verificationCode !== verificationCode) {
      throw new Error('Invalid verification code');
    }

    const sourceUser = store.users.get(request.sourceUserId);
    const targetUser = store.users.get(request.targetUserId);

    if (!sourceUser || !targetUser) {
      throw new Error('One or both users no longer exist');
    }

    // Merge identities
    for (const identity of sourceUser.linkedIdentities) {
      if (!targetUser.linkedIdentities.some(
        i => i.platform === identity.platform && i.platformId === identity.platformId
      )) {
        targetUser.linkedIdentities.push(identity);
      }
    }

    // Merge claims
    const sourceClaims = store.claims.get(request.sourceUserId) || [];
    const targetClaims = store.claims.get(request.targetUserId) || [];
    store.claims.set(request.targetUserId, [...targetClaims, ...sourceClaims]);

    // Calculate total balance
    const allClaims = store.claims.get(request.targetUserId) || [];
    const totalBalance = allClaims
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + c.amount, 0);

    // Delete source user
    store.users.delete(request.sourceUserId);
    store.claims.delete(request.sourceUserId);

    // Update merge request
    request.status = 'completed';
    request.completedAt = new Date();

    return {
      success: true,
      mergedUserId: request.targetUserId,
      totalIdentities: targetUser.linkedIdentities.length,
      totalBalance,
      message: 'Accounts merged successfully',
    };
  }

  // ==========================================================================
  // Reward Aggregation Helpers
  // ==========================================================================

  private calculateRewardSummary(claims: ClaimHistory[]): RewardSummary {
    const confirmed = claims.filter(c => c.status === 'confirmed');
    const pending = claims.filter(c => c.status === 'pending');

    const totalClaimed = confirmed.reduce((sum, c) => sum + c.amount, 0);
    const totalPending = pending.reduce((sum, c) => sum + c.amount, 0);
    const totalWithdrawn = 0; // TODO: Get from withdrawal service

    return {
      totalClaimed,
      totalPending,
      totalWithdrawn,
      availableBalance: totalClaimed - totalWithdrawn,
      currency: 'USD',
    };
  }

  private aggregateByToken(claims: ClaimHistory[]): RewardByToken[] {
    const tokenMap = new Map<string, RewardByToken>();

    for (const claim of claims) {
      const existing = tokenMap.get(claim.tokenSymbol) || {
        tokenSymbol: claim.tokenSymbol,
        tokenAddress: '0x0', // TODO: Get from token registry
        chainId: 1,
        claimed: 0,
        pending: 0,
        withdrawn: 0,
        available: 0,
      };

      if (claim.status === 'confirmed') {
        existing.claimed += claim.amount;
        existing.available += claim.amount;
      } else if (claim.status === 'pending') {
        existing.pending += claim.amount;
      }

      tokenMap.set(claim.tokenSymbol, existing);
    }

    return Array.from(tokenMap.values());
  }

  private aggregateByPlatform(claims: ClaimHistory[]): RewardByPlatform[] {
    const platformMap = new Map<string, RewardByPlatform>();

    for (const claim of claims) {
      if (claim.status !== 'confirmed') continue;

      const existing = platformMap.get(claim.platform) || {
        platform: claim.platform,
        totalClaimed: 0,
        claimCount: 0,
      };

      existing.totalClaimed += claim.amount;
      existing.claimCount += 1;
      existing.lastClaimAt = claim.claimedAt;

      platformMap.set(claim.platform, existing);
    }

    return Array.from(platformMap.values());
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateClaimId(): string {
    return `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMergeId(): string {
    return `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  /**
   * Clear store (for testing only)
   */
  clearStore(): void {
    store.users.clear();
    store.claims.clear();
    store.mergeRequests.clear();
  }
}

// Export singleton instance
export const userService = new UserService();
