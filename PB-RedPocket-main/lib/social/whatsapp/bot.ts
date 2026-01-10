/**
 * @fileoverview WhatsApp Bot Handler
 * @description Main bot logic for handling WhatsApp messages
 * @module lib/social/whatsapp/bot
 */

import { WhatsAppAPI, whatsappAPI } from './api';
import {
  WhatsAppIncomingMessage,
  WhatsAppContact,
  WhatsAppButtonId,
  WhatsAppSessionState,
  WhatsAppSession,
} from './types';
import { identityService } from '../../auth/identity-service';
import { AuthPlatform, PlatformUser } from '../../auth/types';

// ============================================================================
// Session Store (In-memory, use Redis in production)
// ============================================================================

const sessionStore = new Map<string, WhatsAppSession>();

// ============================================================================
// Bot Handler
// ============================================================================

export class WhatsAppBot {
  private api: WhatsAppAPI;

  constructor(api?: WhatsAppAPI) {
    this.api = api || whatsappAPI;
  }

  /**
   * Handle incoming message
   * @param message - Incoming WhatsApp message
   * @param contact - Contact info
   */
  async handleMessage(
    message: WhatsAppIncomingMessage,
    contact?: WhatsAppContact
  ): Promise<void> {
    const phoneNumber = message.from;
    const displayName = contact?.profile?.name || phoneNumber;

    // Get or create user identity
    const platformUser = this.toPlatformUser(phoneNumber, displayName);
    const authResult = await identityService.getOrCreateIdentity(platformUser);

    // Get or create session
    let session = this.getSession(phoneNumber);
    if (!session) {
      session = this.createSession(phoneNumber);
    }

    // Mark message as read
    await this.api.markAsRead(message.id).catch(() => {});

    // Handle based on message type
    if (message.type === 'text' && message.text) {
      await this.handleTextMessage(phoneNumber, message.text.body, session, authResult.isNewUser, authResult.walletAddress);
    } else if (message.type === 'interactive' && message.interactive) {
      const buttonId = message.interactive.button_reply?.id || message.interactive.list_reply?.id;
      if (buttonId) {
        await this.handleButtonClick(phoneNumber, buttonId, session);
      }
    } else if (message.type === 'button' && message.button) {
      await this.handleButtonClick(phoneNumber, message.button.payload, session);
    }
  }

  /**
   * Handle text message
   */
  private async handleTextMessage(
    phoneNumber: string,
    text: string,
    session: WhatsAppSession,
    isNewUser?: boolean,
    walletAddress?: string
  ): Promise<void> {
    const lowerText = text.toLowerCase().trim();

    // Handle session state
    switch (session.state) {
      case WhatsAppSessionState.AWAITING_CLAIM:
        await this.handleClaimInput(phoneNumber, text, session);
        return;

      case WhatsAppSessionState.AWAITING_WITHDRAW_AMOUNT:
        await this.handleWithdrawAmountInput(phoneNumber, text, session);
        return;

      case WhatsAppSessionState.AWAITING_WITHDRAW_ADDRESS:
        await this.handleWithdrawAddressInput(phoneNumber, text, session);
        return;

      case WhatsAppSessionState.AWAITING_OTP:
        await this.handleOTPInput(phoneNumber, text, session);
        return;
    }

    // Handle commands
    if (lowerText === 'hi' || lowerText === 'hello' || lowerText === '你好') {
      await this.sendWelcomeMessage(phoneNumber, isNewUser, walletAddress);
    } else if (lowerText === 'wallet' || lowerText === '钱包') {
      await this.sendWalletInfo(phoneNumber);
    } else if (lowerText === 'history' || lowerText === '历史') {
      await this.sendClaimHistory(phoneNumber);
    } else if (lowerText === 'withdraw' || lowerText === '提现') {
      await this.startWithdrawFlow(phoneNumber, session);
    } else if (lowerText === 'help' || lowerText === '帮助') {
      await this.sendHelpMessage(phoneNumber);
    } else if (text.startsWith('claim:') || text.startsWith('领取:')) {
      const redpocketId = text.split(':')[1]?.trim();
      if (redpocketId) {
        await this.handleClaim(phoneNumber, redpocketId);
      }
    } else {
      // Default response
      await this.sendDefaultResponse(phoneNumber);
    }
  }

