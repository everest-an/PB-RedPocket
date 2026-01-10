/**
 * @fileoverview Telegram Bot Handler
 * @description Main bot logic for handling commands and callbacks
 * @module lib/social/telegram/bot
 */

import { TelegramAPI, telegramAPI } from './api';
import {
  CallbackAction,
  decodeCallbackData,
  BOT_COMMANDS,
  RedPocketMessageData,
} from './types';
import {
  formatRedPocketMessage,
  formatClaimResultMessage,
  formatWalletMessage,
  formatHistoryMessage,
  formatHelpMessage,
  formatWelcomeMessage,
  buildClaimKeyboard,
  buildClaimedKeyboard,
  buildWalletKeyboard,
  buildHistoryKeyboard,
  buildWithdrawKeyboard,
} from './messages';
import { verifyTelegramWebAppData } from '../../auth/crypto';
import { identityService } from '../../auth/identity-service';
import {
  AuthPlatform,
  TelegramUpdate,
  TelegramMessage,
  TelegramCallbackQuery,
  TelegramUser,
  PlatformUser,
} from '../../auth/types';

// ============================================================================
// Bot Handler
// ============================================================================

export class TelegramBot {
  private api: TelegramAPI;

  constructor(api?: TelegramAPI) {
    this.api = api || telegramAPI;
  }

  /**
   * Initialize bot (set commands and webhook)
   * @param webhookUrl - Webhook URL
   * @param secretToken - Secret token for verification
   */
  async initialize(webhookUrl: string, secretToken?: string): Promise<void> {
    // Set bot commands
    await this.api.setMyCommands(BOT_COMMANDS);
    
    // Set webhook
    await this.api.setWebhook(webhookUrl, secretToken);
    
    console.log('Telegram bot initialized');
  }

