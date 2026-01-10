/**
 * @fileoverview Telegram Webhook Handler
 * @description HTTP webhook endpoint handler for Telegram Bot API
 * @module lib/social/telegram/webhook
 */

import { TelegramUpdate } from '../../auth/types';
import { telegramBot, TelegramBot } from './bot';
import { authConfig } from '../../auth/config';

// ============================================================================
// Webhook Handler
// ============================================================================

export interface WebhookRequest {
  body: string | TelegramUpdate;
  headers: Record<string, string>;
}

export interface WebhookResponse {
  statusCode: number;
  body: string;
}

/**
 * Telegram Webhook Handler
 * Processes incoming webhook requests from Telegram
 */
export class TelegramWebhookHandler {
  private bot: TelegramBot;
  private secretToken: string;

  constructor(bot?: TelegramBot, secretToken?: string) {
    this.bot = bot || telegramBot;
    this.secretToken = secretToken || authConfig.telegram.webhookSecret;
  }

  /**
   * Handle incoming webhook request
   * @param request - Webhook request
   * @returns Webhook response
   */
  async handle(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      // Verify secret token if configured
      if (this.secretToken) {
        const headerToken = request.headers['x-telegram-bot-api-secret-token'];
        if (headerToken !== this.secretToken) {
          console.warn('Invalid Telegram webhook secret token');
          return { statusCode: 401, body: 'Unauthorized' };
        }
      }

      // Parse update
      let update: TelegramUpdate;
      if (typeof request.body === 'string') {
        update = JSON.parse(request.body);
      } else {
        update = request.body;
      }

      // Process update asynchronously
      // Return 200 immediately to acknowledge receipt
      this.bot.handleUpdate(update).catch(error => {
        console.error('Error processing Telegram update:', error);
      });

      return { statusCode: 200, body: 'OK' };
    } catch (error) {
      console.error('Error handling Telegram webhook:', error);
      return { statusCode: 500, body: 'Internal Server Error' };
    }
  }

  /**
   * Verify webhook challenge (for initial setup)
   * @param request - Webhook request
   * @returns Webhook response
   */
  verifyChallenge(request: WebhookRequest): WebhookResponse {
    // Telegram doesn't use challenge verification like other platforms
    // This is here for API consistency
    return { statusCode: 200, body: 'OK' };
  }
}

// Export singleton instance
export const telegramWebhookHandler = new TelegramWebhookHandler();

// ============================================================================
// Next.js API Route Handler
// ============================================================================

/**
 * Create Next.js API route handler for Telegram webhook
 * Usage in pages/api/webhook/telegram.ts:
 * 
 * import { createTelegramWebhookHandler } from '@/lib/social/telegram/webhook';
 * export default createTelegramWebhookHandler();
 */
export function createTelegramWebhookHandler() {
  return async function handler(req: { method: string; body: unknown; headers: Record<string, string> }, res: { status: (code: number) => { json: (body: unknown) => void; send: (body: string) => void } }) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const response = await telegramWebhookHandler.handle({
      body: req.body as TelegramUpdate,
      headers: req.headers,
    });

    return res.status(response.statusCode).send(response.body);
  };
}