  /**
   * Handle button click
   */
  private async handleButtonClick(
    phoneNumber: string,
    buttonId: string,
    session: WhatsAppSession
  ): Promise<void> {
    switch (buttonId) {
      case WhatsAppButtonId.CLAIM:
        session.state = WhatsAppSessionState.AWAITING_CLAIM;
        this.updateSession(session);
        await this.api.sendTextMessage(phoneNumber, '请输入红包 ID 或点击红包链接：');
        break;

      case WhatsAppButtonId.WALLET:
        await this.sendWalletInfo(phoneNumber);
        break;

      case WhatsAppButtonId.HISTORY:
        await this.sendClaimHistory(phoneNumber);
        break;

      case WhatsAppButtonId.WITHDRAW:
        await this.startWithdrawFlow(phoneNumber, session);
        break;

      case WhatsAppButtonId.CONFIRM:
        await this.handleConfirmation(phoneNumber, session, true);
        break;

      case WhatsAppButtonId.CANCEL:
        await this.handleConfirmation(phoneNumber, session, false);
        break;

      case WhatsAppButtonId.HELP:
        await this.sendHelpMessage(phoneNumber);
        break;

      default:
        // Check if it's a claim button with redpocket ID
        if (buttonId.startsWith('claim_')) {
          const redpocketId = buttonId.replace('claim_', '');
          await this.handleClaim(phoneNumber, redpocketId);
        }
    }
  }

  // ==========================================================================
  // Message Handlers
  // ==========================================================================

  /**
   * Send welcome message
   */
  private async sendWelcomeMessage(
    phoneNumber: string,
    isNewUser?: boolean,
    walletAddress?: string
  ): Promise<void> {
    if (isNewUser && walletAddress) {
      await this.api.sendTextMessage(
        phoneNumber,
        `👋 欢迎使用 Protocol Bank！\n\n` +
        `你的专属钱包已创建：\n${walletAddress}\n\n` +
        `✨ 你现在可以：\n` +
        `• 领取红包\n` +
        `• 查看钱包余额\n` +
        `• 随时提现\n\n` +
        `发送 "帮助" 查看所有命令`
      );
    } else {
      await this.api.sendButtonMessage(
        phoneNumber,
        '👋 你好！我是 Protocol Bank 助手。\n\n请选择你想要的操作：',
        [
          { id: WhatsAppButtonId.WALLET, title: '👛 我的钱包' },
          { id: WhatsAppButtonId.HISTORY, title: '📜 领取历史' },
          { id: WhatsAppButtonId.HELP, title: '❓ 帮助' },
        ],
        '🧧 Protocol Bank'
      );
    }
  }

  /**
   * Send wallet info
   */
  private async sendWalletInfo(phoneNumber: string): Promise<void> {
    // TODO: Fetch actual wallet balances
    const mockBalances = [
      { symbol: 'USDT', amount: 100.0, valueUsd: 100.0 },
      { symbol: 'ETH', amount: 0.025, valueUsd: 45.0 },
    ];
    const totalValueUsd = mockBalances.reduce((sum, b) => sum + b.valueUsd, 0);

    const balanceText = mockBalances
      .map(b => `${b.symbol}: ${b.amount.toFixed(4)} ($${b.valueUsd.toFixed(2)})`)
      .join('\n');

    await this.api.sendButtonMessage(
      phoneNumber,
      `👛 *我的钱包*\n\n` +
      `💰 总价值: *$${totalValueUsd.toFixed(2)} USD*\n\n` +
      `📊 资产明细:\n${balanceText}`,
      [
        { id: WhatsAppButtonId.WITHDRAW, title: '💸 提现' },
        { id: WhatsAppButtonId.HISTORY, title: '📜 历史' },
      ],
      'Protocol Bank'
    );
  }

