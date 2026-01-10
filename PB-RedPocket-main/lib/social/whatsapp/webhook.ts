/**
 * @fileoverview WhatsApp Webhook Handler
 * @description HTTP webhook endpoint handler for WhatsApp Cloud API
 * @module lib/social/whatsapp/webhook
 */

import crypto from 'crypto';
import { WhatsAppWebhookPayload } from './types';
import { whatsappBot, WhatsAppBot } from './bot';
import { authConfig } from '../../auth/config';

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify WhatsApp webhook signature
 * @param signature - X-Hub-Signature-256 header
 * @param body - Raw request body
 * @param secret - App secret
 * @returns Whether the signature is valid
 */
export function verifyWhatsAppSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  try {
    if (!signature || !secret) return false;

    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

// ============================================================================
// Webhook Handler
// ============================================================================

export interface WebhookRequest {
  method: string;
  body: string | WhatsAppWebhookPayload;
  headers: Record<string, string>;
  query?: Record<string, string>;
}

export interface WebhookResponse {
  statusCode: number;
  body: string;
}

/**
 * WhatsApp Webhook Handler
 * Processes incoming webhook requests from WhatsApp Cloud API
 */
export class WhatsAppWebhookHandler {
  private bot: WhatsAppBot;
  private verifyToken: string;
  private webhookSecret: string;

  constructor(bot?: WhatsAppBot, verifyToken?: string, webhookSecret?: string) {
    this.bot = bot || whatsappBot;
    this.verifyToken = verifyToken || authConfig.whatsapp.verifyToken;
    this.webhookSecret = webhookSecret || authConfig.whatsapp.webhookSecret;
  }

  /**
   * Handle incoming webhook request
   * @param request - Webhook request
   * @returns Webhook response
   */
  async handle(request: WebhookRequest): Promise<WebhookResponse> {
    // Handle webhook verification (GET request)
    if (request.method === 'GET') {
      return this.handleVerification(request);
    }

    // Handle webhook event (POST request)
    if (request.method === 'POST') {
      return this.handleEvent(request);
    }

    return { statusCode: 405, body: 'Method not allowed' };
  }

  /**
   * Handle webhook verification challenge
   */
  private handleVerification(request: WebhookRequest): WebhookResponse {
    const query = request.query || {};
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('WhatsApp webhook verified');
      return { statusCode: 200, body: challenge || '' };
    }

    console.warn('WhatsApp webhook verification failed');
    return { statusCode: 403, body: 'Forbidden' };
  }

  /**
   * Handle webhook event
   */
  private async handleEvent(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      // Verify signature if secret is configured
      if (this.webhookSecret) {
        const signature = request.headers['x-hub-signature-256'];
        const rawBody = typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);

        if (!verifyWhatsAppSignature(signature, rawBody, this.webhookSecret)) {
          console.warn('Invalid WhatsApp webhook signature');
          return { statusCode: 401, body: 'Invalid signature' };
        }
      }

      // Parse payload
      let payload: WhatsAppWebhookPayload;
      if (typeof request.body === 'string') {
        payload = JSON.parse(request.body);
      } else {
        payload = request.body;
      }

      // Process events asynchronously
      this.processPayload(payload).catch(error => {
        console.error('Error processing WhatsApp webhook:', error);
      });

      // Return 200 immediately to acknowledge receipt
      return { statusCode: 200, body: 'OK' };
    } catch (error) {
      console.error('Error handling WhatsApp webhook:', error);
      return { statusCode: 500, body: 'Internal Server Error' };
    }
  }

  /**
   * Process webhook payload
   */
  private async processPayload(payload: WhatsAppWebhookPayload): Promise<void> {
    if (payload.object !== 'whatsapp_business_account') {
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const { messages, contacts, statuses } = change.value;

        // Process incoming messages
        if (messages) {
          for (const message of messages) {
            const contact = contacts?.find(c => c.wa_id === message.from);
            await this.bot.handleMessage(message, contact);
          }
        }

        // Process status updates (optional logging)
        if (statuses) {
          for (const status of statuses) {
            console.log(`WhatsApp message ${status.id} status: ${status.status}`);
          }
        }
      }
    }
  }
}

// Export singleton instance
export const whatsappWebhookHandler = new WhatsAppWebhookHandler();

// ============================================================================
// Next.js API Route Handler
// ============================================================================

/**
 * Create Next.js API route handler for WhatsApp webhook
 * Usage in pages/api/webhook/whatsapp.ts:
 * 
 * import { createWhatsAppWebhookHandler } from '@/lib/social/whatsapp/webhook';
 * export default createWhatsAppWebhookHandler();
 */
export function createWhatsAppWebhookHandler() {
  return async function handler(
    req: { method: string; body: unknown; headers: Record<string, string>; query: Record<string, string>; rawBody?: string },
    res: { status: (code: number) => { send: (body: string) => void } }
  ) {
    const response = await whatsappWebhookHandler.handle({
      method: req.method,
      body: req.rawBody || req.body as WhatsAppWebhookPayload,
      headers: req.headers,
      query: req.query,
    });

    return res.status(response.statusCode).send(response.body);
  };
}
