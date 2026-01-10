/**
 * @fileoverview GitHub Integration Types
 * @description Type definitions for GitHub App and webhook events
 * @module lib/social/github/types
 */

// ============================================================================
// Webhook Event Types
// ============================================================================

export enum GitHubEventType {
  ISSUE_COMMENT = 'issue_comment',
  PULL_REQUEST_REVIEW_COMMENT = 'pull_request_review_comment',
  PULL_REQUEST = 'pull_request',
  ISSUES = 'issues',
  PUSH = 'push',
  INSTALLATION = 'installation',
}

export enum GitHubAction {
  CREATED = 'created',
  EDITED = 'edited',
  DELETED = 'deleted',
  OPENED = 'opened',
  CLOSED = 'closed',
  MERGED = 'merged',
  LABELED = 'labeled',
}

// ============================================================================
// User and Repository Types
// ============================================================================

export interface GitHubUser {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url: string;
  html_url: string;
  type: 'User' | 'Bot' | 'Organization';
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  html_url: string;
  description?: string;
  private: boolean;
  default_branch: string;
}

export interface GitHubInstallation {
  id: number;
  account: GitHubUser;
  repository_selection: 'all' | 'selected';
  permissions: Record<string, string>;
  events: string[];
}

// ============================================================================
// Issue and PR Types
// ============================================================================

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  user: GitHubUser;
  html_url: string;
  state: 'open' | 'closed';
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body?: string;
  user: GitHubUser;
  html_url: string;
  state: 'open' | 'closed';
  merged: boolean;
  merged_at?: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
}

export interface GitHubComment {
  id: number;
  body: string;
  user: GitHubUser;
  html_url: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

export interface GitHubWebhookPayload {
  action: GitHubAction;
  sender: GitHubUser;
  repository: GitHubRepository;
  installation?: GitHubInstallation;
}

export interface IssueCommentPayload extends GitHubWebhookPayload {
  issue: GitHubIssue;
  comment: GitHubComment;
}

export interface PullRequestPayload extends GitHubWebhookPayload {
  pull_request: GitHubPullRequest;
  number: number;
}

export interface PullRequestReviewCommentPayload extends GitHubWebhookPayload {
  pull_request: GitHubPullRequest;
  comment: GitHubComment;
}

export interface InstallationPayload extends GitHubWebhookPayload {
  installation: GitHubInstallation;
  repositories?: GitHubRepository[];
}

// ============================================================================
// Reward Command Types
// ============================================================================

export interface RewardCommand {
  type: 'tip' | 'bounty' | 'reward';
  amount: number;
  token: string;
  recipient?: string; // GitHub username
  reason?: string;
}

/**
 * Parse reward command from comment body
 * Supported formats:
 * - @ProtocolBankBot tip @user 10 USDT
 * - @ProtocolBankBot reward 50 USDT for fixing the bug
 * - @ProtocolBankBot bounty 100 USDT
 */
export function parseRewardCommand(body: string, botUsername: string = 'ProtocolBankBot'): RewardCommand | null {
  const mentionPattern = new RegExp(`@${botUsername}\\s+(tip|reward|bounty)\\s+`, 'i');
  const match = body.match(mentionPattern);
  
  if (!match) return null;

  const commandType = match[1].toLowerCase() as RewardCommand['type'];
  const afterCommand = body.slice(match.index! + match[0].length);

  // Parse recipient (optional @username)
  let recipient: string | undefined;
  const recipientMatch = afterCommand.match(/^@(\w+)\s+/);
  const remaining = recipientMatch 
    ? afterCommand.slice(recipientMatch[0].length)
    : afterCommand;

  if (recipientMatch) {
    recipient = recipientMatch[1];
  }

  // Parse amount and token
  const amountMatch = remaining.match(/^(\d+\.?\d*)\s*(\w+)/);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  const token = amountMatch[2].toUpperCase();

  // Parse reason (optional, after "for")
  let reason: string | undefined;
  const reasonMatch = remaining.match(/\s+for\s+(.+)$/i);
  if (reasonMatch) {
    reason = reasonMatch[1].trim();
  }

  return {
    type: commandType,
    amount,
    token,
    recipient,
    reason,
  };
}

// ============================================================================
// GitHub App Configuration
// ============================================================================

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
  clientId: string;
  clientSecret: string;
  botUsername: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface GitHubCommentResponse {
  id: number;
  html_url: string;
  body: string;
}

export interface GitHubReactionResponse {
  id: number;
  content: string;
}

// Supported reactions
export type GitHubReaction = '+1' | '-1' | 'laugh' | 'confused' | 'heart' | 'hooray' | 'rocket' | 'eyes';
