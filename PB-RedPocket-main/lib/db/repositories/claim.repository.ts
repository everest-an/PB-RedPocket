/**
 * @fileoverview Claim Repository
 * @description Data access layer for claim operations
 * @module lib/db/repositories/claim
 */

import { query } from '../connection';
import { cache } from '../cache';
import {
  ClaimEntity,
  ClaimStatus,
  ClaimFilters,
  PaginationParams,
  PaginatedResult,
  Platform,
} from '../types';

// ============================================================================
// Claim Repository
// ============================================================================

export class ClaimRepository {
  /**
   * Create a new claim
   * @param data - Claim creation data
   * @returns Created claim entity
   */
  async create(data: Omit<ClaimEntity, 'id' | 'created_at'>): Promise<ClaimEntity> {
    const result = await query<ClaimEntity>(
      `INSERT INTO claims (
        redpocket_id, user_id, platform, platform_id, wallet_address,
        amount, tx_hash, block_number, gas_used, gas_sponsored, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.redpocket_id, data.user_id, data.platform, data.platform_id,
        data.wallet_address, data.amount, data.tx_hash, data.block_number,
        data.gas_used, data.gas_sponsored, data.status, data.error_message,
      ]
    );
    return result.rows[0];
  }

  /**
   * Get claim by ID
   * @param id - Claim ID
   * @returns Claim entity or null
   */
  async findById(id: string): Promise<ClaimEntity | null> {
    const result = await query<ClaimEntity>(
      'SELECT * FROM claims WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if user has already claimed
   * @param redpocketId - RedPocket ID
   * @param userId - User ID
   * @returns Existing claim or null
   */
  async findByUserAndRedPocket(redpocketId: string, userId: string): Promise<ClaimEntity | null> {
    const result = await query<ClaimEntity>(
      'SELECT * FROM claims WHERE redpocket_id = $1 AND user_id = $2',
      [redpocketId, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Check if platform ID has already claimed
   * @param redpocketId - RedPocket ID
   * @param platform - Platform name
   * @param platformId - Platform user ID
   * @returns Existing claim or null
   */
  async findByPlatformId(
    redpocketId: string,
    platform: Platform,
    platformId: string
  ): Promise<ClaimEntity | null> {
    const result = await query<ClaimEntity>(
      'SELECT * FROM claims WHERE redpocket_id = $1 AND platform = $2 AND platform_id = $3',
      [redpocketId, platform, platformId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update claim status
   * @param id - Claim ID
   * @param status - New status
   * @param txHash - Transaction hash (optional)
   * @param errorMessage - Error message (optional)
   * @returns Updated claim entity
   */
  async updateStatus(
    id: string,
    status: ClaimStatus,
    txHash?: string,
    errorMessage?: string
  ): Promise<ClaimEntity | null> {
    const completedAt = status === ClaimStatus.SUCCESS ? 'NOW()' : 'NULL';
    
    const result = await query<ClaimEntity>(
      `UPDATE claims 
       SET status = $2, tx_hash = COALESCE($3, tx_hash), 
           error_message = $4, completed_at = ${completedAt}
       WHERE id = $1 
       RETURNING *`,
      [id, status, txHash, errorMessage]
    );
    return result.rows[0] || null;
  }

  /**
   * Get claims for a RedPocket
   * @param redpocketId - RedPocket ID
   * @returns Array of claims
   */
  async findByRedPocket(redpocketId: string): Promise<ClaimEntity[]> {
    const result = await query<ClaimEntity>(
      'SELECT * FROM claims WHERE redpocket_id = $1 ORDER BY created_at DESC',
      [redpocketId]
    );
    return result.rows;
  }

  /**
   * Get claims for a user
   * @param userId - User ID
   * @param pagination - Pagination params
   * @returns Paginated claims
   */
  async findByUser(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<ClaimEntity>> {
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM claims WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query<ClaimEntity>(
      `SELECT * FROM claims WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, pagination.limit, offset]
    );

    return {
      data: dataResult.rows,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Find claims with filters
   * @param filters - Query filters
   * @param pagination - Pagination params
   * @returns Paginated result
   */
  async findMany(
    filters: ClaimFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<ClaimEntity>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.redpocket_id) {
      conditions.push(`redpocket_id = $${paramIndex++}`);
      values.push(filters.redpocket_id);
    }
    if (filters.user_id) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.user_id);
    }
    if (filters.platform) {
      conditions.push(`platform = $${paramIndex++}`);
      values.push(filters.platform);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.created_after) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.created_after);
    }
    if (filters.created_before) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.created_before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (pagination.page - 1) * pagination.limit;

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM claims ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    values.push(pagination.limit, offset);
    const dataResult = await query<ClaimEntity>(
      `SELECT * FROM claims ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return {
      data: dataResult.rows,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  /**
   * Get total claimed amount for a user
   * @param userId - User ID
   * @returns Total claimed amount
   */
  async getTotalClaimedByUser(userId: string): Promise<number> {
    const result = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM claims 
       WHERE user_id = $1 AND status = 'success'`,
      [userId]
    );
    return parseFloat(result.rows[0].total);
  }

  /**
   * Get claim statistics for a RedPocket
   * @param redpocketId - RedPocket ID
   * @returns Claim statistics
   */
  async getStatsByRedPocket(redpocketId: string): Promise<{
    total_claims: number;
    successful_claims: number;
    total_amount: number;
    unique_claimers: number;
  }> {
    const result = await query<{
      total_claims: string;
      successful_claims: string;
      total_amount: string;
      unique_claimers: string;
    }>(
      `SELECT 
        COUNT(*) as total_claims,
        COUNT(*) FILTER (WHERE status = 'success') as successful_claims,
        COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) as total_amount,
        COUNT(DISTINCT user_id) FILTER (WHERE status = 'success') as unique_claimers
       FROM claims 
       WHERE redpocket_id = $1`,
      [redpocketId]
    );

    const row = result.rows[0];
    return {
      total_claims: parseInt(row.total_claims),
      successful_claims: parseInt(row.successful_claims),
      total_amount: parseFloat(row.total_amount),
      unique_claimers: parseInt(row.unique_claimers),
    };
  }
}

// Export singleton instance
export const claimRepository = new ClaimRepository();
