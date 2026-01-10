/**
 * @fileoverview Enterprise Reporting Service
 * @description Financial reporting and analytics for enterprises
 * @module lib/enterprise/reporting
 */

import {
  TimePeriod,
  DateRange,
  FinancialSummary,
  ProfitLossStatement,
  CashFlowStatement,
  CampaignMetrics,
  CampaignPerformance,
  EnterpriseDashboard,
  RecentActivity,
  CampaignOverview,
  PlatformStats,
  DashboardAlert,
  TokenPrice,
  FiatValuation,
} from './types';

// ============================================================================
// Mock Data Store (Replace with actual DB queries in production)
// ============================================================================

interface MockEnterpriseData {
  id: string;
  name: string;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  campaigns: MockCampaignData[];
  transactions: MockTransactionData[];
}

interface MockCampaignData {
  id: string;
  name: string;
  totalBudget: number;
  spentBudget: number;
  platform: string;
  status: string;
  totalRedPockets: number;
  totalClaims: number;
  uniqueClaimers: number;
  startDate: Date;
  endDate?: Date;
}

interface MockTransactionData {
  id: string;
  type: 'deposit' | 'distribution' | 'claim' | 'refund' | 'gas_fee' | 'bridge_fee';
  amount: number;
  tokenSymbol: string;
  timestamp: Date;
  txHash?: string;
}

// Mock token prices
const mockTokenPrices: Record<string, TokenPrice> = {
  USDT: { symbol: 'USDT', priceUsd: 1.0, change24h: 0.01, lastUpdated: new Date() },
  ETH: { symbol: 'ETH', priceUsd: 1800, change24h: 2.5, lastUpdated: new Date() },
  DOT: { symbol: 'DOT', priceUsd: 4.5, change24h: -1.2, lastUpdated: new Date() },
};

// ============================================================================
// Reporting Service
// ============================================================================

export class ReportingService {
  /**
   * Get enterprise dashboard data
   * @param enterpriseId - Enterprise ID
   * @returns Dashboard data
   */
  async getDashboard(enterpriseId: string): Promise<EnterpriseDashboard> {
    // TODO: Fetch from actual database
    const enterprise = this.getMockEnterprise(enterpriseId);

    const summary = await this.getFinancialSummary(enterpriseId);
    const recentActivity = await this.getRecentActivity(enterpriseId, 10);
    const campaignOverview = await this.getCampaignOverview(enterpriseId);
    const platformStats = await this.getPlatformStats(enterpriseId);
    const alerts = await this.getAlerts(enterpriseId);

    return {
      enterpriseId,
      enterpriseName: enterprise.name,
      summary,
      recentActivity,
      campaignOverview,
      platformStats,
      alerts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get financial summary
   * @param enterpriseId - Enterprise ID
   * @returns Financial summary
   */
  async getFinancialSummary(enterpriseId: string): Promise<FinancialSummary> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    const transactions = enterprise.transactions;

    const totalDeposited = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDistributed = transactions
      .filter(t => t.type === 'distribution' || t.type === 'claim')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalGasSponsored = transactions
      .filter(t => t.type === 'gas_fee')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalFees = transactions
      .filter(t => t.type === 'bridge_fee')
      .reduce((sum, t) => sum + t.amount, 0);

    const refunds = transactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalDeposited,
      totalDistributed,
      totalGasSponsored,
      totalFees,
      netBalance: totalDeposited - totalDistributed - totalGasSponsored - totalFees + refunds,
      currency: 'USD',
    };
  }

  /**
   * Generate P&L statement
   * @param enterpriseId - Enterprise ID
   * @param dateRange - Date range for the report
   * @returns P&L statement
   */
  async getProfitLossStatement(
    enterpriseId: string,
    dateRange: DateRange
  ): Promise<ProfitLossStatement> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    const transactions = enterprise.transactions.filter(
      t => t.timestamp >= dateRange.startDate && t.timestamp <= dateRange.endDate
    );

