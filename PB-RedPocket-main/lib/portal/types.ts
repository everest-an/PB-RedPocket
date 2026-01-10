/**
 * @fileoverview User Portal Types
 * @description Type definitions for user portal and withdrawal system
 * @module lib/portal/types
 */

// ============================================================================
// User Identity Types
// ============================================================================

export interface SocialIdentity {
  platform: 'telegram' | 'discord' | 'whatsapp' | 'github';
  platformId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  linkedAt: Date;
  verified: boolean;
}

export interface UserProfile {
  userId: string;
  primaryIdentity: SocialIdentity;
  linkedIdentities: SocialIdentity[];
  walletAddress?: string;
  aaWalletAddress?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

// ============================================================================
// Reward Aggregation Types
// ============================================================================

export interface RewardSummary {
  totalClaimed: number;
  totalPending: number;
  totalWithdrawn: number;
  availableBalance: number;
  currency: string;
}

export interface RewardByToken {
  tokenSymbol: string;
  tokenAddress: string;
  chainId: number;
  claimed: number;
  pending: number;
  withdrawn: number;
  available: number;
  fiatValue?: number;
}

export interface RewardByPlatform {
  platform: string;
  totalClaimed: number;
  claimCount: number;
  lastClaimAt?: Date;
}

export interface ClaimHistory {
  id: string;
  redPocketId: string;
  amount: number;
  tokenSymbol: string;
  platform: string;
  claimedAt: Date;
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface UserDashboard {
  profile: UserProfile;
  rewardSummary: RewardSummary;
  rewardsByToken: RewardByToken[];
  rewardsByPlatform: RewardByPlatform[];
  recentClaims: ClaimHistory[];
  pendingWithdrawals: WithdrawalRequest[];
}

// ============================================================================
// Withdrawal Types
// ============================================================================

export enum WithdrawalType {
  WALLET = 'wallet',      // Transfer to external Web3 wallet
  FIAT = 'fiat',          // Off-ramp to fiat currency
  INTERNAL = 'internal',  // Transfer to another user
}

export enum WithdrawalStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  type: WithdrawalType;
  amount: number;
  tokenSymbol: string;
  chainId: number;
  destination: string;
  status: WithdrawalStatus;
  txHash?: string;
  fee: number;
  netAmount: number;
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;
}

export interface WithdrawalOptions {
  type: WithdrawalType;
  amount: number;
  tokenSymbol: string;
  chainId?: number;
  destination: string;
  fiatCurrency?: string;
}

export interface WithdrawalFeeEstimate {
  gasFee: number;
  platformFee: number;
  bridgeFee: number;
  totalFee: number;
  netAmount: number;
  estimatedTime: string;
}

// ============================================================================
// Account Merge Types
// ============================================================================

export interface MergeRequest {
  id: string;
  sourceUserId: string;
  targetUserId: string;
  sourceIdentity: SocialIdentity;
  targetIdentity: SocialIdentity;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  verificationCode?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface MergeResult {
  success: boolean;
  mergedUserId: string;
  totalIdentities: number;
  totalBalance: number;
  message: string;
}

// ============================================================================
// Fiat Off-Ramp Types
// ============================================================================

export interface FiatProvider {
  id: string;
  name: string;
  supportedCurrencies: string[];
  supportedTokens: string[];
  minAmount: number;
  maxAmount: number;
  feePercentage: number;
  estimatedTime: string;
}

export interface FiatQuote {
  providerId: string;
  tokenAmount: number;
  tokenSymbol: string;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  fee: number;
  expiresAt: Date;
}
