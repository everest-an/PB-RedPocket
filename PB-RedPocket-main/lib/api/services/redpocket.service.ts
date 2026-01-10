/**
 * @fileoverview RedPocket Service
 * @description Business logic for RedPocket operations
 * @module lib/api/services/redpocket
 */

import { v4 as uuidv4 } from 'uuid';
import {
  redpocketRepository,
  claimRepository,
  userRepository,
  cache,
  RedPocketEntity,
  ClaimEntity,
  RedPocketStatus,
  ClaimStatus,
  Platform,
} from '../../db';

// ============================================================================
// Types
// ============================================================================

export interface CreateRedPocketInput {
  campaignId: string;
  enterpriseId: string;
  senderName: string;
  senderAvatar?: string;
  totalAmount: number;
  tokenSymbol: string;
  tokenAddress: string;
  chainId: number;
  platform: Platform;
  platformChannelId?: string;
  message?: string;
  tag?: string;
  totalCount: number;
  isLuckyDraw: boolean;
  minAmount?: number;
  maxAmount?: number;
  expiresIn: number; // seconds
}

export interface ClaimRedPocketInput {
  redpocketId: string;
  platform: Platform;
  platformId: string;
  displayName?: string;
}

export interface ClaimResult {
  success: boolean;
  claimedAmount?: number;
  walletAddress?: string;
  txHash?: string;
  error?: string;
}

// ============================================================================
// RedPocket Service
// ============================================================================

export class RedPocketService {
  /**
   * Create a new RedPocket
   * @param input - Creation input
   * @returns Created RedPocket with claim links
   */
  async create(input: CreateRedPocketInput): Promise<{
    redpocket: RedPocketEntity;
    claimLink: string;
    embedLink: string;
  }> {
    // Validate lucky draw bounds
    if (input.isLuckyDraw) {
      const avgAmount = input.totalAmount / input.totalCount;
      if (input.minAmount && input.minAmount > avgAmount) {
        throw new Error('Minimum amount cannot exceed average amount');
      }
      if (input.maxAmount && input.maxAmount < avgAmount) {
        throw new Error('Maximum amount cannot be less than average amount');
      }
    }

    // Calculate expiration
    const expiresAt = new Date(Date.now() + input.expiresIn * 1000);

    // Create RedPocket entity
    const redpocket = await redpocketRepository.create({
      campaign_id: input.campaignId,
      enterprise_id: input.enterpriseId,
      sender_name: input.senderName,
      sender_avatar: input.senderAvatar,
      total_amount: input.totalAmount,
      remaining_amount: input.totalAmount,
      token_symbol: input.tokenSymbol,
      token_address: input.tokenAddress,
      chain_id: input.chainId,
      platform: input.platform,
      platform_channel_id: input.platformChannelId,
      message: input.message,
      tag: input.tag,
      total_count: input.totalCount,
      claimed_count: 0,
      is_lucky_draw: input.isLuckyDraw,
      min_amount: input.minAmount,
      max_amount: input.maxAmount,
      status: RedPocketStatus.ACTIVE,
      expires_at: expiresAt,
    });

    // Generate claim links
    const claimLinks: Record<Platform, string> = {
      [Platform.TELEGRAM]: `https://t.me/ProtocolBankBot?start=${redpocket.id}`,
      [Platform.DISCORD]: `https://discord.com/channels/@me?redpocket=${redpocket.id}`,
      [Platform.WHATSAPP]: `https://wa.me/?text=Claim%20your%20reward%3A%20https%3A%2F%2Fprotocolbanks.com%2Fclaim%2F${redpocket.id}`,
      [Platform.GITHUB]: `https://protocolbanks.com/claim/${redpocket.id}`,
    };

    return {
      redpocket,
      claimLink: claimLinks[input.platform],
      embedLink: `https://protocolbanks.com/claim/${redpocket.id}`,
    };
  }

  /**
   * Get RedPocket by ID
   * @param id - RedPocket ID
   * @returns RedPocket entity or null
   */
  async getById(id: string): Promise<RedPocketEntity | null> {
    return redpocketRepository.findById(id);
  }