  /**
   * Send claim history
   */
  private async sendClaimHistory(phoneNumber: string): Promise<void> {
    // TODO: Fetch actual claim history
    const mockClaims = [
      { date: '01/10', amount: 5.23, symbol: 'USDT', source: 'WhatsApp' },
      { date: '01/09', amount: 0.01, symbol: 'ETH', source: 'Telegram' },
    ];

    const historyText = mockClaims
      .map(c => `${c.date} | ${c.amount} ${c.symbol} | ${c.source}`)
      .join('\n');

    await this.api.sendTextMessage(
      phoneNumber,
      `📜 *领取历史*\n\n${historyText || '暂无领取记录'}`
    );
  }

  /**
   * Start withdraw flow
   */
  private async startWithdrawFlow(phoneNumber: string, session: WhatsAppSession): Promise<void> {
    session.state = WhatsAppSessionState.AWAITING_WITHDRAW_AMOUNT;
    session.context = {};
    this.updateSession(session);

    await this.api.sendTextMessage(
      phoneNumber,
      '💸 *提现*\n\n请输入提现金额和代币，例如：\n`100 USDT` 或 `0.1 ETH`'
    );
  }

  /**
   * Handle withdraw amount input
   */
  private async handleWithdrawAmountInput(
    phoneNumber: string,
    text: string,
    session: WhatsAppSession
  ): Promise<void> {
    const match = text.match(/^(\d+\.?\d*)\s*(\w+)$/i);
    if (!match) {
      await this.api.sendTextMessage(phoneNumber, '❌ 格式错误，请输入如：`100 USDT`');
      return;
    }

    const amount = parseFloat(match[1]);
    const token = match[2].toUpperCase();

    session.context.withdrawAmount = amount;
    session.context.withdrawToken = token;
    session.state = WhatsAppSessionState.AWAITING_WITHDRAW_ADDRESS;
    this.updateSession(session);

    await this.api.sendTextMessage(
      phoneNumber,
      `✅ 提现 ${amount} ${token}\n\n请输入目标钱包地址（0x开头）：`
    );
  }

  /**
   * Handle withdraw address input
   */
  private async handleWithdrawAddressInput(
    phoneNumber: string,
    text: string,
    session: WhatsAppSession
  ): Promise<void> {
    const address = text.trim();
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      await this.api.sendTextMessage(phoneNumber, '❌ 无效的钱包地址，请输入正确的 0x 地址');
      return;
    }

    session.context.withdrawAddress = address;
    session.state = WhatsAppSessionState.AWAITING_CONFIRMATION;
    this.updateSession(session);

    const { withdrawAmount, withdrawToken } = session.context;