  /**
   * Handle incoming webhook update
   * @param update - Telegram update object
   */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.message) {
        await this.handleMessage(update.message);
      } else if (update.callback_query) {
        await this.handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error('Error handling Telegram update:', error);
    }
  }

  /**
   * Handle incoming message
   * @param message - Telegram message
   */
  private async handleMessage(message: TelegramMessage): Promise<void> {
    const { chat, from, text } = message;
    if (!from || !text) return;

    // Parse command
    const command = this.parseCommand(text);
    if (!command) return;

    // Get or create user identity
    const platformUser = this.toPlatformUser(from);
    const authResult = await identityService.getOrCreateIdentity(platformUser);

    // Handle commands
    switch (command.name) {
      case 'start':
        await this.handleStartCommand(chat.id, from, command.args, authResult.isNewUser, authResult.walletAddress);
        break;
      case 'wallet':
        await this.handleWalletCommand(chat.id, from);
        break;
      case 'history':
        await this.handleHistoryCommand(chat.id, from);
        break;
      case 'withdraw':
        await this.handleWithdrawCommand(chat.id, from);
        break;
      case 'link':
        await this.handleLinkCommand(chat.id, from);
        break;
      case 'help':
        await this.handleHelpCommand(chat.id);
        break;
    }
  }

  /**
   * Handle callback query (button press)
   * @param query - Callback query
   */
  private async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const { id, from, message, data } = query;
    if (!data || !message) {
      await this.api.answerCallbackQuery({ callback_query_id: id });
      return;
    }

    const callbackData = decodeCallbackData(data);
    if (!callbackData) {
      await this.api.answerCallbackQuery({ callback_query_id: id, text: '无效操作' });
      return;
    }

    // Get user identity
    const platformUser = this.toPlatformUser(from);
    await identityService.getOrCreateIdentity(platformUser);

    // Handle callback actions
    switch (callbackData.action) {
      case CallbackAction.CLAIM:
        await this.handleClaimCallback(id, message.chat.id, message.message_id, from, callbackData.redpocketId);
        break;
      case CallbackAction.VIEW_WALLET:
        await this.handleWalletCallback(id, message.chat.id, message.message_id, from);
        break;
      case CallbackAction.VIEW_HISTORY:
        await this.handleHistoryCallback(id, message.chat.id, message.message_id, from, callbackData.page);
        break;
      case CallbackAction.WITHDRAW:
        await this.handleWithdrawCallback(id, message.chat.id, message.message_id, from, callbackData.platform);
        break;
      case CallbackAction.LINK_ACCOUNT:
        await this.handleLinkCallback(id, message.chat.id, from);
        break;
      default:
        await this.api.answerCallbackQuery({ callback_query_id: id });
    }
  }

  // ============================================================================
  // Command Handlers
  // ============================================================================

  /**
   * Handle /start command
   */
  private async handleStartCommand(
    chatId: number,
    from: TelegramUser,
    args: string | undefined,
    isNewUser: boolean | undefined,
    walletAddress: string | undefined
  ): Promise<void> {
    // Check if this is a RedPocket claim (start with redpocket ID)
    if (args && args.length > 0) {
      const redpocketId = args;
      // TODO: Fetch RedPocket data and show claim UI
      await this.sendRedPocketMessage(chatId, redpocketId);
      return;
    }

    // Welcome message for new users
    if (isNewUser && walletAddress) {
      const username = from.username || from.first_name;
      await this.api.sendMessage({
        chat_id: chatId,
        text: formatWelcomeMessage(username, walletAddress),
        parse_mode: 'HTML',
        reply_markup: buildWalletKeyboard(),
      });
    } else {
      await this.api.sendMessage({
        chat_id: chatId,
        text: formatHelpMessage(),
        parse_mode: 'HTML',
      });
    }
  }

  /**
   * Handle /wallet command
   */
  private async handleWalletCommand(chatId: number, from: TelegramUser): Promise<void> {
    // TODO: Fetch actual wallet balances
    const mockBalances = [
      { symbol: 'USDT', amount: 100.0, valueUsd: 100.0, chain: 'Base' },
      { symbol: 'ETH', amount: 0.025, valueUsd: 45.0, chain: 'Ethereum' },
    ];
    const totalValueUsd = mockBalances.reduce((sum, b) => sum + b.valueUsd, 0);

    await this.api.sendMessage({
      chat_id: chatId,
      text: formatWalletMessage(mockBalances, totalValueUsd),
      parse_mode: 'HTML',
      reply_markup: buildWalletKeyboard(),
    });
  }

  /**
   * Handle /history command
   */
  private async handleHistoryCommand(chatId: number, from: TelegramUser): Promise<void> {
    // TODO: Fetch actual claim history
    const mockClaims = [
      { date: '01/10', amount: 5.23, symbol: 'USDT', source: 'Telegram群' },
      { date: '01/09', amount: 0.01, symbol: 'ETH', source: 'Discord' },
    ];

    await this.api.sendMessage({
      chat_id: chatId,
      text: formatHistoryMessage(mockClaims, 1, 1),
      parse_mode: 'HTML',
      reply_markup: buildHistoryKeyboard(1, 1),
    });
  }

  /**
   * Handle /withdraw command
   */
  private async handleWithdrawCommand(chatId: number, from: TelegramUser): Promise<void> {
    await this.api.sendMessage({
      chat_id: chatId,
      text: '💸 <b>选择提现方式</b>\n\n请选择您想要的提现方式：',
      parse_mode: 'HTML',
      reply_markup: buildWithdrawKeyboard(),
    });
  }

  /**
   * Handle /link command
   */
  private async handleLinkCommand(chatId: number, from: TelegramUser): Promise<void> {
    await this.api.sendMessage({
      chat_id: chatId,
      text: `
🔗 <b>绑定其他账号</b>

绑定更多社交账号可以：
• 合并不同平台的奖励
• 使用任意账号登录管理
• 提高账户安全性

点击下方链接完成绑定：
      `.trim(),
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 绑定 Discord', url: 'https://protocolbanks.com/link/discord' }],
          [{ text: '🐙 绑定 GitHub', url: 'https://protocolbanks.com/link/github' }],
          [{ text: '📱 绑定 WhatsApp', url: 'https://protocolbanks.com/link/whatsapp' }],
        ],
      },
    });
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(chatId: number): Promise<void> {
    await this.api.sendMessage({
      chat_id: chatId,
      text: formatHelpMessage(),
      parse_mode: 'HTML',
    });
  }

  // ============================================================================
  // Callback Handlers
  // ============================================================================

  /**
   * Handle claim button callback
   */
  private async handleClaimCallback(
    queryId: string,
    chatId: number,
    messageId: number,
    from: TelegramUser,
    redpocketId: string | undefined
  ): Promise<void> {
    if (!redpocketId) {
      await this.api.answerCallbackQuery({ callback_query_id: queryId, text: '红包不存在' });
      return;
    }

    // Show processing
    await this.api.answerCallbackQuery({ callback_query_id: queryId, text: '正在领取...' });

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

    // Update message with result
    await this.api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: formatClaimResultMessage(claimResult),
      parse_mode: 'HTML',
      reply_markup: buildClaimedKeyboard(claimResult.txHash || ''),
    });
  }

  /**
   * Handle wallet button callback
   */
  private async handleWalletCallback(
    queryId: string,
    chatId: number,
    messageId: number,
    from: TelegramUser
  ): Promise<void> {
    await this.api.answerCallbackQuery({ callback_query_id: queryId });

    // TODO: Fetch actual balances
    const mockBalances = [
      { symbol: 'USDT', amount: 100.0, valueUsd: 100.0, chain: 'Base' },
    ];

    await this.api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: formatWalletMessage(mockBalances, 100),
      parse_mode: 'HTML',
      reply_markup: buildWalletKeyboard(),
    });
  }

  /**
   * Handle history button callback
   */
  private async handleHistoryCallback(
    queryId: string,
    chatId: number,
    messageId: number,
    from: TelegramUser,
    page: number = 1
  ): Promise<void> {
    await this.api.answerCallbackQuery({ callback_query_id: queryId });

    // TODO: Fetch actual history with pagination
    const mockClaims = [
      { date: '01/10', amount: 5.23, symbol: 'USDT', source: 'Telegram' },
    ];

    await this.api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: formatHistoryMessage(mockClaims, page, 1),
      parse_mode: 'HTML',
      reply_markup: buildHistoryKeyboard(page, 1),
    });
  }

  /**
   * Handle withdraw button callback
   */
  private async handleWithdrawCallback(
    queryId: string,
    chatId: number,
    messageId: number,
    from: TelegramUser,
    platform: string | undefined
  ): Promise<void> {
    await this.api.answerCallbackQuery({ callback_query_id: queryId });

    if (platform === 'web3') {
      await this.api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: '🦊 <b>转到 Web3 钱包</b>\n\n请输入目标钱包地址：',
        parse_mode: 'HTML',
      });
    } else if (platform === 'fiat') {
      await this.api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: '🏦 <b>兑换法币</b>\n\n点击下方按钮前往合作方完成兑换：',
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '前往 MoonPay', url: 'https://www.moonpay.com' }],
            [{ text: '前往 Transak', url: 'https://transak.com' }],
          ],
        },
      });
    } else {
      await this.api.editMessageText({
        chat_id: chatId,
        message_id: messageId,
        text: '💸 <b>选择提现方式</b>',
        parse_mode: 'HTML',
        reply_markup: buildWithdrawKeyboard(),
      });
    }
  }

  /**
   * Handle link account callback
   */
  private async handleLinkCallback(
    queryId: string,
    chatId: number,
    from: TelegramUser
  ): Promise<void> {
    await this.api.answerCallbackQuery({ callback_query_id: queryId });
    await this.handleLinkCommand(chatId, from);
  }

  // ============================================================================
  // RedPocket Methods
  // ============================================================================

  /**
   * Send RedPocket announcement message
   * @param chatId - Chat ID
   * @param redpocketId - RedPocket ID
   */
  async sendRedPocketMessage(chatId: number, redpocketId: string): Promise<void> {
    // TODO: Fetch actual RedPocket data
    const mockData: RedPocketMessageData = {
      redpocketId,
      senderName: 'Protocol Bank',
      totalAmount: 100,
      tokenSymbol: 'USDT',
      remainingCount: 10,
      totalCount: 10,
      message: '感谢社区支持！',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    await this.api.sendMessage({
      chat_id: chatId,
      text: formatRedPocketMessage(mockData),
      parse_mode: 'HTML',
      reply_markup: buildClaimKeyboard(redpocketId),
    });
  }

  /**
   * Broadcast RedPocket to multiple chats
   * @param chatIds - Array of chat IDs
   * @param data - RedPocket data
   */
  async broadcastRedPocket(chatIds: number[], data: RedPocketMessageData): Promise<void> {
    for (const chatId of chatIds) {
      try {
        await this.api.sendMessage({
          chat_id: chatId,
          text: formatRedPocketMessage(data),
          parse_mode: 'HTML',
          reply_markup: buildClaimKeyboard(data.redpocketId),
        });
        // Rate limiting: wait 50ms between messages
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Failed to send to chat ${chatId}:`, error);
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Parse command from message text
   * @param text - Message text
   * @returns Parsed command or null
   */
  private parseCommand(text: string): { name: string; args?: string } | null {
    if (!text.startsWith('/')) return null;
    
    const parts = text.split(' ');
    const commandPart = parts[0].substring(1).split('@')[0]; // Remove / and @botname
    const args = parts.slice(1).join(' ');
    
    return { name: commandPart.toLowerCase(), args: args || undefined };
  }

  /**
   * Convert Telegram user to platform user
   * @param user - Telegram user
   * @returns Platform user
   */
  private toPlatformUser(user: TelegramUser): PlatformUser {
    return {
      platform: AuthPlatform.TELEGRAM,
      platformId: user.id.toString(),
      username: user.username,
      displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
      avatarUrl: user.photo_url,
      isVerified: true, // Telegram users are verified by default
    };
  }
}

// Export singleton instance
export const telegramBot = new TelegramBot();
