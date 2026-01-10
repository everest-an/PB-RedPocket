/**
 * @fileoverview User Repository
 * @description Data access layer for user operations
 * @module lib/db/repositories/user
 */

import { query } from '../connection';
import { cache } from '../cache';
import {
  UserEntity,
  Platform,
  PaginationParams,
  PaginatedResult,
  UserStats,
} from '../types';

// ============================================================================
// User Repository
// ============================================================================

export class UserRepository {
  /**
   * Create or get existing user by platform identity
   * @param platform - Platform name
   * @param platformId - Platform user ID
   * @param displayName - Optional display name
   * @returns User entity
   */
  async findOrCreate(
    platform: Platform,
    platformId: string,
    displayName?: string
  ): Promise<UserEntity> {
    // Check cache first
    const cached = await cache.getUser(platform, platformId);
    if (cached) {
      // Update last active
      await this.updateLastActive(cached.id);
      return cached;
    }

    // Upsert user
    const result = await query<UserEntity>(
      `INSERT INTO users (platform, platform_id, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (platform, platform_id) 
       DO UPDATE SET last_active_at = NOW()
       RETURNING *`,
      [platform, platformId, displayName]
    );

    const user = result.rows[0];
    await cache.setUser(user);
    return user;
  }

  /**
   * Get user by ID
   * @param id - User ID
   * @returns User entity or null
   */
  async findById(id: string): Promise<UserEntity | null> {
    const result = await query<UserEntity>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user by platform identity
   * @param platform - Platform name
   * @param platformId - Platform user ID
   * @returns User entity or null
   */
  async findByPlatformId(platform: Platform, platformId: string): Promise<UserEntity | null> {
    const cached = await cache.getUser(platform, platformId);
    if (cached) return cached;

    const result = await query<UserEntity>(
      'SELECT * FROM users WHERE platform = $1 AND platform_id = $2',
      [platform, platformId]
    );

    if (result.rows[0]) {
      await cache.setUser(result.rows[0]);
    }
    return result.rows[0] || null;
  }

  /**
   * Update user wallet address
   * @param id - User ID
   * @param walletAddress - Wallet address
   * @returns Updated user entity
   */
  async updateWalletAddress(id: string, walletAddress: string): Promise<UserEntity | null> {
    const result = await query<UserEntity>(
      `UPDATE users SET wallet_address = $2 WHERE id = $1 RETURNING *`,
      [id, walletAddress]
    );
    return result.rows[0] || null;
  }

  /**
   * Update user's total claimed amount
   * @param id - User ID
   * @param amount - Amount to add
   * @returns Updated user entity
   */
  async addClaimedAmount(id: string, amount: number): Promise<UserEntity | null> {
    const result = await query<UserEntity>(
      `UPDATE users 
       SET total_claimed = total_claimed + $2, last_active_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, amount]
    );
    return result.rows[0] || null;
  }

  /**
   * Update user's total withdrawn amount
   * @param id - User ID
   * @param amount - Amount to add
   * @returns Updated user entity
   */
  async addWithdrawnAmount(id: string, amount: number): Promise<UserEntity | null> {
    const result = await query<UserEntity>(
      `UPDATE users 
       SET total_withdrawn = total_withdrawn + $2, last_active_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, amount]
    );
    return result.rows[0] || null;
  }

  /**
   * Update last active timestamp
   * @param id - User ID
   */
  async updateLastActive(id: string): Promise<void> {
    await query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Get user statistics
   * @param id - User ID
   * @returns User statistics
   */
  async getStats(id: string): Promise<UserStats | null> {
    const result = await query<{
      total_claimed: string;
      total_withdrawn: string;
      claim_count: string;
      platforms: Platform[];
      first_claim_at: Date | null;
      last_claim_at: Date | null;
    }>(
      `SELECT 
        u.total_claimed,
        u.total_withdrawn,
        COUNT(c.id) as claim_count,
        ARRAY_AGG(DISTINCT c.platform) FILTER (WHERE c.platform IS NOT NULL) as platforms,
        MIN(c.created_at) as first_claim_at,
        MAX(c.created_at) as last_claim_at
       FROM users u
       LEFT JOIN claims c ON c.user_id = u.id AND c.status = 'success'
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      total_claimed: parseFloat(row.total_claimed),
      total_withdrawn: parseFloat(row.total_withdrawn),
      claim_count: parseInt(row.claim_count),
      platforms_used: row.platforms || [],
      first_claim_at: row.first_claim_at || undefined,
      last_claim_at: row.last_claim_at || undefined,
    };
  }

  /**
   * Link social identity to user (for account merging)
   * @param userId - User ID
   * @param platform - Platform name
   * @param platformId - Platform user ID
   */
  async linkSocialIdentity(
    userId: string,
    platform: Platform,
    platformId: string
  ): Promise<void> {
    await query(
      `INSERT INTO social_links (user_id, platform, platform_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (platform, platform_id) DO NOTHING`,
      [userId, platform, platformId]
    );
  }

  /**
   * Get all linked social identities for a user
   * @param userId - User ID
   * @returns Array of linked identities
   */
  async getLinkedIdentities(userId: string): Promise<Array<{
    platform: Platform;
    platform_id: string;
    is_primary: boolean;
  }>> {
    const result = await query<{
      platform: Platform;
      platform_id: string;
      is_primary: boolean;
    }>(
      'SELECT platform, platform_id, is_primary FROM social_links WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }

  /**
   * Find users with pagination
   * @param pagination - Pagination params
   * @returns Paginated users
   */
  async findMany(pagination: PaginationParams): Promise<PaginatedResult<UserEntity>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users'
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query<UserEntity>(
      `SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pagination.limit, offset]
    );

    return {
      data: dataResult.rows,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
