/**
 * @fileoverview GitHub Bot Handler
 * @description Main bot logic for handling GitHub webhook events
 * @module lib/social/github/bot
 */

import { GitHubAPI, githubAPI } from './api';
import {
  GitHubEventType,
  GitHubAction,
  IssueCommentPayload,
  PullRequestPayload,
  PullRequestReviewCommentPayload,
  InstallationPayload,
  GitHubUser,
  GitHubRepository,
  parseRewardCommand,
  RewardCommand,
} from './types';
import { identityService } from '../../auth/identity-service';
import { AuthPlatform, PlatformUser } from '../../auth/types';

// ============================================================================
// Bot Handler
// ============================================================================

export class GitHubBot {
  private api: GitHubAPI;
  private botUsername: string;

  constructor(api?: GitHubAPI, botUsername: string = 'ProtocolBankBot') {
    this.api = api || githubAPI;
    this.botUsername = botUsername;
  }

  /**
   * Handle incoming webhook event
   * @param eventType - GitHub event type
   * @param payload - Event payload
   */
  async handleEvent(eventType: string, payload: unknown): Promise<void> {
    switch (eventType) {
      case GitHubEventType.ISSUE_COMMENT:
        await this.handleIssueComment(payload as IssueCommentPayload);
        break;

      case GitHubEventType.PULL_REQUEST_REVIEW_COMMENT:
        await this.handlePRReviewComment(payload as PullRequestReviewCommentPayload);
        break;

      case GitHubEventType.PULL_REQUEST:
        await this.handlePullRequest(payload as PullRequestPayload);
        break;

      case GitHubEventType.INSTALLATION:
        await this.handleInstallation(payload as InstallationPayload);
        break;

      default:
        console.log(`Unhandled GitHub event: ${eventType}`);
    }
  }

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Handle issue comment event
   */
  private async handleIssueComment(payload: IssueCommentPayload): Promise<void> {
    if (payload.action !== GitHubAction.CREATED) return;

    const { comment, issue, repository, sender, installation } = payload;

    // Ignore bot's own comments
    if (sender.type === 'Bot') return;

    // Check for reward command
    const command = parseRewardCommand(comment.body, this.botUsername);
    if (!command) return;

    // Get installation token
    if (installation) {
      await this.api.getInstallationToken(installation.id);
    }

    // Process reward command
    await this.processRewardCommand(
      command,
      sender,
      repository,
      issue.number,
      comment.id,
      'issue'
    );
  }

  /**
   * Handle PR review comment event
   */
  private async handlePRReviewComment(payload: PullRequestReviewCommentPayload): Promise<void> {
    if (payload.action !== GitHubAction.CREATED) return;

    const { comment, pull_request, repository, sender, installation } = payload;

    // Ignore bot's own comments
    if (sender.type === 'Bot') return;

    // Check for reward command
    const command = parseRewardCommand(comment.body, this.botUsername);
    if (!command) return;

    // Get installation token
    if (installation) {
      await this.api.getInstallationToken(installation.id);
    }

    // Process reward command
    await this.processRewardCommand(
      command,
      sender,
      repository,
      pull_request.number,
      comment.id,
      'pr'
    );
  }

  /**
   * Handle pull request event
   */
  private async handlePullRequest(payload: PullRequestPayload): Promise<void> {
    const { action, pull_request, repository, installation } = payload;

    // Handle merged PRs for automatic rewards
    if (action === GitHubAction.CLOSED && pull_request.merged) {
      // Get installation token
      if (installation) {
        await this.api.getInstallationToken(installation.id);
      }

      // Check for bounty labels
      const bountyLabel = pull_request.labels.find(l => 
        l.name.toLowerCase().startsWith('bounty:')
      );

      if (bountyLabel) {
        await this.processBountyPayout(
          bountyLabel.name,
          pull_request.user,
          repository,
          pull_request.number
        );
      }
    }
  }

  /**
   * Handle installation event
   */
  private async handleInstallation(payload: InstallationPayload): Promise<void> {
    const { action, installation, repositories } = payload;

    if (action === GitHubAction.CREATED) {
      console.log(`GitHub App installed by ${installation.account.login}`);
      // TODO: Store installation info in database
    } else if (action === GitHubAction.DELETED) {
      console.log(`GitHub App uninstalled by ${installation.account.login}`);
      // TODO: Clean up installation data
    }
  }

  // ==========================================================================
  // Reward Processing
  // ==========================================================================

