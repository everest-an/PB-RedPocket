/**
 * @fileoverview Discord Bot Handler
 * @description Main bot logic for handling slash commands and interactions
 * @module lib/social/discord/bot
 */

import { DiscordAPI, discordAPI } from './api';
import {
  InteractionType,
  InteractionResponseType,
  DiscordCallbackAction,
  decodeDiscordCallback,
  DISCORD_COMMANDS,
  MessageFlags,
} from './types';
import {
  buildRedPocketMessage,
  buildClaimResultMessage,
  buildWalletMessage,
  buildHistoryMessage,
  buildHelpEmbed,
  buildWelcomeEmbed,
  buildLinkButtons,
  RedPocketData,
} from './messages';
import { identityService } from '../../auth/identity-service';
import {
  AuthPlatform,
  DiscordInteraction,
  DiscordUser,
  PlatformUser,
} from '../../auth/types';

// ============================================================================
// Bot Handler
// ============================================================================

export class DiscordBot {
  private api: DiscordAPI;

  constructor(api?: DiscordAPI) {
    this.api = api || discordAPI;
  }

  /**
   * Initialize bot (register slash commands)
   * @param guildId - Optional guild ID for guild-specific commands
   */
  async initialize(guildId?: string): Promise<void> {
    if (guildId) {
      await this.api.registerGuildCommands(guildId, DISCORD_COMMANDS);
      console.log(`Discord commands registered for guild ${guildId}`);
    } else {
      await this.api.registerGlobalCommands(DISCORD_COMMANDS);
      console.log('Discord global commands registered');
    }
  }

  /**
   * Handle incoming interaction
   * @param interaction - Discord interaction object
   */
  async handleInteraction(interaction: DiscordInteraction): Promise<{
    type: InteractionResponseType;
    data?: Record<string, unknown>;
  }> {
    // Handle ping (required for Discord verification)
    if (interaction.type === InteractionType.PING) {
      return { type: InteractionResponseType.PONG };
    }

    // Get user from interaction
    const user = interaction.member?.user || interaction.user;
    if (!user) {
      return this.errorResponse('无法识别用户');
    }

    // Get or create user identity
    const platformUser = this.toPlatformUser(user);
    const authResult = await identityService.getOrCreateIdentity(platformUser);

    // Handle application commands (slash commands)
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      return this.handleCommand(interaction, user, authResult.isNewUser, authResult.walletAddress);
    }

