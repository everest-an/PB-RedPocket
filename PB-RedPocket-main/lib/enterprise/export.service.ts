/**
 * @fileoverview Export Service
 * @description Generate CSV/PDF/Excel exports for financial reports
 * @module lib/enterprise/export
 */

import {
  ExportFormat,
  ExportOptions,
  ExportResult,
  DateRange,
  ProfitLossStatement,
  CashFlowStatement,
  CampaignMetrics,
  RecentActivity,
} from './types';
import { reportingService } from './reporting.service';

// ============================================================================
// Export Service
// ============================================================================

export class ExportService {
  /**
   * Export financial report
   * @param enterpriseId - Enterprise ID
   * @param reportType - Type of report to export
   * @param options - Export options
   * @returns Export result with download URL
   */
  async exportReport(
    enterpriseId: string,
    reportType: 'pnl' | 'cashflow' | 'campaigns' | 'transactions',
    options: ExportOptions
  ): Promise<ExportResult> {
    let content: string;
    let filename: string;

    switch (reportType) {
      case 'pnl':
        content = await this.generatePnLExport(enterpriseId, options);
        filename = `pnl_report_${this.formatDateForFilename(options.dateRange)}`;
        break;
      case 'cashflow':
        content = await this.generateCashFlowExport(enterpriseId, options);
        filename = `cashflow_report_${this.formatDateForFilename(options.dateRange)}`;
        break;
      case 'campaigns':
        content = await this.generateCampaignsExport(enterpriseId, options);
        filename = `campaigns_report_${this.formatDateForFilename(options.dateRange)}`;
        break;
      case 'transactions':
        content = await this.generateTransactionsExport(enterpriseId, options);
        filename = `transactions_${this.formatDateForFilename(options.dateRange)}`;
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Add file extension
    filename += `.${options.format}`;

    // In production, upload to S3/cloud storage and return URL
    // For now, return mock result
    return {
      filename,
      format: options.format,
      size: content.length,
      url: `https://exports.protocolbanks.com/${enterpriseId}/${filename}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };
  }

  /**
   * Generate P&L export
   */
  private async generatePnLExport(
    enterpriseId: string,
    options: ExportOptions
  ): Promise<string> {
    const pnl = await reportingService.getProfitLossStatement(enterpriseId, options.dateRange);

    if (options.format === ExportFormat.CSV) {
      return this.pnlToCSV(pnl, options);
    } else if (options.format === ExportFormat.JSON) {
      return JSON.stringify(pnl, null, 2);
    }

    // For PDF/Excel, return placeholder (would use actual library in production)
    return this.pnlToCSV(pnl, options);
  }

  /**
   * Generate cash flow export
   */
  private async generateCashFlowExport(
    enterpriseId: string,
    options: ExportOptions
  ): Promise<string> {
    const cashflow = await reportingService.getCashFlowStatement(enterpriseId, options.dateRange);

    if (options.format === ExportFormat.CSV) {
      return this.cashFlowToCSV(cashflow, options);
    } else if (options.format === ExportFormat.JSON) {
      return JSON.stringify(cashflow, null, 2);
    }

    return this.cashFlowToCSV(cashflow, options);
  }

  /**
   * Generate campaigns export
   */
  private async generateCampaignsExport(
    enterpriseId: string,
    options: ExportOptions
  ): Promise<string> {
    const campaigns = await reportingService.getCampaignMetrics(enterpriseId);

    if (options.format === ExportFormat.CSV) {
      return this.campaignsToCSV(campaigns, options);
    } else if (options.format === ExportFormat.JSON) {
      return JSON.stringify(campaigns, null, 2);
    }

    return this.campaignsToCSV(campaigns, options);
  }

  /**
   * Generate transactions export
   */
  private async generateTransactionsExport(
    enterpriseId: string,
    options: ExportOptions
  ): Promise<string> {
    const activities = await reportingService.getRecentActivity(enterpriseId, 1000);

    // Filter by date range
    const filtered = activities.filter(
      a => a.timestamp >= options.dateRange.startDate && a.timestamp <= options.dateRange.endDate
    );

    if (options.format === ExportFormat.CSV) {
      return this.transactionsToCSV(filtered, options);
    } else if (options.format === ExportFormat.JSON) {
      return JSON.stringify(filtered, null, 2);
    }

    return this.transactionsToCSV(filtered, options);
  }

  // ==========================================================================
  // CSV Formatters
  // ==========================================================================

  /**
   * Convert P&L to CSV
   */
  private pnlToCSV(pnl: ProfitLossStatement, options: ExportOptions): string {
    const lines: string[] = [];

    // Header
    lines.push('Profit & Loss Statement');
    lines.push(`Period: ${pnl.period.startDate.toISOString().split('T')[0]} to ${pnl.period.endDate.toISOString().split('T')[0]}`);
    lines.push('');

    // Revenue section
    lines.push('REVENUE');
    lines.push(`Deposits,${pnl.revenue.deposits}`);
    lines.push(`Refunds,${pnl.revenue.refunds}`);
    lines.push(`Total Revenue,${pnl.revenue.total}`);
    lines.push('');

    // Expenses section
    lines.push('EXPENSES');
    lines.push(`Distributions,${pnl.expenses.distributions}`);
    lines.push(`Gas Fees,${pnl.expenses.gasFees}`);
    lines.push(`Platform Fees,${pnl.expenses.platformFees}`);
    lines.push(`Bridge Fees,${pnl.expenses.bridgeFees}`);
    lines.push(`Total Expenses,${pnl.expenses.total}`);
    lines.push('');

    // Net income
    lines.push(`NET INCOME,${pnl.netIncome}`);
    lines.push(`Currency,${pnl.currency}`);

    return lines.join('\n');
  }

  /**
   * Convert cash flow to CSV
   */
  private cashFlowToCSV(cashflow: CashFlowStatement, options: ExportOptions): string {
    const lines: string[] = [];

    lines.push('Cash Flow Statement');
    lines.push(`Period: ${cashflow.period.startDate.toISOString().split('T')[0]} to ${cashflow.period.endDate.toISOString().split('T')[0]}`);
    lines.push('');

    lines.push('OPERATING ACTIVITIES');
    lines.push(`Deposits Received,${cashflow.operatingActivities.depositsReceived}`);
    lines.push(`Distributions Paid,${cashflow.operatingActivities.distributionsPaid}`);
    lines.push(`Fees Paid,${cashflow.operatingActivities.feesPaid}`);
    lines.push(`Net Cash from Operations,${cashflow.operatingActivities.netCashFromOperations}`);
    lines.push('');

    lines.push('INVESTING ACTIVITIES');
    lines.push(`Bridge Transfers Out,${cashflow.investingActivities.bridgeTransfersOut}`);
    lines.push(`Bridge Transfers In,${cashflow.investingActivities.bridgeTransfersIn}`);
    lines.push(`Net Cash from Investing,${cashflow.investingActivities.netCashFromInvesting}`);
    lines.push('');

    lines.push(`Net Cash Change,${cashflow.netCashChange}`);
    lines.push(`Beginning Balance,${cashflow.beginningBalance}`);
    lines.push(`Ending Balance,${cashflow.endingBalance}`);
    lines.push(`Currency,${cashflow.currency}`);

    return lines.join('\n');
  }

  /**
   * Convert campaigns to CSV
   */
  private campaignsToCSV(campaigns: CampaignMetrics[], options: ExportOptions): string {
    const headers = [
      'Campaign ID',
      'Campaign Name',
      'Platform',
      'Status',
      'Total Budget',
      'Spent Budget',
      'Remaining Budget',
      'Total RedPockets',
      'Total Claims',
      'Unique Claimers',
      'Claim Rate',
      'Avg Claim Amount',
      'Start Date',
      'End Date',
    ];

    const lines: string[] = [headers.join(',')];

    for (const c of campaigns) {
      lines.push([
        c.campaignId,
        `"${c.campaignName}"`,
        c.platform,
        c.status,
        c.totalBudget.toFixed(2),
        c.spentBudget.toFixed(2),
        c.remainingBudget.toFixed(2),
        c.totalRedPockets,
        c.totalClaims,
        c.uniqueClaimers,
        (c.claimRate * 100).toFixed(1) + '%',
        c.avgClaimAmount.toFixed(2),
        c.startDate.toISOString().split('T')[0],
        c.endDate?.toISOString().split('T')[0] || '',
      ].join(','));
    }

    return lines.join('\n');
  }

  /**
   * Convert transactions to CSV
   */
  private transactionsToCSV(transactions: RecentActivity[], options: ExportOptions): string {
    const headers = [
      'ID',
      'Type',
      'Amount',
      'Token',
      'Description',
      'Timestamp',
      'TX Hash',
    ];

    if (options.includeFiatValues) {
      headers.push('Fiat Value', 'Fiat Currency');
    }

    const lines: string[] = [headers.join(',')];

    for (const t of transactions) {
      const row = [
        t.id,
        t.type,
        t.amount.toFixed(4),
        t.tokenSymbol,
        `"${t.description}"`,
        t.timestamp.toISOString(),
        t.txHash || '',
      ];

      if (options.includeFiatValues) {
        // Mock fiat conversion
        const fiatValue = t.tokenSymbol === 'USDT' ? t.amount : t.amount * 1800;
        row.push(fiatValue.toFixed(2), options.fiatCurrency);
      }

      lines.push(row.join(','));
    }

    return lines.join('\n');
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Format date range for filename
   */
  private formatDateForFilename(dateRange: DateRange): string {
    const start = dateRange.startDate.toISOString().split('T')[0].replace(/-/g, '');
    const end = dateRange.endDate.toISOString().split('T')[0].replace(/-/g, '');
    return `${start}_${end}`;
  }
}

// Export singleton instance
export const exportService = new ExportService();
