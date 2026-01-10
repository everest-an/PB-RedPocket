/**
 * @fileoverview RedPocket Repository
 * @description Data access layer for RedPocket operations
 * @module lib/db/repositories/redpocket
 */

import { query, transaction } from '../connection';
import { cache } from '../cache';
import {
  RedPocketEntity,
  RedPocketStatus,
  RedPocketFilters,
  PaginationParams,
  PaginatedResult,
  Platform,
} from '../types';

// ============================================================================
// RedPocket Repository
// ============================================================================

export class RedPocketRepository {
  /**
   * Create a new RedPocket
   * @param data - RedPocket creation data
   * @returns Created RedPocket entity
   */
  async create(data: Omit<RedPocketEntity, 'id' | 'created_at' | 'updated_at'>): Promise<RedPocketEntity> {
    const result = await query<RedPocketEntity>(
      `INSERT INTO redpockets (
        campaign_id, enterprise_id, sender_name, sender_avatar,
        total_amount, remaining_amount, token_symbol, token_address,
        chain_id, platform, platform_channel_id, message, tag,
        total_count, claimed_count, is_lucky_draw, min_amount, max_amount,
        contract_address, contract_id, status, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        data.campaign_id, data.enterprise_id, data.sender_name, data.sender_avatar,
        data.total_amount, data.remaining_amount, data.token_symbol, data.token_address,
        data.chain_id, data.platform, data.platform_channel_id, data.message, data.tag,
        data.total_count, data.claimed_count, data.is_lucky_draw, data.min_amount, data.max_amount,
        data.contract_address, data.contract_id, data.status, data.expires_at,
      ]
    );
    
    const redpocket = result.rows[0];
    await cache.setRedPocket(redpocket);
    return redpocket;
  }

  /**
   * Get RedPocket by ID
   * @param id - RedPocket ID
   * @returns RedPocket entity or null
   */
  async findById(id: string): Promise<RedPocketEntity | null> {
    // Check cache first
    const cached = await cache.getRedPocket(id);
    if (cached) return cached;

    const result = await query<RedPocketEntity>(
      'SELECT * FROM redpockets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const redpocket = result.rows[0];
    await cache.setRedPocket(redpocket);
    return redpocket;
  }

  /**
   * Update RedPocket
   * @param id - RedPocket ID
   * @param data - Update data
   * @returns Updated RedPocket entity
   */
  async update(id: string, data: Partial<RedPocketEntity>): Promise<RedPocketEntity | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query<RedPocketEntity>(
      `UPDATE redpockets SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    const redpocket = result.rows[0];
    await cache.setRedPocket(redpocket);
    return redpocket;
  }

  /**
   * Process a claim (atomic operation)
   * @param id - RedPocket ID
   * @param claimAmount - Amount being claimed
   * @returns Updated RedPocket or null if claim not possible
   */
  async processClaim(id: string, claimAmount: number): Promise<RedPocketEntity | null> {
    const result = await query<RedPocketEntity>(
      `UPDATE redpockets 
       SET claimed_count = claimed_count + 1,
           remaining_amount = remaining_amount - $2,
           status = CASE 
             WHEN claimed_count + 1 >= total_count THEN 'depleted'::redpocket_status
             WHEN remaining_amount - $2 <= 0 THEN 'depleted'::redpocket_status
             ELSE status
           END
       WHERE id = $1 
         AND status = 'active'
         AND claimed_count < total_count
         AND remaining_amount >= $2
         AND expires_at > NOW()
       RETURNING *`,
      [id, claimAmount]
    );

    if (result.rows.length === 0) return null;

    const redpocket = result.rows[0];
    await cache.invalidateRedPocket(id);
    return redpocket;
  }

  /**
   * Find RedPockets with filters and pagination
   * @param filters - Query filters
   * @param pagination - Pagination params
   * @returns Paginated result
   */
  async findMany(
    filters: RedPocketFilters,
    pagination: PaginationParams
  ): Promise<PaginatedResult<RedPocketEntity>> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build filter conditions
    if (filters.enterprise_id) {
      conditions.push(`enterprise_id = $${paramIndex++}`);
      values.push(filters.enterprise_id);
    }
    if (filters.campaign_id) {
      conditions.push(`campaign_id = $${paramIndex++}`);
      values.push(filters.campaign_id);
    }
    if (filters.platform) {
      conditions.push(`platform = $${paramIndex++}`);
      values.push(filters.platform);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.chain_id) {
      conditions.push(`chain_id = $${paramIndex++}`);
      values.push(filters.chain_id);
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

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM redpockets ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    values.push(pagination.limit, offset);
    const dataResult = await query<RedPocketEntity>(
      `SELECT * FROM redpockets ${whereClause} 
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
   * Expire outdated RedPockets
   * @returns Number of expired RedPockets
   */
  async expireOutdated(): Promise<number> {
    const result = await query(
      `UPDATE redpockets 
       SET status = 'expired'::redpocket_status 
       WHERE status = 'active' AND expires_at < NOW()`
    );
    return result.rowCount || 0;
  }

  /**
   * Get active RedPockets for a campaign
   * @param campaignId - Campaign ID
   * @returns Array of active RedPockets
   */
  async findActiveByCampaign(campaignId: string): Promise<RedPocketEntity[]> {
    const result = await query<RedPocketEntity>(
      `SELECT * FROM redpockets 
       WHERE campaign_id = $1 AND status = 'active' AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [campaignId]
    );
    return result.rows;
  }
}

// Export singleton instance
export const redpocketRepository = new RedPocketRepository();
