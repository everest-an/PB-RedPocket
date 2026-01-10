/**
 * @fileoverview Telegram Bot API Client
 * @description Low-level API client for Telegram Bot API
 * @module lib/social/telegram/api
 */

import { authConfig, apiEndpoints } from '../../auth/config';
import {
  SendMessageOptions,
  EditMessageOptions,
  AnswerCallbackQueryOptions,
  BotCommand,
} from './types';

// ============================================================================
// API Client
// ============================================================================

export class TelegramAPI {
  private baseUrl: string;
  private botToken: string;

  constructor(botToken?: string) {
    this.botToken = botToken || authConfig.telegram.botToken;
    this.baseUrl = `${apiEndpoints.telegram.base}/bot${this.botToken}`;
  }

  /**
   * Make API request to Telegram
   * @param method - API method name
   * @param params - Request parameters
   * @returns API response
   */
  private async request<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    const url = `${this.baseUrl}${method}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: params ? JSON.stringify(params) : undefined,
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || 'Unknown error'}`);
    }

    return data.result;
  }

  /**
   * Get bot information
   */
  async getMe(): Promise<{
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  }> {
    return this.request(apiEndpoints.telegram.getMe);
  }

  /**
   * Send a text message
   * @param options - Message options
   * @returns Sent message
   */
  async sendMessage(options: SendMessageOptions): Promise<{
    message_id: number;
    chat: { id: number };
    text: string;
  }> {
    return this.request(apiEndpoints.telegram.sendMessage, options);
  }

  /**
   * Edit a message text
   * @param options - Edit options
   */
  async editMessageText(options: EditMessageOptions): Promise<void> {
    await this.request(apiEndpoints.telegram.editMessageText, options);
  }

  /**
   * Edit message reply markup (keyboard)
   * @param chatId - Chat ID
   * @param messageId - Message ID
   * @param replyMarkup - New keyboard markup
   */
  async editMessageReplyMarkup(
    chatId: number | string,
    messageId: number,
    replyMarkup: Record<string, unknown>
  ): Promise<void> {
    await this.request(apiEndpoints.telegram.editMessageReplyMarkup, {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    });
  }

  /**
   * Answer a callback query
   * @param options - Answer options
   */
  async answerCallbackQuery(options: AnswerCallbackQueryOptions): Promise<void> {
    await this.request(apiEndpoints.telegram.answerCallbackQuery, options);
  }

  /**
   * Set webhook URL
   * @param url - Webhook URL
   * @param secretToken - Secret token for verification
   */
  async setWebhook(url: string, secretToken?: string): Promise<void> {
    await this.request(apiEndpoints.telegram.setWebhook, {
      url,
      secret_token: secretToken,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(): Promise<void> {
    await this.request(apiEndpoints.telegram.deleteWebhook);
  }

  /**
   * Get webhook info
   */
  async getWebhookInfo(): Promise<{
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
  }> {
    return this.request(apiEndpoints.telegram.getWebhookInfo);
  }

  /**
   * Set bot commands
   * @param commands - Array of bot commands
   */
  async setMyCommands(commands: BotCommand[]): Promise<void> {
    await this.request('/setMyCommands', { commands });
  }
}

// Export singleton instance
export const telegramAPI = new TelegramAPI();
