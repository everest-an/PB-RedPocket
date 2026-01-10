/**
 * @fileoverview Security Types
 * @description Type definitions for security framework
 * @module lib/security/types
 */

// ============================================================================
// Multi-Signature Types
// ============================================================================

export interface MultiSigWallet {
  id: string;
  enterpriseId: string;
  address: string;
  signers: string[];
  threshold: number;
  createdAt: Date;
}

export interface MultiSigTransaction {
  id: string;
  walletId: string;
  to: string;
  value: string;
  data: string;
  nonce: number;
  signatures: MultiSigSignature[];
  status: 'pending' | 'executed' | 'cancelled';
  createdAt: Date;
  executedAt?: Date;
}

export interface MultiSigSignature {
  signer: string;
  signature: string;
  signedAt: Date;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix: string;     // Redis key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

// ============================================================================
// Anti-Fraud Types
// ============================================================================

export interface FraudSignal {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface FraudCheckResult {
  passed: boolean;
  riskScore: number;
  signals: FraudSignal[];
  action: 'allow' | 'review' | 'block';
  reason?: string;
}

export interface FraudRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: string;
  action: 'flag' | 'review' | 'block';
  severity: FraudSignal['severity'];
}

// ============================================================================
// Identity Validation Types
// ============================================================================

export interface IdentityValidation {
  platform: string;
  platformId: string;
  isValid: boolean;
  verifiedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface OAuthTokenValidation {
  valid: boolean;
  expired: boolean;
  scopes: string[];
  userId?: string;
  expiresAt?: Date;
}

// ============================================================================
// Security Event Types
// ============================================================================

export interface SecurityEvent {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  FRAUD_DETECTED = 'fraud_detected',
  MULTISIG_SIGNED = 'multisig_signed',
  MULTISIG_EXECUTED = 'multisig_executed',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  IDENTITY_VERIFIED = 'identity_verified',
  IDENTITY_FAILED = 'identity_failed',
}
