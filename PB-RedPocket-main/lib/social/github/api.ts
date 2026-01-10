/**
 * @fileoverview GitHub API Client
 * @description API client for GitHub App and REST API
 * @module lib/social/github/api
 */

import { authConfig } from '../../auth/config';
import {
  GitHubUser,
  GitHubCommentResponse,
  GitHubReactionResponse,
  GitHubReaction,
} from './types';

// ============================================================================
// API Client
// ============================================================================

export class GitHubAPI {
  private baseUrl: string = 'https://api.github.com';
  private appId: string;
  private privateKey: string;
  private installationToken?: string;
  private tokenExpiresAt?: Date;

  constructor(appId?: string, privateKey?: string) {
    this.appId = appId || authConfig.github.appId;
    this.privateKey = privateKey || authConfig.github.privateKey;
  }

  /**
   * Make authenticated API request to GitHub
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param body - Request body
   * @param token - Access token (installation or user)
   * @returns API response
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    token?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const accessToken = token || this.installationToken;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==========================================================================
  // Installation Token Management
  // ==========================================================================

  /**
   * Get installation access token
   * @param installationId - GitHub App installation ID
   */
  async getInstallationToken(installationId: number): Promise<string> {
    // Check if we have a valid cached token
    if (this.installationToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.installationToken;
    }

    // Generate JWT for app authentication
    const jwt = await this.generateAppJWT();

    // Get installation token
    const response = await this.request<{
      token: string;
      expires_at: string;
    }>(
      'POST',
      `/app/installations/${installationId}/access_tokens`,
      undefined,
      jwt
    );

    this.installationToken = response.token;
    this.tokenExpiresAt = new Date(response.expires_at);

    return this.installationToken;
  }

  /**
   * Generate JWT for GitHub App authentication
   */
  private async generateAppJWT(): Promise<string> {
    // In production, use a proper JWT library
    // This is a simplified implementation
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued 60 seconds ago
      exp: now + 600, // Expires in 10 minutes
      iss: this.appId,
    };

    // For now, return a placeholder
    // In production, sign with RS256 using the private key
    return `app-jwt-${this.appId}-${now}`;
  }

  /**
   * Set installation token directly (for testing or when token is provided)
   */
  setInstallationToken(token: string, expiresAt?: Date): void {
    this.installationToken = token;
    this.tokenExpiresAt = expiresAt || new Date(Date.now() + 3600000);
  }

  // ==========================================================================
  // User Operations
  // ==========================================================================

  /**
   * Get user by username
   * @param username - GitHub username
   */
  async getUser(username: string): Promise<GitHubUser> {
    return this.request('GET', `/users/${username}`);
  }

  /**
   * Get authenticated user
   * @param token - User access token
   */
  async getAuthenticatedUser(token: string): Promise<GitHubUser> {
    return this.request('GET', '/user', undefined, token);
  }

  /**
   * Get user's primary email
   * @param token - User access token
   */
  async getUserEmail(token: string): Promise<string | null> {
    const emails = await this.request<Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>>('GET', '/user/emails', undefined, token);

    const primary = emails.find(e => e.primary && e.verified);
    return primary?.email || null;
  }

  // ==========================================================================
  // Comment Operations
  // ==========================================================================

  /**
   * Create a comment on an issue
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Issue number
   * @param body - Comment body
   */
  async createIssueComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<GitHubCommentResponse> {
    return this.request(
      'POST',
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      { body }
    );
  }

  /**
   * Update a comment
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param commentId - Comment ID
   * @param body - New comment body
   */
  async updateComment(
    owner: string,
    repo: string,
    commentId: number,
    body: string
  ): Promise<GitHubCommentResponse> {
    return this.request(
      'PATCH',
      `/repos/${owner}/${repo}/issues/comments/${commentId}`,
      { body }
    );
  }

  /**
   * Add reaction to a comment
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param commentId - Comment ID
   * @param reaction - Reaction type
   */
  async addCommentReaction(
    owner: string,
    repo: string,
    commentId: number,
    reaction: GitHubReaction
  ): Promise<GitHubReactionResponse> {
    return this.request(
      'POST',
      `/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`,
      { content: reaction }
    );
  }

  // ==========================================================================
  // Pull Request Operations
  // ==========================================================================

  /**
   * Create a review comment on a PR
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - PR number
   * @param body - Comment body
   * @param commitId - Commit SHA
   * @param path - File path
   * @param line - Line number
   */
  async createPRReviewComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    commitId: string,
    path: string,
    line: number
  ): Promise<GitHubCommentResponse> {
    return this.request(
      'POST',
      `/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      { body, commit_id: commitId, path, line }
    );
  }

  /**
   * Get PR details
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - PR number
   */
  async getPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{
    id: number;
    number: number;
    title: string;
    user: GitHubUser;
    merged: boolean;
    merged_by?: GitHubUser;
  }> {
    return this.request('GET', `/repos/${owner}/${repo}/pulls/${prNumber}`);
  }

  // ==========================================================================
  // Repository Operations
  // ==========================================================================

  /**
   * Get repository details
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  async getRepository(
    owner: string,
    repo: string
  ): Promise<{
    id: number;
    name: string;
    full_name: string;
    owner: GitHubUser;
    private: boolean;
  }> {
    return this.request('GET', `/repos/${owner}/${repo}`);
  }

  /**
   * List repository contributors
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  async getContributors(
    owner: string,
    repo: string
  ): Promise<Array<GitHubUser & { contributions: number }>> {
    return this.request('GET', `/repos/${owner}/${repo}/contributors`);
  }

  // ==========================================================================
  // App Installation Operations
  // ==========================================================================

  /**
   * Get app installation for a repository
   * @param owner - Repository owner
   * @param repo - Repository name
   */
  async getRepoInstallation(
    owner: string,
    repo: string
  ): Promise<{ id: number; account: GitHubUser }> {
    const jwt = await this.generateAppJWT();
    return this.request('GET', `/repos/${owner}/${repo}/installation`, undefined, jwt);
  }

  /**
   * List installations for the app
   */
  async listInstallations(): Promise<Array<{ id: number; account: GitHubUser }>> {
    const jwt = await this.generateAppJWT();
    const response = await this.request<{ installations: Array<{ id: number; account: GitHubUser }> }>(
      'GET',
      '/app/installations',
      undefined,
      jwt
    );
    return response.installations;
  }
}

// Export singleton instance
export const githubAPI = new GitHubAPI();