  /**
   * Process reward command
   */
  private async processRewardCommand(
    command: RewardCommand,
    sender: GitHubUser,
    repository: GitHubRepository,
    issueNumber: number,
    commentId: number,
    context: 'issue' | 'pr'
  ): Promise<void> {
    const { owner, repo } = this.parseRepoFullName(repository.full_name);

    try {
      // Add reaction to acknowledge command
      await this.api.addCommentReaction(owner, repo, commentId, 'eyes');

      // Determine recipient
      let recipientUsername = command.recipient;
      if (!recipientUsername && context === 'pr') {
        // For PR comments without explicit recipient, reward PR author
        const pr = await this.api.getPullRequest(owner, repo, issueNumber);
        recipientUsername = pr.user.login;
      }

      if (!recipientUsername) {
        await this.replyToComment(
          owner,
          repo,
          issueNumber,
          '❌ 请指定奖励接收者，例如：`@ProtocolBankBot tip @username 10 USDT`'
        );
        return;
      }

      // Get or create recipient identity
      const recipientUser = await this.api.getUser(recipientUsername);
      const platformUser = this.toPlatformUser(recipientUser);
      const authResult = await identityService.getOrCreateIdentity(platformUser);

      // TODO: Process actual reward transfer
      // For now, simulate success
      const txHash = `0x${Date.now().toString(16)}`;

      // Add success reaction
      await this.api.addCommentReaction(owner, repo, commentId, 'rocket');

      // Reply with success message
      await this.replyToComment(
        owner,
        repo,
        issueNumber,
        this.formatRewardSuccessMessage(
          command,
          recipientUsername,
          authResult.walletAddress || '0x...',
          txHash
        )
      );

    } catch (error) {
      console.error('Error processing reward command:', error);
      
      // Add failure reaction
      await this.api.addCommentReaction(owner, repo, commentId, 'confused');

      // Reply with error message
      await this.replyToComment(
        owner,
        repo,
        issueNumber,
        `❌ 奖励发送失败：${error instanceof Error ? error.message : '未知错误'}`
      );
    }
  }

  /**
   * Process bounty payout for merged PR
   */
  private async processBountyPayout(
    bountyLabel: string,
    prAuthor: GitHubUser,
    repository: GitHubRepository,
    prNumber: number
  ): Promise<void> {
    const { owner, repo } = this.parseRepoFullName(repository.full_name);

    // Parse bounty amount from label (e.g., "bounty:50-USDT")
    const match = bountyLabel.match(/bounty:(\d+)-(\w+)/i);
    if (!match) return;

    const amount = parseFloat(match[1]);
    const token = match[2].toUpperCase();

    try {
      // Get or create author identity
      const platformUser = this.toPlatformUser(prAuthor);
      const authResult = await identityService.getOrCreateIdentity(platformUser);

      // TODO: Process actual bounty transfer
      const txHash = `0x${Date.now().toString(16)}`;

      // Comment on PR with success message
      await this.api.createIssueComment(
        owner,
        repo,
        prNumber,
        this.formatBountySuccessMessage(
          amount,
          token,
          prAuthor.login,
          authResult.walletAddress || '0x...',
          txHash
        )
      );

    } catch (error) {
      console.error('Error processing bounty payout:', error);
      
      await this.api.createIssueComment(
        owner,
        repo,
        prNumber,
        `❌ 赏金发放失败：${error instanceof Error ? error.message : '未知错误'}\n\n请联系管理员处理。`
      );
    }
  }

  // ==========================================================================
  // Message Formatting
  // ==========================================================================

  /**
   * Format reward success message
   */
  private formatRewardSuccessMessage(
    command: RewardCommand,
    recipient: string,
    walletAddress: string,
    txHash: string
  ): string {
    const typeEmoji = command.type === 'tip' ? '💰' : command.type === 'bounty' ? '🏆' : '🎁';
    const typeText = command.type === 'tip' ? '小费' : command.type === 'bounty' ? '赏金' : '奖励';

    return `
${typeEmoji} **${typeText}发送成功！**

| 项目 | 详情 |
|------|------|
| 接收者 | @${recipient} |
| 金额 | ${command.amount} ${command.token} |
| 钱包 | \`${walletAddress}\` |
${command.reason ? `| 原因 | ${command.reason} |` : ''}

[查看交易](https://basescan.org/tx/${txHash}) | [Protocol Bank](https://protocolbanks.com)
`.trim();
  }

  /**
   * Format bounty success message
   */
  private formatBountySuccessMessage(
    amount: number,
    token: string,
    recipient: string,
    walletAddress: string,
    txHash: string
  ): string {
    return `
🏆 **赏金已发放！**

恭喜 @${recipient}，您的 PR 已合并，赏金已自动发放！

| 项目 | 详情 |
|------|------|
| 金额 | ${amount} ${token} |
| 钱包 | \`${walletAddress}\` |

[查看交易](https://basescan.org/tx/${txHash}) | [Protocol Bank](https://protocolbanks.com)
`.trim();
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Reply to a comment on an issue/PR
   */
  private async replyToComment(
    owner: string,
    repo: string,
    issueNumber: number,
    body: string
  ): Promise<void> {
    await this.api.createIssueComment(owner, repo, issueNumber, body);
  }

  /**
   * Parse repository full name into owner and repo
   */
  private parseRepoFullName(fullName: string): { owner: string; repo: string } {
    const [owner, repo] = fullName.split('/');
    return { owner, repo };
  }

  /**
   * Convert GitHub user to platform user
   */
  private toPlatformUser(user: GitHubUser): PlatformUser {
    return {
      platform: AuthPlatform.GITHUB,
      platformId: user.id.toString(),
      username: user.login,
      displayName: user.name || user.login,
      avatarUrl: user.avatar_url,
      email: user.email,
      isVerified: true,
    };
  }
}

// Export singleton instance
export const githubBot = new GitHubBot();