    // Handle message components (buttons)
    if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
      return this.handleComponent(interaction, user);
    }

    return this.errorResponse('不支持的交互类型');
  }

  /**
   * Handle slash command
   */
  private async handleCommand(
    interaction: DiscordInteraction,
    user: DiscordUser,
    isNewUser: boolean | undefined,
    walletAddress: string | undefined
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    const commandName = interaction.data?.name;
    const options = interaction.data?.options || [];

    // Get option values
    const getOption = (name: string) => options.find(o => o.name === name)?.value;

    switch (commandName) {
      case 'claim':
        return this.handleClaimCommand(user, getOption('id') as string);

      case 'wallet':
        return this.handleWalletCommand(user, isNewUser, walletAddress);

      case 'history':
        return this.handleHistoryCommand(user, getOption('page') as number);

      case 'withdraw':
        return this.handleWithdrawCommand(
          user,
          getOption('amount') as number,
          getOption('token') as string,
          getOption('address') as string
        );

      case 'link':
        return this.handleLinkCommand(user);

      case 'redpocket':
        return this.handleRedPocketCommand(
          user,
          interaction.channel_id || '',
          getOption('amount') as number,
          getOption('token') as string,
          getOption('count') as number,
          getOption('message') as string,
          getOption('lucky') as boolean
        );

      case 'help':
        return this.handleHelpCommand();

      default:
        return this.errorResponse('未知命令');
    }
  }

  /**
   * Handle button component interaction
   */
  private async handleComponent(
    interaction: DiscordInteraction,
    user: DiscordUser
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    // Parse custom_id to get callback data
    const customId = (interaction.data as { custom_id?: string })?.custom_id;
    if (!customId) {
      return this.errorResponse('无效的按钮');
    }

    const callbackData = decodeDiscordCallback(customId);
    if (!callbackData) {
      return this.errorResponse('无效的回调数据');
    }

    switch (callbackData.action) {
      case DiscordCallbackAction.CLAIM:
        return this.handleClaimCommand(user, callbackData.redpocketId);

      case DiscordCallbackAction.WALLET:
        return this.handleWalletCommand(user);

      case DiscordCallbackAction.HISTORY:
        return this.handleHistoryCommand(user, callbackData.page);

      case DiscordCallbackAction.WITHDRAW:
        return {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '💸 请使用 `/withdraw` 命令进行提现',
            flags: MessageFlags.EPHEMERAL,
          },
        };

      case DiscordCallbackAction.LINK:
        return this.handleLinkCommand(user);

      default:
        return this.errorResponse('未知操作');
    }
  }

  // ==========================================================================
  // Command Handlers
  // ==========================================================================

  /**
   * Handle /claim command
   */
  private async handleClaimCommand(
    user: DiscordUser,
    redpocketId: string | undefined
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    if (!redpocketId) {
      return this.errorResponse('请提供红包 ID');
    }

    // TODO: Call actual claim service
    // For now, simulate success
    const claimResult = {
      success: true,
      claimedAmount: 5.23,
      tokenSymbol: 'USDT',
      walletAddress: '0x1234...5678',
      txHash: '0xabcd...ef01',
      remainingCount: 7,
      totalCount: 10,
    };

    const message = buildClaimResultMessage(claimResult);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: message,
    };
  }

  /**
   * Handle /wallet command
   */
  private async handleWalletCommand(
    user: DiscordUser,
    isNewUser?: boolean,
    walletAddress?: string
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    // Show welcome message for new users
    if (isNewUser && walletAddress) {
      const username = user.global_name || user.username;
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [buildWelcomeEmbed(username, walletAddress)],
          flags: MessageFlags.EPHEMERAL,
        },
      };
    }

    // TODO: Fetch actual wallet balances
    const mockBalances = [
      { symbol: 'USDT', amount: 100.0, valueUsd: 100.0, chain: 'Base' },
      { symbol: 'ETH', amount: 0.025, valueUsd: 45.0, chain: 'Ethereum' },
    ];
    const totalValueUsd = mockBalances.reduce((sum, b) => sum + b.valueUsd, 0);

    const message = buildWalletMessage(mockBalances, totalValueUsd, walletAddress || '0x...');

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: message,
    };
  }

  /**
   * Handle /history command
   */
  private async handleHistoryCommand(
    user: DiscordUser,
    page: number = 1
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    // TODO: Fetch actual claim history
    const mockClaims = [
      { date: '01/10', amount: 5.23, symbol: 'USDT', source: 'Discord' },
      { date: '01/09', amount: 0.01, symbol: 'ETH', source: 'Telegram' },
    ];

    const message = buildHistoryMessage(mockClaims, page, 1);

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: message,
    };
  }

  /**
   * Handle /withdraw command
   */
  private async handleWithdrawCommand(
    user: DiscordUser,
    amount: number,
    token: string,
    address: string
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    // Validate address format
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return this.errorResponse('无效的钱包地址格式');
    }

    // TODO: Process actual withdrawal
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `✅ 提现请求已提交\n\n💰 金额: ${amount} ${token}\n📍 地址: \`${address}\`\n\n请等待处理...`,
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  /**
   * Handle /link command
   */
  private async handleLinkCommand(
    user: DiscordUser
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: '🔗 **绑定其他账号**\n\n绑定更多社交账号可以合并不同平台的奖励：',
        components: [buildLinkButtons()],
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  /**
   * Handle /redpocket command (enterprise only)
   */
  private async handleRedPocketCommand(
    user: DiscordUser,
    channelId: string,
    amount: number,
    token: string,
    count: number,
    message?: string,
    lucky?: boolean
  ): Promise<{ type: InteractionResponseType; data?: Record<string, unknown> }> {
    // TODO: Verify enterprise permissions
    // TODO: Create actual RedPocket

    const redpocketData: RedPocketData = {
      redpocketId: 'new-redpocket-id',
      senderName: user.global_name || user.username,
      totalAmount: amount,
      tokenSymbol: token,
      remainingCount: count,
      totalCount: count,
      message,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const redpocketMessage = buildRedPocketMessage(redpocketData);

    // Send RedPocket to channel (not ephemeral)
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: redpocketMessage,
    };
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(): Promise<{
    type: InteractionResponseType;
    data?: Record<string, unknown>;
  }> {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [buildHelpEmbed()],
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Create error response
   */
  private errorResponse(message: string): {
    type: InteractionResponseType;
    data: Record<string, unknown>;
  } {
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `❌ ${message}`,
        flags: MessageFlags.EPHEMERAL,
      },
    };
  }

  /**
   * Convert Discord user to platform user
   */
  private toPlatformUser(user: DiscordUser): PlatformUser {
    return {
      platform: AuthPlatform.DISCORD,
      platformId: user.id,
      username: user.username,
      displayName: user.global_name || user.username,
      avatarUrl: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : undefined,
      email: user.email,
      isVerified: user.verified || false,
    };
  }
}

// Export singleton instance
export const discordBot = new DiscordBot();
