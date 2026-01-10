/**
 * @fileoverview Rate Limiting Service
 * @description Rate limiting and anti-fraud detection
 * @module lib/security/ratelimit
 */

import {
  RateLimitConfig,
  RateLimitResult,
  FraudSignal,
  FraudCheckResult,
  FraudRule,
} from './types';

// ============================================================================
// Mock Data Store
// ============================================================================

interface RateLimitStore {
  counters: Map<string, { count: number; resetAt: number }>;
  fraudRules: FraudRule[];
  blockedIps: Set<string>;
  blockedUsers: Set<string>;
}

const store: RateLimitStore = {
  counters: new Map(),
  fraudRules: [
    {
      id: 'rule-1',
      name: 'High frequency claims',
      enabled: true,
      condition: 'claims_per_minute > 10',
      action: 'review',
      severity: 'medium',
    },
    {
      id: 'rule-2',
      name: 'Multiple IPs',
      enabled: true,
      condition: 'unique_ips_per_hour > 5',
      action: 'flag',
      severity: 'low',
    },
    {
      id: 'rule-3',
      name: 'Large withdrawal',
      enabled: true,
      condition: 'withdrawal_amount > 10000',
      action: 'review',
      severity: 'high',
    },
  ],
  blockedIps: new Set(),
  blockedUsers: new Set(),
};

// Default rate limit configs
const defaultConfigs: Record<string, RateLimitConfig> = {
  claim: { windowMs: 60000, maxRequests: 10, keyPrefix: 'rl:claim:' },
  withdrawal: { windowMs: 3600000, maxRequests: 5, keyPrefix: 'rl:withdraw:' },
  api: { windowMs: 60000, maxRequests: 100, keyPrefix: 'rl:api:' },
};

// ============================================================================
// Rate Limit Service
// ============================================================================

export class RateLimitService {
  /**
   * Check rate limit for a key
   * @param key - Unique identifier (userId, IP, etc.)
   * @param configName - Rate limit config name
   * @returns Rate limit result
   */
  async checkLimit(key: string, configName: string = 'api'): Promise<RateLimitResult> {
    const config = defaultConfigs[configName] || defaultConfigs.api;
    const fullKey = `${config.keyPrefix}${key}`;
    const now = Date.now();

    let entry = store.counters.get(fullKey);

    // Reset if window expired
    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + config.windowMs,
      };
    }

    // Increment counter
    entry.count++;
    store.counters.set(fullKey, entry);

    const allowed = entry.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetAt: new Date(entry.resetAt),
      retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  /**
   * Reset rate limit for a key
   */
  async resetLimit(key: string, configName: string = 'api'): Promise<void> {
    const config = defaultConfigs[configName] || defaultConfigs.api;
    const fullKey = `${config.keyPrefix}${key}`;
    store.counters.delete(fullKey);
  }

  /**
   * Get current rate limit status
   */
  async getStatus(key: string, configName: string = 'api'): Promise<RateLimitResult> {
    const config = defaultConfigs[configName] || defaultConfigs.api;
    const fullKey = `${config.keyPrefix}${key}`;
    const now = Date.now();

    const entry = store.counters.get(fullKey);

    if (!entry || entry.resetAt <= now) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }

    return {
      allowed: entry.count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: new Date(entry.resetAt),
    };
  }


  // ==========================================================================
  // Anti-Fraud Detection
  // ==========================================================================

  /**
   * Check for fraud signals
   * @param context - Context for fraud check
   * @returns Fraud check result
   */
  async checkFraud(context: {
    userId: string;
    ipAddress: string;
    action: string;
    amount?: number;
    metadata?: Record<string, unknown>;
  }): Promise<FraudCheckResult> {
    const signals: FraudSignal[] = [];
    let totalScore = 0;

    // Check if user is blocked
    if (store.blockedUsers.has(context.userId)) {
      return {
        passed: false,
        riskScore: 100,
        signals: [{
          type: 'blocked_user',
          severity: 'critical',
          score: 100,
          description: 'User is blocked',
        }],
        action: 'block',
        reason: 'User is blocked',
      };
    }

    // Check if IP is blocked
    if (store.blockedIps.has(context.ipAddress)) {
      return {
        passed: false,
        riskScore: 100,
        signals: [{
          type: 'blocked_ip',
          severity: 'critical',
          score: 100,
          description: 'IP address is blocked',
        }],
        action: 'block',
        reason: 'IP address is blocked',
      };
    }

    // Check rate limits
    const rateResult = await this.checkLimit(context.userId, context.action);
    if (!rateResult.allowed) {
      signals.push({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        score: 30,
        description: 'Rate limit exceeded',
      });
      totalScore += 30;
    }

    // Check for large amounts
    if (context.amount && context.amount > 10000) {
      signals.push({
        type: 'large_amount',
        severity: 'high',
        score: 40,
        description: `Large amount: ${context.amount}`,
      });
      totalScore += 40;
    }

    // Check for suspicious patterns (simplified)
    if (context.metadata?.suspicious) {
      signals.push({
        type: 'suspicious_pattern',
        severity: 'high',
        score: 50,
        description: 'Suspicious activity pattern detected',
      });
      totalScore += 50;
    }

    // Determine action based on score
    let action: FraudCheckResult['action'] = 'allow';
    if (totalScore >= 70) {
      action = 'block';
    } else if (totalScore >= 30) {
      action = 'review';
    }

    return {
      passed: action === 'allow',
      riskScore: Math.min(100, totalScore),
      signals,
      action,
      reason: action !== 'allow' ? `Risk score: ${totalScore}` : undefined,
    };
  }

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    store.blockedUsers.add(userId);
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    store.blockedUsers.delete(userId);
  }

  /**
   * Block an IP address
   */
  async blockIp(ipAddress: string): Promise<void> {
    store.blockedIps.add(ipAddress);
  }

  /**
   * Unblock an IP address
   */
  async unblockIp(ipAddress: string): Promise<void> {
    store.blockedIps.delete(ipAddress);
  }

  /**
   * Check if user is blocked
   */
  isUserBlocked(userId: string): boolean {
    return store.blockedUsers.has(userId);
  }

  /**
   * Check if IP is blocked
   */
  isIpBlocked(ipAddress: string): boolean {
    return store.blockedIps.has(ipAddress);
  }

  /**
   * Get fraud rules
   */
  getFraudRules(): FraudRule[] {
    return [...store.fraudRules];
  }

  /**
   * Clear store (for testing only)
   */
  clearStore(): void {
    store.counters.clear();
    store.blockedIps.clear();
    store.blockedUsers.clear();
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();
