/**
 * @fileoverview Audit Service
 * @description Audit logging and transaction traceability for compliance
 * @module lib/enterprise/audit
 */

import {
  AuditLogEntry,
  AuditTrail,
  TransactionTrace,
} from './types';

// ============================================================================
// Audit Log Storage (Replace with actual DB in production)
// ============================================================================

interface AuditStore {
  entries: AuditLogEntry[];
  traces: TransactionTrace[];
}

const auditStore: AuditStore = {
  entries: [],
  traces: [],
};

// ============================================================================
// Audit Service
// ============================================================================

export class AuditService {
  /**
   * Log an audit event
   * @param entry - Audit log entry (without id and timestamp)
   * @returns Created audit log entry
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Store in memory (replace with DB insert in production)
    auditStore.entries.push(fullEntry);

    // If blockchain anchoring is enabled, submit hash to chain
    if (entry.txHash) {
      await this.anchorToBlockchain(fullEntry);
    }

    return fullEntry;
  }

  /**
   * Log entity creation
   */
  async logCreate(
    entityType: string,
    entityId: string,
    actorType: AuditLogEntry['actorType'],
    actorId: string,
    newValue: Record<string, unknown>,
    metadata?: { ipAddress?: string; userAgent?: string; txHash?: string }
  ): Promise<AuditLogEntry> {
    return this.log({
      entityType,
      entityId,
      action: 'CREATE',
      actorType,
      actorId,
      newValue,
      ...metadata,
    });
  }


  /**
   * Log entity update
   */
  async logUpdate(
    entityType: string,
    entityId: string,
    actorType: AuditLogEntry['actorType'],
    actorId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    metadata?: { ipAddress?: string; userAgent?: string; txHash?: string }
  ): Promise<AuditLogEntry> {
    return this.log({
      entityType,
      entityId,
      action: 'UPDATE',
      actorType,
      actorId,
      oldValue,
      newValue,
      ...metadata,
    });
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: string,
    entityId: string,
    actorType: AuditLogEntry['actorType'],
    actorId: string,
    oldValue: Record<string, unknown>,
    metadata?: { ipAddress?: string; userAgent?: string; txHash?: string }
  ): Promise<AuditLogEntry> {
    return this.log({
      entityType,
      entityId,
      action: 'DELETE',
      actorType,
      actorId,
      oldValue,
      ...metadata,
    });
  }

  /**
   * Log a claim event
   */
  async logClaim(
    redPocketId: string,
    claimerId: string,
    amount: number,
    tokenSymbol: string,
    platform: string,
    txHash?: string
  ): Promise<AuditLogEntry> {
    return this.log({
      entityType: 'claim',
      entityId: this.generateId(),
      action: 'CLAIM',
      actorType: 'user',
      actorId: claimerId,
      newValue: {
        redPocketId,
        amount,
        tokenSymbol,
        platform,
        txHash,
      },
      txHash,
    });
  }

  /**
   * Log a withdrawal event
   */
  async logWithdrawal(
    userId: string,
    amount: number,
    tokenSymbol: string,
    destinationType: 'wallet' | 'fiat',
    destination: string,
    txHash?: string
  ): Promise<AuditLogEntry> {
    return this.log({
      entityType: 'withdrawal',
      entityId: this.generateId(),
      action: 'WITHDRAW',
      actorType: 'user',
      actorId: userId,
      newValue: {
        amount,
        tokenSymbol,
        destinationType,
        destination,
        txHash,
      },
      txHash,
    });
  }

