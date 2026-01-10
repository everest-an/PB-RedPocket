/**
 * @fileoverview Dashboard Service
 * @description Business logic for enterprise dashboard and reporting
 * @module lib/api/services/dashboard
 */

import { query } from '../../db/connection';
import { cache } from '../../db/cache';
import {
  DashboardStats,
  EnterpriseStats,
  Platform,
  RedPocketFilters,
  ClaimFilters,
  PaginationParams,
} from '../../db/types';
import { redpocketRepository } from '../../db/repositories/redpocket.repository';
import { claimRepository } from '../../db/repositories/claim.repository';

// ============================================================================
// Dashboard Service
// ============================================================================

export class DashboardService {
  /**
   * Get real-time dashboard statistics for an enterprise
   * @param enterpriseId - Enterprise ID
   * @returns Dashboard statistics
   */
  async getDashboardStats(enterpriseId: string): Promise<DashboardStats> {
    // Check cache first
    const cached = await cache.getDashboardStats(enterpriseId);
    if (cached) return cached;

    // Query aggregated stats
    const statsResult = await query<{
      total_redpockets: string;
      active_redpockets: string;
      total_claims: string;
      total_distributed: string;
      unique_claimers: string;
      avg_claim_amount: string;
    }>(
      `SELECT 
        COUNT(DISTINCT r.id) as total_redpockets,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'active') as active_redpockets,
        COUNT(c.id) FILTER (WHERE c.status = 'success') as total_claims,
        COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'success'), 0) as total_distributed,
        COUNT(DISTINCT c.user_id) FILTER (WHERE c.status = 'success') as unique_claimers,
        COALESCE(AVG(c.amount) FILTER (WHERE c.status = 'success'), 0) as avg_claim_amount
       FROM redpockets r
       LEFT JOIN claims c ON c.redpocket_id = r.id
       WHERE r.enterprise_id = $1`,
      [enterpriseId]
    );

    // Query claims by platform
    const platformResult = await query<{
      platform: Platform;
      count: string;
    }>(
      `SELECT c.platform, COUNT(*) as count
       FROM claims c
       JOIN redpockets r ON r.id = c.redpocket_id
       WHERE r.enterprise_id = $1 AND c.status = 'success'
       GROUP BY c.platform`,
      [enterpriseId]
    );

    // Query claims by day (last 30 days)
    const dailyResult = await query<{
      date: string;
      count: string;
      amount: string;
    }>(
      `SELECT 
        DATE(c.created_at) as date,
        COUNT(*) as count,
        SUM(c.amount) as amount
       FROM claims c
       JOIN redpockets r ON r.id = c.redpocket_id
       WHERE r.enterprise_id = $1 
         AND c.status = 'success'
         AND c.created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(c.created_at)
       ORDER BY date DESC`,
      [enterpriseId]
    );

    const row = statsResult.rows[0];
    
    // Build claims by platform map
    const claimsByPlatform: Record<Platform, number> = {
      [Platform.TELEGRAM]: 0,
      [Platform.DISCORD]: 0,
      [Platform.WHATSAPP]: 0,
      [Platform.GITHUB]: 0,
    };
    for (const p of platformResult.rows) {
      claimsByPlatform[p.platform] = parseInt(p.count);
    }

    const stats: DashboardStats = {
      total_redpockets: parseInt(row.total_redpockets),
      active_redpockets: parseInt(row.active_redpockets),
      total_claims: parseInt(row.total_claims),
      total_distributed: parseFloat(row.total_distributed),
      unique_claimers: parseInt(row.unique_claimers),
      avg_claim_amount: parseFloat(row.avg_claim_amount),
      claims_by_platform: claimsByPlatform,
      claims_by_day: dailyResult.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count),
        amount: parseFloat(r.amount),
      })),
    };

    // Cache for 1 minute
    await cache.setDashboardStats(enterpriseId, stats);

    return stats;
  }

  /**
   * Get enterprise-level statistics
   * @param enterpriseId - Enterprise ID
   * @returns Enterprise statistics
   */
  async getEnterpriseStats(enterpriseId: string): Promise<EnterpriseStats> {
    const result = await query<{
      total_campaigns: string;
      active_campaigns: string;
      total_redpockets: string;
      total_claims: string;
      total_spent: string;
      remaining_balance: string;
      unique_claimers: string;
      avg_claim_time: string;
    }>(
      `SELECT 
        COUNT(DISTINCT camp.id) as total_campaigns,
        COUNT(DISTINCT camp.id) FILTER (WHERE camp.status = 'active') as active_campaigns,
        COUNT(DISTINCT r.id) as total_redpockets,
        COUNT(c.id) FILTER (WHERE c.status = 'success') as total_claims,
        COALESCE(SUM(c.amount) FILTER (WHERE c.status = 'success'), 0) as total_spent,
        e.balance as remaining_balance,
        COUNT(DISTINCT c.user_id) FILTER (WHERE c.status = 'success') as unique_claimers,
        COALESCE(AVG(EXTRACT(EPOCH FROM (c.completed_at - c.created_at))) FILTER (WHERE c.status = 'success'), 0) as avg_claim_time
       FROM enterprises e
       LEFT JOIN campaigns camp ON camp.enterprise_id = e.id
       LEFT JOIN redpockets r ON r.enterprise_id = e.id
       LEFT JOIN claims c ON c.redpocket_id = r.id
       WHERE e.id = $1
       GROUP BY e.id, e.balance`,
      [enterpriseId]
    );

    if (result.rows.length === 0) {
      throw new Error('Enterprise not found');
    }

    const row = result.rows[0];
    return {
      total_campaigns: parseInt(row.total_campaigns),
      active_campaigns: parseInt(row.active_campaigns),
      total_redpockets: parseInt(row.total_redpockets),
      total_claims: parseInt(row.total_claims),
      total_spent: parseFloat(row.total_spent),
      remaining_balance: parseFloat(row.remaining_balance),
      unique_claimers: parseInt(row.unique_claimers),
      avg_claim_time: parseFloat(row.avg_claim_time),
    };
  }

  /**
   * Get RedPockets for enterprise with filters
   * @param enterpriseId - Enterprise ID
   * @param filters - Query filters
   * @param pagination - Pagination params
   * @returns Paginated RedPockets
   */
  async getRedPockets(
    enterpriseId: string,
    filters: Omit<RedPocketFilters, 'enterprise_id'>,
    pagination: PaginationParams
  ) {
    return redpocketRepository.findMany(
      { ...filters, enterprise_id: enterpriseId },
      pagination
    );
  }

  /**
   * Get claims for enterprise with filters
   * @param enterpriseId - Enterprise ID
   * @param filters - Query filters
   * @param pagination - Pagination params
   * @returns Paginated claims
   */
  async getClaims(
    enterpriseId: string,
    filters: ClaimFilters,
    pagination: PaginationParams
  ) {
    // First get all redpocket IDs for this enterprise
    const rpResult = await query<{ id: string }>(
      'SELECT id FROM redpockets WHERE enterprise_id = $1',
      [enterpriseId]
    );
    
    const redpocketIds = rpResult.rows.map(r => r.id);
    if (redpocketIds.length === 0) {
      return { data: [], total: 0, page: pagination.page, limit: pagination.limit, totalPages: 0 };
    }

    // Query claims for these redpockets
    const offset = (pagination.page - 1) * pagination.limit;
    
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM claims WHERE redpocket_id = ANY($1)`,
      [redpocketIds]
    );
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await query(
      `SELECT * FROM claims 
       WHERE redpocket_id = ANY($1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [redpocketIds, pagination.limit, offset]
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
   * Generate financial report for a date range
   * @param enterpriseId - Enterprise ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Financial report data
   */
  async generateFinancialReport(
    enterpriseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: string; end: string };
    summary: {
      total_distributed: number;
      total_claims: number;
      unique_claimers: number;
      gas_sponsored: number;
    };
    by_token: Array<{
      token_symbol: string;
      amount: number;
      claims: number;
    }>;
    by_platform: Array<{
      platform: Platform;
      amount: number;
      claims: number;
    }>;
    by_campaign: Array<{
      campaign_id: string;
      campaign_name: string;
      amount: number;
      claims: number;
    }>;
  }> {
    // Summary stats
    const summaryResult = await query<{
      total_distributed: string;
      total_claims: string;
      unique_claimers: string;
      gas_sponsored: string;
    }>(
      `SELECT 
        COALESCE(SUM(c.amount), 0) as total_distributed,
        COUNT(*) as total_claims,
        COUNT(DISTINCT c.user_id) as unique_claimers,
        COUNT(*) FILTER (WHERE c.gas_sponsored = true) as gas_sponsored
       FROM claims c
       JOIN redpockets r ON r.id = c.redpocket_id
       WHERE r.enterprise_id = $1 
         AND c.status = 'success'
         AND c.created_at BETWEEN $2 AND $3`,
      [enterpriseId, startDate, endDate]
    );

    // By token
    const tokenResult = await query<{
      token_symbol: string;
      amount: string;
      claims: string;
    }>(
      `SELECT 
        r.token_symbol,
        SUM(c.amount) as amount,
        COUNT(*) as claims
       FROM claims c
       JOIN redpockets r ON r.id = c.redpocket_id
       WHERE r.enterprise_id = $1 
         AND c.status = 'success'
         AND c.created_at BETWEEN $2 AND $3
       GROUP BY r.token_symbol`,
      [enterpriseId, startDate, endDate]
    );

    // By platform
    const platformResult = await query<{
      platform: Platform;
      amount: string;
      claims: string;
    }>(
      `SELECT 
        c.platform,
        SUM(c.amount) as amount,
        COUNT(*) as claims
       FROM claims c
       JOIN redpockets r ON r.id = c.redpocket_id
       WHERE r.enterprise_id = $1 
         AND c.status = 'success'
         AND c.created_at BETWEEN $2 AND $3
       GROUP BY c.platform`,
      [enterpriseId, startDate, endDate]
    );

    // By campaign
    const campaignResult = await query<{
      campaign_id: string;
      campaign_name: string;
      amount: string;
      claims: string;
    }>(
      `SELECT 
        camp.id as campaign_id,
        camp.name as campaign_name,
        SUM(c.amount) as amount,
        COUNT(*) as claims
       FROM claims c
       JOIN redpockets r ON r.id = c.redpocket_id
       JOIN campaigns camp ON camp.id = r.campaign_id
       WHERE r.enterprise_id = $1 
         AND c.status = 'success'
         AND c.created_at BETWEEN $2 AND $3
       GROUP BY camp.id, camp.name`,
      [enterpriseId, startDate, endDate]
    );

    const summary = summaryResult.rows[0];

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        total_distributed: parseFloat(summary.total_distributed),
        total_claims: parseInt(summary.total_claims),
        unique_claimers: parseInt(summary.unique_claimers),
        gas_sponsored: parseInt(summary.gas_sponsored),
      },
      by_token: tokenResult.rows.map(r => ({
        token_symbol: r.token_symbol,
        amount: parseFloat(r.amount),
        claims: parseInt(r.claims),
      })),
      by_platform: platformResult.rows.map(r => ({
        platform: r.platform,
        amount: parseFloat(r.amount),
        claims: parseInt(r.claims),
      })),
      by_campaign: campaignResult.rows.map(r => ({
        campaign_id: r.campaign_id,
        campaign_name: r.campaign_name,
        amount: parseFloat(r.amount),
        claims: parseInt(r.claims),
      })),
    };
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
