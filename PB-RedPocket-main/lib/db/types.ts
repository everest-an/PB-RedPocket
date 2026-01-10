/**
 * @fileoverview Database Entity Types
 * @description Type definitions for database entities with full schema support
 * @module lib/db/types
 */

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * User entity - represents a platform user
 */
export interface UserEntity {
  id: string;
  platform: Platform;
  platform_id: string;
  wallet_address?: string;
  phone_number?: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  total_claimed: number;
  total_withdrawn: number;
  created_at: Date;
  updated_at: Date;
  last_active_at: Date;
}

/**
 * Enterprise entity - represents a business account
 */
export interface EnterpriseEntity {
  id: string;
  name: string;
  email: string;
  wallet_address: string;
  api_key_hash?: string;
  balance: number;
  total_deposited: number;
  total_spent: number;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Campaign entity - represents a marketing campaign
 */
export interface CampaignEntity {
  id: string;
  enterprise_id: string;
  name: string;
  description?: string;
  total_budget: number;
  spent_budget: number;
  token_symbol: string;
  token_address: string;
  chain_id: number;
  platform: Platform;
  total_redpockets: number;
  total_claims: number;
  unique_claimers: number;
  tag?: string;
  status: CampaignStatus;
  starts_at?: Date;
  ends_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * RedPocket entity - represents a single red pocket
 */
export interface RedPocketEntity {
  id: string;
  campaign_id: string;
  enterprise_id: string;
  sender_name: string;
  sender_avatar?: string;
  total_amount: number;
  remaining_amount: number;
  token_symbol: string;
  token_address: string;
  chain_id: number;
  platform: Platform;
  platform_channel_id?: string;
  message?: string;
  tag?: string;
  total_count: number;
  claimed_count: number;
  is_lucky_draw: boolean;
  min_amount?: number;
  max_amount?: number;
  contract_address?: string;
  contract_id?: number;
  status: RedPocketStatus;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Claim entity - represents a claim record
 */
export interface ClaimEntity {
  id: string;
  redpocket_id: string;
  user_id: string;
  platform: Platform;
  platform_id: string;
  wallet_address: string;
  amount: number;
  tx_hash?: string;
  block_number?: number;
  gas_used?: number;
  gas_sponsored: boolean;
  status: ClaimStatus;
  error_message?: string;
  created_at: Date;
  completed_at?: Date;
}

/**
 * Wallet entity - represents a user's AA wallet
 */
export interface WalletEntity {
  id: string;
  user_id: string;
  address: string;
  chain_id: number;
  wallet_type: WalletType;
  is_deployed: boolean;
  salt?: string;
  init_code?: string;
  created_at: Date;
  deployed_at?: Date;
}

/**
 * Transaction entity - represents a blockchain transaction
 */
export interface TransactionEntity {
  id: string;
  user_id?: string;
  enterprise_id?: string;
  tx_hash: string;
  chain_id: number;
  from_address: string;
  to_address: string;
  value: string;
  token_address?: string;
  token_amount?: string;
  tx_type: TransactionType;
  status: TransactionStatus;
  gas_used?: number;
  gas_price?: string;
  block_number?: number;
  error_message?: string;
  created_at: Date;
  confirmed_at?: Date;
}

/**
 * AuditLog entity - represents an audit trail entry
 */
export interface AuditLogEntity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  action: AuditAction;
  actor_type: ActorType;
  actor_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}


// ============================================================================
// Enums
// ============================================================================

export enum Platform {
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  WHATSAPP = 'whatsapp',
  GITHUB = 'github',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RedPocketStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ClaimStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum WalletType {
  AA = 'aa',
  EOA = 'eoa',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  CLAIM = 'claim',
  REFUND = 'refund',
  GAS_SPONSORSHIP = 'gas_sponsorship',
  BRIDGE = 'bridge',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum EntityType {
  USER = 'user',
  ENTERPRISE = 'enterprise',
  CAMPAIGN = 'campaign',
  REDPOCKET = 'redpocket',
  CLAIM = 'claim',
  WALLET = 'wallet',
  TRANSACTION = 'transaction',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  CLAIM = 'claim',
  WITHDRAW = 'withdraw',
  DEPOSIT = 'deposit',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export enum ActorType {
  USER = 'user',
  ENTERPRISE = 'enterprise',
  SYSTEM = 'system',
  ADMIN = 'admin',
}

// ============================================================================
// Query Types
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RedPocketFilters {
  enterprise_id?: string;
  campaign_id?: string;
  platform?: Platform;
  status?: RedPocketStatus;
  chain_id?: number;
  created_after?: Date;
  created_before?: Date;
}

export interface ClaimFilters {
  redpocket_id?: string;
  user_id?: string;
  platform?: Platform;
  status?: ClaimStatus;
  created_after?: Date;
  created_before?: Date;
}

export interface CampaignFilters {
  enterprise_id?: string;
  platform?: Platform;
  status?: CampaignStatus;
  tag?: string;
}

// ============================================================================
// Aggregation Types
// ============================================================================

export interface DashboardStats {
  total_redpockets: number;
  active_redpockets: number;
  total_claims: number;
  total_distributed: number;
  unique_claimers: number;
  avg_claim_amount: number;
  claims_by_platform: Record<Platform, number>;
  claims_by_day: Array<{ date: string; count: number; amount: number }>;
}

export interface EnterpriseStats {
  total_campaigns: number;
  active_campaigns: number;
  total_redpockets: number;
  total_claims: number;
  total_spent: number;
  remaining_balance: number;
  unique_claimers: number;
  avg_claim_time: number;
}

export interface UserStats {
  total_claimed: number;
  total_withdrawn: number;
  claim_count: number;
  platforms_used: Platform[];
  first_claim_at?: Date;
  last_claim_at?: Date;
}