  /**
   * Get audit trail for an entity
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @returns Audit trail
   */
  async getAuditTrail(entityType: string, entityId: string): Promise<AuditTrail> {
    const entries = auditStore.entries.filter(
      e => e.entityType === entityType && e.entityId === entityId
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      entityType,
      entityId,
      entries,
      totalEntries: entries.length,
    };
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(filters: {
    entityType?: string;
    actorType?: AuditLogEntry['actorType'];
    actorId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: AuditLogEntry[]; total: number }> {
    let entries = [...auditStore.entries];

    // Apply filters
    if (filters.entityType) {
      entries = entries.filter(e => e.entityType === filters.entityType);
    }
    if (filters.actorType) {
      entries = entries.filter(e => e.actorType === filters.actorType);
    }
    if (filters.actorId) {
      entries = entries.filter(e => e.actorId === filters.actorId);
    }
    if (filters.action) {
      entries = entries.filter(e => e.action === filters.action);
    }
    if (filters.startDate) {
      entries = entries.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      entries = entries.filter(e => e.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = entries.length;

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    entries = entries.slice(offset, offset + limit);

    return { entries, total };
  }


  // ==========================================================================
  // Transaction Traceability
  // ==========================================================================

  /**
   * Record a transaction trace
   * @param trace - Transaction trace data
   * @returns Stored trace
   */
  async recordTrace(trace: Omit<TransactionTrace, 'timestamp'>): Promise<TransactionTrace> {
    const fullTrace: TransactionTrace = {
      ...trace,
      timestamp: new Date(),
    };

    auditStore.traces.push(fullTrace);
    return fullTrace;
  }

  /**
   * Get transaction trace by hash
   * @param txHash - Transaction hash
   * @returns Transaction trace or null
   */
  async getTrace(txHash: string): Promise<TransactionTrace | null> {
    return auditStore.traces.find(t => t.txHash === txHash) || null;
  }

  /**
   * Get traces for an entity
   * @param entityType - Entity type (redpocket, claim, withdrawal, etc.)
   * @param entityId - Entity ID
   * @returns Related transaction traces
   */
  async getTracesForEntity(entityType: string, entityId: string): Promise<TransactionTrace[]> {
    return auditStore.traces.filter(t =>
      t.relatedEntities.some(e => e.type === entityType && e.id === entityId)
    );
  }

  /**
   * Link transaction to source activity
   * @param txHash - Transaction hash
   * @param sourceActivity - Source platform activity
   */
  async linkToSourceActivity(
    txHash: string,
    sourceActivity: TransactionTrace['sourceActivity']
  ): Promise<void> {
    const trace = auditStore.traces.find(t => t.txHash === txHash);
    if (trace) {
      trace.sourceActivity = sourceActivity;
    }
  }

  /**
   * Get full transaction history for a user
   * @param userId - User ID
   * @returns All traces related to user
   */
  async getUserTransactionHistory(userId: string): Promise<TransactionTrace[]> {
    return auditStore.traces.filter(t =>
      t.relatedEntities.some(e => e.type === 'user' && e.id === userId)
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ==========================================================================
  // Compliance Reporting
  // ==========================================================================

  /**
   * Generate compliance report for a date range
   */
  async generateComplianceReport(
    enterpriseId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<{
    totalTransactions: number;
    totalVolume: number;
    uniqueUsers: number;
    platformBreakdown: Record<string, number>;
    actionBreakdown: Record<string, number>;
    flaggedActivities: AuditLogEntry[];
  }> {
    const { entries } = await this.queryLogs({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

    // Filter by enterprise (in production, add enterprise filter to query)
    const enterpriseEntries = entries.filter(e => {
      const value = e.newValue || e.oldValue;
      return value && (value as Record<string, unknown>).enterpriseId === enterpriseId;
    });

    // Calculate metrics
    const uniqueUsers = new Set(
      enterpriseEntries.filter(e => e.actorType === 'user').map(e => e.actorId)
    ).size;

    const platformBreakdown: Record<string, number> = {};
    const actionBreakdown: Record<string, number> = {};

    let totalVolume = 0;

    for (const entry of enterpriseEntries) {
      // Count by action
      actionBreakdown[entry.action] = (actionBreakdown[entry.action] || 0) + 1;

      // Count by platform
      const platform = (entry.newValue as Record<string, unknown>)?.platform as string;
      if (platform) {
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      }

      // Sum volume
      const amount = (entry.newValue as Record<string, unknown>)?.amount as number;
      if (amount) {
        totalVolume += amount;
      }
    }

    // Flag suspicious activities (simplified)
    const flaggedActivities = enterpriseEntries.filter(e => {
      const amount = (e.newValue as Record<string, unknown>)?.amount as number;
      return amount && amount > 10000; // Flag large transactions
    });

    return {
      totalTransactions: enterpriseEntries.length,
      totalVolume,
      uniqueUsers,
      platformBreakdown,
      actionBreakdown,
      flaggedActivities,
    };
  }

  // ==========================================================================
  // Blockchain Anchoring
  // ==========================================================================

  /**
   * Anchor audit log hash to blockchain
   * @param entry - Audit log entry
   */
  private async anchorToBlockchain(entry: AuditLogEntry): Promise<void> {
    // In production, compute hash of entry and submit to blockchain
    // This creates an immutable proof of the audit log
    const hash = this.computeHash(entry);
    
    // TODO: Submit hash to smart contract
    console.log(`Anchoring audit entry ${entry.id} with hash ${hash}`);
  }

  /**
   * Verify audit log integrity against blockchain
   * @param entryId - Audit log entry ID
   * @returns Verification result
   */
  async verifyIntegrity(entryId: string): Promise<{
    valid: boolean;
    blockchainHash?: string;
    computedHash?: string;
    blockNumber?: number;
  }> {
    const entry = auditStore.entries.find(e => e.id === entryId);
    if (!entry) {
      return { valid: false };
    }

    const computedHash = this.computeHash(entry);

    // TODO: Fetch hash from blockchain and compare
    // For now, return mock verification
    return {
      valid: true,
      computedHash,
      blockchainHash: computedHash,
      blockNumber: entry.blockNumber,
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private computeHash(entry: AuditLogEntry): string {
    // Simplified hash computation (use crypto in production)
    const data = JSON.stringify({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorType: entry.actorType,
      actorId: entry.actorId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      timestamp: entry.timestamp.toISOString(),
    });
    
    // Simple hash for demo (use SHA-256 in production)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Clear audit store (for testing only)
   */
  clearStore(): void {
    auditStore.entries = [];
    auditStore.traces = [];
  }
}

// Export singleton instance
export const auditService = new AuditService();