    await this.api.sendButtonMessage(
      phoneNumber,
      `📋 *确认提现*\n\n` +
      `💰 金额: ${withdrawAmount} ${withdrawToken}\n` +
      `📍 地址: ${address}\n\n` +
      `确认提现吗？`,
      [
        { id: WhatsAppButtonId.CONFIRM, title: '✅ 确认' },
        { id: WhatsAppButtonId.CANCEL, title: '❌ 取消' },
      ]
    );
  }

  /**
   * Handle confirmation
   */
  private async handleConfirmation(
    phoneNumber: string,
    session: WhatsAppSession,
    confirmed: boolean
  ): Promise<void> {
    if (!confirmed) {
      session.state = WhatsAppSessionState.IDLE;
      session.context = {};
      this.updateSession(session);
      await this.api.sendTextMessage(phoneNumber, '❌ 操作已取消');
      return;
    }

    const { withdrawAmount, withdrawToken, withdrawAddress } = session.context;

    // TODO: Process actual withdrawal
    session.state = WhatsAppSessionState.IDLE;
    session.context = {};
    this.updateSession(session);

    await this.api.sendTextMessage(
      phoneNumber,
      `✅ *提现请求已提交*\n\n` +
      `💰 金额: ${withdrawAmount} ${withdrawToken}\n` +
      `📍 地址: ${withdrawAddress}\n\n` +
      `请等待处理，预计 1-3 分钟到账。`
    );
  }

  /**
   * Handle claim input
   */
  private async handleClaimInput(
    phoneNumber: string,
    text: string,
    session: WhatsAppSession
  ): Promise<void> {
    session.state = WhatsAppSessionState.IDLE;
    this.updateSession(session);

    await this.handleClaim(phoneNumber, text.trim());
  }

  /**
   * Handle OTP input
   */
  private async handleOTPInput(
    phoneNumber: string,
    text: string,
    session: WhatsAppSession
  ): Promise<void> {
    const otp = text.trim();
    const expectedOTP = session.context.otp as string;

    if (otp !== expectedOTP) {
      await this.api.sendTextMessage(phoneNumber, '❌ 验证码错误，请重试');
      return;
    }

    session.state = WhatsAppSessionState.IDLE;
    session.context = {};
    this.updateSession(session);

    await this.api.sendTextMessage(phoneNumber, '✅ 验证成功！');
  }

  /**
   * Handle claim
   */
  private async handleClaim(phoneNumber: string, redpocketId: string): Promise<void> {
    // TODO: Call actual claim service
    const claimResult = {
      success: true,
      claimedAmount: 5.23,
      tokenSymbol: 'USDT',
      walletAddress: '0x1234...5678',
    };

    if (claimResult.success) {
      await this.api.sendTextMessage(
        phoneNumber,
        `🎉 *领取成功！*\n\n` +
        `💰 获得: ${claimResult.claimedAmount} ${claimResult.tokenSymbol}\n` +
        `👛 钱包: ${claimResult.walletAddress}\n\n` +
        `奖励已自动存入您的钱包！`
      );
    } else {
      await this.api.sendTextMessage(phoneNumber, '❌ 领取失败，请稍后重试');
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    await this.api.sendTextMessage(
      phoneNumber,
      `🤖 *Protocol Bank 帮助*\n\n` +
      `*可用命令:*\n` +
      `• 钱包 - 查看余额\n` +
      `• 历史 - 查看领取记录\n` +
      `• 提现 - 提现奖励\n` +
      `• 帮助 - 显示此帮助\n\n` +
      `*如何领取红包:*\n` +
      `1. 点击红包链接\n` +
      `2. 奖励自动到账！\n\n` +
      `官网: protocolbanks.com`
    );
  }

  /**
   * Send default response
   */
  private async sendDefaultResponse(phoneNumber: string): Promise<void> {
    await this.api.sendButtonMessage(
      phoneNumber,
      '我不太理解你的意思 🤔\n\n请选择一个操作或发送 "帮助" 查看命令：',
      [
        { id: WhatsAppButtonId.WALLET, title: '👛 钱包' },
        { id: WhatsAppButtonId.HELP, title: '❓ 帮助' },
      ]
    );
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  private getSession(phoneNumber: string): WhatsAppSession | undefined {
    const session = sessionStore.get(phoneNumber);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  private createSession(phoneNumber: string): WhatsAppSession {
    const session: WhatsAppSession = {
      phoneNumber,
      state: WhatsAppSessionState.IDLE,
      context: {},
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };
    sessionStore.set(phoneNumber, session);
    return session;
  }

  private updateSession(session: WhatsAppSession): void {
    session.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    sessionStore.set(session.phoneNumber, session);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private toPlatformUser(phoneNumber: string, displayName?: string): PlatformUser {
    return {
      platform: AuthPlatform.WHATSAPP,
      platformId: phoneNumber,
      displayName,
      phoneNumber,
      isVerified: true, // WhatsApp numbers are verified
    };
  }
}

// Export singleton instance
export const whatsappBot = new WhatsAppBot();