  /**
   * Claim a RedPocket
   * @param input - Claim input
   * @returns Claim result
   */
  async claim(input: ClaimRedPocketInput): Promise<ClaimResult> {
    const { redpocketId, platform, platformId, displayName } = input;

    // Acquire distributed lock to prevent race conditions
    const lockAcquired = await cache.acquireClaimLock(redpocketId, platformId);
    if (!lockAcquired) {
      return { success: false, error: 'Claim in progress, please wait' };
    }

    try {
      // Get RedPocket
      const redpocket = await redpocketRepository.findById(redpocketId);
      if (!redpocket) {
        return { success: false, error: 'RedPocket not found' };
      }

      // Validate status
      if (redpocket.status !== RedPocketStatus.ACTIVE) {
        return { success: false, error: `RedPocket is ${redpocket.status}` };
      }

      // Check expiration
      if (new Date(redpocket.expires_at) < new Date()) {
        await redpocketRepository.update(redpocketId, { status: RedPocketStatus.EXPIRED });
        return { success: false, error: 'RedPocket has expired' };
      }

      // Check remaining
      if (redpocket.claimed_count >= redpocket.total_count) {
        await redpocketRepository.update(redpocketId, { status: RedPocketStatus.DEPLETED });
        return { success: false, error: 'RedPocket is fully claimed' };
      }

      // Get or create user
      const user = await userRepository.findOrCreate(platform, platformId, displayName);

      // Check if already claimed by this user
      const existingClaim = await claimRepository.findByUserAndRedPocket(redpocketId, user.id);
      if (existingClaim) {
        return { success: false, error: 'You have already claimed this RedPocket' };
      }

      // Also check by platform ID (for anti-fraud)
      const platformClaim = await claimRepository.findByPlatformId(redpocketId, platform, platformId);
      if (platformClaim) {
        return { success: false, error: 'This account has already claimed' };
      }

      // Calculate claim amount
      const claimAmount = this.calculateClaimAmount(redpocket);

      // Create claim record
      const claim = await claimRepository.create({
        redpocket_id: redpocketId,
        user_id: user.id,
        platform,
        platform_id: platformId,
        wallet_address: user.wallet_address || '',
        amount: claimAmount,
        gas_sponsored: true,
        status: ClaimStatus.PROCESSING,
      });

      // Process claim atomically
      const updatedRedPocket = await redpocketRepository.processClaim(redpocketId, claimAmount);
      if (!updatedRedPocket) {
        await claimRepository.updateStatus(claim.id, ClaimStatus.FAILED, undefined, 'Claim processing failed');
        return { success: false, error: 'Failed to process claim' };
      }

      // TODO: Execute blockchain transaction
      // For now, simulate success
      const txHash = `0x${uuidv4().replace(/-/g, '')}`;

      // Update claim status
      await claimRepository.updateStatus(claim.id, ClaimStatus.SUCCESS, txHash);

      // Update user's total claimed
      await userRepository.addClaimedAmount(user.id, claimAmount);

      return {
        success: true,
        claimedAmount: claimAmount,
        walletAddress: user.wallet_address || 'pending',
        txHash,
      };
    } finally {
      // Always release lock
      await cache.releaseClaimLock(redpocketId, platformId);
    }
  }

  /**
   * Calculate claim amount based on RedPocket type
   * @param redpocket - RedPocket entity
   * @returns Claim amount
   */
  private calculateClaimAmount(redpocket: RedPocketEntity): number {
    if (!redpocket.is_lucky_draw) {
      // Fixed amount distribution
      return redpocket.total_amount / redpocket.total_count;
    }

    // Lucky draw - random amount within bounds
    const remainingCount = redpocket.total_count - redpocket.claimed_count;
    const avgRemaining = redpocket.remaining_amount / remainingCount;
    
    const min = redpocket.min_amount || avgRemaining * 0.5;
    const max = Math.min(
      redpocket.max_amount || avgRemaining * 2,
      redpocket.remaining_amount - (remainingCount - 1) * min
    );

    // Random amount between min and max
    const amount = Math.random() * (max - min) + min;
    return Math.round(amount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get claim history for a RedPocket
   * @param redpocketId - RedPocket ID
   * @returns Array of claims
   */
  async getClaimHistory(redpocketId: string): Promise<ClaimEntity[]> {
    return claimRepository.findByRedPocket(redpocketId);
  }

  /**
   * Check if user is eligible to claim
   * @param redpocketId - RedPocket ID
   * @param platform - Platform name
   * @param platformId - Platform user ID
   * @returns Eligibility status
   */
  async checkEligibility(
    redpocketId: string,
    platform: Platform,
    platformId: string
  ): Promise<{
    isEligible: boolean;
    hasClaimed: boolean;
    reason?: string;
  }> {
    const redpocket = await redpocketRepository.findById(redpocketId);
    if (!redpocket) {
      return { isEligible: false, hasClaimed: false, reason: 'RedPocket not found' };
    }

    if (redpocket.status !== RedPocketStatus.ACTIVE) {
      return { isEligible: false, hasClaimed: false, reason: `RedPocket is ${redpocket.status}` };
    }

    if (new Date(redpocket.expires_at) < new Date()) {
      return { isEligible: false, hasClaimed: false, reason: 'RedPocket has expired' };
    }

    if (redpocket.claimed_count >= redpocket.total_count) {
      return { isEligible: false, hasClaimed: false, reason: 'RedPocket is fully claimed' };
    }

    // Check if already claimed
    const existingClaim = await claimRepository.findByPlatformId(redpocketId, platform, platformId);
    if (existingClaim) {
      return { isEligible: false, hasClaimed: true, reason: 'Already claimed' };
    }

    return { isEligible: true, hasClaimed: false };
  }
}

// Export singleton instance
export const redpocketService = new RedPocketService();