    const deposits = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const refunds = transactions
      .filter(t => t.type === 'refund')
      .reduce((sum, t) => sum + t.amount, 0);

    const distributions = transactions
      .filter(t => t.type === 'distribution' || t.type === 'claim')
      .reduce((sum, t) => sum + t.amount, 0);

    const gasFees = transactions
      .filter(t => t.type === 'gas_fee')
      .reduce((sum, t) => sum + t.amount, 0);

    const bridgeFees = transactions
      .filter(t => t.type === 'bridge_fee')
      .reduce((sum, t) => sum + t.amount, 0);

    const platformFees = distributions * 0.01; // 1% platform fee

    const totalRevenue = deposits + refunds;
    const totalExpenses = distributions + gasFees + platformFees + bridgeFees;

    return {
      period: dateRange,
      revenue: {
        deposits,
        refunds,
        total: totalRevenue,
      },
      expenses: {
        distributions,
        gasFees,
        platformFees,
        bridgeFees,
        total: totalExpenses,
      },
      netIncome: totalRevenue - totalExpenses,
      currency: 'USD',
    };
  }

  /**
   * Generate cash flow statement
   * @param enterpriseId - Enterprise ID
   * @param dateRange - Date range for the report
   * @returns Cash flow statement
   */
  async getCashFlowStatement(
    enterpriseId: string,
    dateRange: DateRange
  ): Promise<CashFlowStatement> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    const transactions = enterprise.transactions.filter(
      t => t.timestamp >= dateRange.startDate && t.timestamp <= dateRange.endDate
    );

    const depositsReceived = transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const distributionsPaid = transactions
      .filter(t => t.type === 'distribution' || t.type === 'claim')
      .reduce((sum, t) => sum + t.amount, 0);

    const feesPaid = transactions
      .filter(t => t.type === 'gas_fee' || t.type === 'bridge_fee')
      .reduce((sum, t) => sum + t.amount, 0);

    // Simplified bridge transfers (would need actual bridge data)
    const bridgeTransfersOut = 0;
    const bridgeTransfersIn = 0;

    const netCashFromOperations = depositsReceived - distributionsPaid - feesPaid;
    const netCashFromInvesting = bridgeTransfersIn - bridgeTransfersOut;
    const netCashChange = netCashFromOperations + netCashFromInvesting;

    // Calculate beginning balance (simplified)
    const beginningBalance = enterprise.totalDeposited - enterprise.totalSpent;

    return {
      period: dateRange,
      operatingActivities: {
        depositsReceived,
        distributionsPaid,
        feesPaid,
        netCashFromOperations,
      },
      investingActivities: {
        bridgeTransfersOut,
        bridgeTransfersIn,
        netCashFromInvesting,
      },
      netCashChange,
      beginningBalance,
      endingBalance: beginningBalance + netCashChange,
      currency: 'USD',
    };
  }

  /**
   * Get campaign metrics
   * @param enterpriseId - Enterprise ID
   * @param campaignId - Optional specific campaign ID
   * @returns Campaign metrics
   */
  async getCampaignMetrics(
    enterpriseId: string,
    campaignId?: string
  ): Promise<CampaignMetrics[]> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    let campaigns = enterprise.campaigns;

    if (campaignId) {
      campaigns = campaigns.filter(c => c.id === campaignId);
    }

    return campaigns.map(c => ({
      campaignId: c.id,
      campaignName: c.name,
      totalBudget: c.totalBudget,
      spentBudget: c.spentBudget,
      remainingBudget: c.totalBudget - c.spentBudget,
      totalRedPockets: c.totalRedPockets,
      totalClaims: c.totalClaims,
      uniqueClaimers: c.uniqueClaimers,
      claimRate: c.totalRedPockets > 0 ? c.totalClaims / c.totalRedPockets : 0,
      avgClaimAmount: c.totalClaims > 0 ? c.spentBudget / c.totalClaims : 0,
      platform: c.platform,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
    }));
  }

  /**
   * Get recent activity
   * @param enterpriseId - Enterprise ID
   * @param limit - Number of activities to return
   * @returns Recent activities
   */
  async getRecentActivity(enterpriseId: string, limit: number = 10): Promise<RecentActivity[]> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    
    return enterprise.transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map(t => ({
        id: t.id,
        type: t.type === 'gas_fee' || t.type === 'bridge_fee' ? 'distribution' : t.type,
        amount: t.amount,
        tokenSymbol: t.tokenSymbol,
        description: this.getActivityDescription(t),
        timestamp: t.timestamp,
        txHash: t.txHash,
      }));
  }

  /**
   * Get campaign overview
   * @param enterpriseId - Enterprise ID
   * @returns Campaign overview
   */
  async getCampaignOverview(enterpriseId: string): Promise<CampaignOverview> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    const campaigns = enterprise.campaigns;

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      completedCampaigns: campaigns.filter(c => c.status === 'completed').length,
      totalBudget: campaigns.reduce((sum, c) => sum + c.totalBudget, 0),
      totalSpent: campaigns.reduce((sum, c) => sum + c.spentBudget, 0),
      totalClaims: campaigns.reduce((sum, c) => sum + c.totalClaims, 0),
      uniqueClaimers: campaigns.reduce((sum, c) => sum + c.uniqueClaimers, 0),
    };
  }

  /**
   * Get platform statistics
   * @param enterpriseId - Enterprise ID
   * @returns Platform stats
   */
  async getPlatformStats(enterpriseId: string): Promise<PlatformStats[]> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    const campaigns = enterprise.campaigns;

    const platformMap = new Map<string, {
      claims: number;
      distributed: number;
      users: number;
    }>();

    for (const campaign of campaigns) {
      const existing = platformMap.get(campaign.platform) || { claims: 0, distributed: 0, users: 0 };
      platformMap.set(campaign.platform, {
        claims: existing.claims + campaign.totalClaims,
        distributed: existing.distributed + campaign.spentBudget,
        users: existing.users + campaign.uniqueClaimers,
      });
    }

    const totalClaims = Array.from(platformMap.values()).reduce((sum, p) => sum + p.claims, 0);

    return Array.from(platformMap.entries()).map(([platform, stats]) => ({
      platform,
      totalClaims: stats.claims,
      totalDistributed: stats.distributed,
      uniqueUsers: stats.users,
      avgClaimAmount: stats.claims > 0 ? stats.distributed / stats.claims : 0,
      percentage: totalClaims > 0 ? (stats.claims / totalClaims) * 100 : 0,
    }));
  }

  /**
   * Get dashboard alerts
   * @param enterpriseId - Enterprise ID
   * @returns Alerts
   */
  async getAlerts(enterpriseId: string): Promise<DashboardAlert[]> {
    const enterprise = this.getMockEnterprise(enterpriseId);
    const alerts: DashboardAlert[] = [];

    // Check low balance
    if (enterprise.balance < 100) {
      alerts.push({
        id: 'low-balance',
        type: 'warning',
        title: '余额不足',
        message: `当前余额 $${enterprise.balance.toFixed(2)}，建议充值以确保活动正常进行`,
        timestamp: new Date(),
        actionRequired: true,
        actionUrl: '/dashboard/deposit',
      });
    }

    // Check expiring campaigns
    const expiringCampaigns = enterprise.campaigns.filter(c => {
      if (!c.endDate || c.status !== 'active') return false;
      const daysUntilEnd = (c.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntilEnd <= 3 && daysUntilEnd > 0;
    });

    for (const campaign of expiringCampaigns) {
      alerts.push({
        id: `expiring-${campaign.id}`,
        type: 'info',
        title: '活动即将结束',
        message: `活动 "${campaign.name}" 将在 3 天内结束`,
        timestamp: new Date(),
        actionRequired: false,
        actionUrl: `/dashboard/campaigns/${campaign.id}`,
      });
    }

    return alerts;
  }

  /**
   * Get token price
   * @param symbol - Token symbol
   * @returns Token price
   */
  async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    // TODO: Fetch from price oracle (CoinGecko, etc.)
    return mockTokenPrices[symbol] || null;
  }

  /**
   * Convert token amount to fiat
   * @param amount - Token amount
   * @param tokenSymbol - Token symbol
   * @param fiatCurrency - Target fiat currency
   * @returns Fiat valuation
   */
  async convertToFiat(
    amount: number,
    tokenSymbol: string,
    fiatCurrency: string = 'USD'
  ): Promise<FiatValuation> {
    const price = await this.getTokenPrice(tokenSymbol);
    const priceUsd = price?.priceUsd || 0;

    // TODO: Support other fiat currencies with exchange rates
    const exchangeRate = fiatCurrency === 'USD' ? 1 : 7.2; // Mock CNY rate

    return {
      tokenAmount: amount,
      tokenSymbol,
      fiatAmount: amount * priceUsd * exchangeRate,
      fiatCurrency,
      exchangeRate: priceUsd * exchangeRate,
      timestamp: new Date(),
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private getMockEnterprise(enterpriseId: string): MockEnterpriseData {
    // Return mock data for testing
    return {
      id: enterpriseId,
      name: 'Test Enterprise',
      balance: 5000,
      totalDeposited: 10000,
      totalSpent: 5000,
      campaigns: [
        {
          id: 'camp-1',
          name: 'Telegram 社区活动',
          totalBudget: 1000,
          spentBudget: 750,
          platform: 'telegram',
          status: 'active',
          totalRedPockets: 100,
          totalClaims: 75,
          uniqueClaimers: 70,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'camp-2',
          name: 'Discord 推广',
          totalBudget: 500,
          spentBudget: 500,
          platform: 'discord',
          status: 'completed',
          totalRedPockets: 50,
          totalClaims: 50,
          uniqueClaimers: 48,
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ],
      transactions: [
        { id: 'tx-1', type: 'deposit', amount: 5000, tokenSymbol: 'USDT', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), txHash: '0x123...' },
        { id: 'tx-2', type: 'deposit', amount: 5000, tokenSymbol: 'USDT', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), txHash: '0x456...' },
        { id: 'tx-3', type: 'distribution', amount: 750, tokenSymbol: 'USDT', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { id: 'tx-4', type: 'distribution', amount: 500, tokenSymbol: 'USDT', timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
        { id: 'tx-5', type: 'gas_fee', amount: 10, tokenSymbol: 'ETH', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      ],
    };
  }

  private getActivityDescription(transaction: MockTransactionData): string {
    switch (transaction.type) {
      case 'deposit':
        return `充值 ${transaction.amount} ${transaction.tokenSymbol}`;
      case 'distribution':
        return `发放红包 ${transaction.amount} ${transaction.tokenSymbol}`;
      case 'claim':
        return `用户领取 ${transaction.amount} ${transaction.tokenSymbol}`;
      case 'refund':
        return `退款 ${transaction.amount} ${transaction.tokenSymbol}`;
      case 'gas_fee':
        return `Gas 费用 ${transaction.amount} ${transaction.tokenSymbol}`;
      case 'bridge_fee':
        return `跨链费用 ${transaction.amount} ${transaction.tokenSymbol}`;
      default:
        return `交易 ${transaction.amount} ${transaction.tokenSymbol}`;
    }
  }

  /**
   * Get date range for a time period
   * @param period - Time period
   * @returns Date range
   */
  getDateRangeForPeriod(period: TimePeriod): DateRange {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (period) {
      case TimePeriod.DAY:
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case TimePeriod.WEEK:
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case TimePeriod.MONTH:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case TimePeriod.QUARTER:
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case TimePeriod.YEAR:
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    return { startDate, endDate };
  }
}

// Export singleton instance
export const reportingService = new ReportingService();
