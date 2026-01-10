/**
 * @fileoverview Enterprise Financial Types
 * @description Type definitions for enterprise financial management
 * @module lib/enterprise/types
 */

// ============================================================================
// Time Period Types
// ============================================================================

export enum TimePeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom',
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// Financial Report Types
// ============================================================================

export interface FinancialSummary {
  totalDeposited: number;
  totalDistributed: number;
  totalGasSponsored: number;
  totalFees: number;
  netBalance: number;
  currency: string;
}

export interface ProfitLossStatement {
  period: DateRange;
  revenue: {
    deposits: number;
    refunds: number;
    total: number;
  };
  expenses: {
    distributions: number;
    gasFees: number;
    platformFees: number;
    bridgeFees: number;
    total: number;
  };
  netIncome: number;
  currency: string;
}

export interface CashFlowStatement {
  period: DateRange;
  operatingActivities: {
    depositsReceived: number;
    distributionsPaid: number;
    feesPaid: number;
    netCashFromOperations: number;
  };
  investingActivities: {
    bridgeTransfersOut: number;
    bridgeTransfersIn: number;
    netCashFromInvesting: number;
  };
  netCashChange: number;
  beginningBalance: number;
  endingBalance: number;
  currency: string;
}

// ============================================================================
// Campaign Analytics Types
// ============================================================================

export interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  totalBudget: number;
  spentBudget: number;
  remainingBudget: number;
  totalRedPockets: number;
  totalClaims: number;
  uniqueClaimers: number;
  claimRate: number; // claims / total_count
  avgClaimAmount: number;
  platform: string;
  status: string;
  startDate: Date;
  endDate?: Date;
}

export interface CampaignPerformance {
  campaignId: string;
  dailyMetrics: Array<{
    date: Date;
    claims: number;
    uniqueUsers: number;
    amountDistributed: number;
  }>;
  platformBreakdown: Array<{
    platform: string;
    claims: number;
    percentage: number;
  }>;
  peakHours: Array<{
    hour: number;
    claims: number;
  }>;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface EnterpriseDashboard {
  enterpriseId: string;
  enterpriseName: string;
  summary: FinancialSummary;
  recentActivity: RecentActivity[];
  campaignOverview: CampaignOverview;
  platformStats: PlatformStats[];
  alerts: DashboardAlert[];
  lastUpdated: Date;
}

export interface RecentActivity {
  id: string;
  type: 'deposit' | 'distribution' | 'claim' | 'refund' | 'withdrawal';
  amount: number;
  tokenSymbol: string;
  description: string;
  timestamp: Date;
  txHash?: string;
}

export interface CampaignOverview {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  totalClaims: number;
  uniqueClaimers: number;
}

export interface PlatformStats {
  platform: string;
  totalClaims: number;
  totalDistributed: number;
  uniqueUsers: number;
  avgClaimAmount: number;
  percentage: number;
}

export interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  actionRequired: boolean;
  actionUrl?: string;
}

// ============================================================================
// Export Types
// ============================================================================

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  EXCEL = 'xlsx',
  JSON = 'json',
}

export interface ExportOptions {
  format: ExportFormat;
  dateRange: DateRange;
  includeDetails: boolean;
  includeFiatValues: boolean;
  fiatCurrency: string;
  columns?: string[];
}

export interface ExportResult {
  filename: string;
  format: ExportFormat;
  size: number;
  url: string;
  expiresAt: Date;
}

// ============================================================================
// Fiat Conversion Types
// ============================================================================

export interface TokenPrice {
  symbol: string;
  priceUsd: number;
  change24h: number;
  lastUpdated: Date;
}

export interface FiatValuation {
  tokenAmount: number;
  tokenSymbol: string;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  timestamp: Date;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: 'user' | 'enterprise' | 'system' | 'admin';
  actorId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  txHash?: string;
  blockNumber?: number;
}

export interface AuditTrail {
  entityType: string;
  entityId: string;
  entries: AuditLogEntry[];
  totalEntries: number;
}

// ============================================================================
// Transaction Traceability Types
// ============================================================================

export interface TransactionTrace {
  txHash: string;
  chainId: number;
  type: string;
  status: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  tokenAmount?: string;
  tokenSymbol?: string;
  gasUsed?: number;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: Date;
  relatedEntities: Array<{
    type: string;
    id: string;
    name?: string;
  }>;
  sourceActivity?: {
    platform: string;
    activityType: string;
    activityId: string;
    url?: string;
  };
}
