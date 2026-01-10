/**
 * @fileoverview Authentication Types
 * @description Type definitions for OAuth2 and social platform authentication
 * @module lib/auth/types
 */

// ============================================================================
// Platform Types
// ============================================================================

export enum AuthPlatform {
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  GITHUB = 'github',
  WHATSAPP = 'whatsapp',
}

// ============================================================================
// OAuth Token Types
// ============================================================================

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope?: string;
}

export interface OAuthTokenEntity {
  id: string;
  userId: string;
  platform: AuthPlatform;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: Date;
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Platform User Types
// ============================================================================

export interface PlatformUser {
  platform: AuthPlatform;
  platformId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  phoneNumber?: string;
  isVerified: boolean;
  rawData?: Record<string, unknown>;
}

// ============================================================================
// Telegram Types
// ============================================================================

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: TelegramChat;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: TelegramMessageEntity[];
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

// ============================================================================
// Discord Types
// ============================================================================

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  bot?: boolean;
  email?: string;
  verified?: boolean;
  locale?: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  owner_id: string;
}

export interface DiscordInteraction {
  id: string;
  type: number;
  token: string;
  guild_id?: string;
  channel_id?: string;
  member?: DiscordMember;
  user?: DiscordUser;
  data?: DiscordInteractionData;
}

export interface DiscordMember {
  user: DiscordUser;
  nick?: string;
  roles: string[];
  joined_at: string;
}

export interface DiscordInteractionData {
  id: string;
  name: string;
  type: number;
  options?: DiscordCommandOption[];
}

export interface DiscordCommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
}

// ============================================================================
// GitHub Types
// ============================================================================

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface GitHubWebhookPayload {
  action: string;
  sender: GitHubUser;
  repository?: GitHubRepository;
  issue?: GitHubIssue;
  pull_request?: GitHubPullRequest;
  comment?: GitHubComment;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  html_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  user: GitHubUser;
  html_url: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  user: GitHubUser;
  html_url: string;
  merged?: boolean;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  html_url: string;
}

// ============================================================================
// WhatsApp Types
// ============================================================================

export interface WhatsAppUser {
  wa_id: string;
  profile?: {
    name: string;
  };
}

export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'button';
  text?: {
    body: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WhatsAppUser[];
    messages?: WhatsAppMessage[];
    statuses?: WhatsAppStatus[];
  };
  field: string;
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEvent {
  id: string;
  platform: AuthPlatform;
  eventType: string;
  payload: Record<string, unknown>;
  signature?: string;
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
  error?: string;
}

// ============================================================================
// Identity Binding Types
// ============================================================================

export interface IdentityBinding {
  userId: string;
  platform: AuthPlatform;
  platformId: string;
  walletAddress: string;
  isPrimary: boolean;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface IdentityMergeRequest {
  sourceUserId: string;
  targetUserId: string;
  sourcePlatform: AuthPlatform;
  targetPlatform: AuthPlatform;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Auth Result Types
// ============================================================================

export interface AuthResult {
  success: boolean;
  user?: PlatformUser;
  token?: OAuthToken;
  walletAddress?: string;
  isNewUser?: boolean;
  error?: string;
}

export interface ClaimAuthResult extends AuthResult {
  canClaim: boolean;
  claimError?: string;
}
