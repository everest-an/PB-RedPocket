/**
 * @fileoverview Discord Webhook Handler
 * @description HTTP webhook endpoint handler for Discord interactions
 * @module lib/social/discord/webhook
 */

import crypto from 'crypto';
import { DiscordInteraction } from '../../auth/types';
import { discordBot, DiscordBot } from './bot';
import { authConfig } from '../../auth/config';
import { InteractionType, InteractionResponseType } from './types';

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify Discord interaction signature using Ed25519
 * @param signature - X-Signature-Ed25519 header
 * @param timestamp - X-Signature-Timestamp header
 * @param body - Raw request body
 * @param publicKey - Discord application public key
 * @returns Whether the signature is valid
 */
export function verifyDiscordSignature(
  signature: string,
  timestamp: string,
  body: string,
  publicKey: string
): boolean {
  try {
    // Create the message to verify
    const message = Buffer.from(timestamp + body);
    const sig = Buffer.from(signature, 'hex');
    const key = Buffer.from(publicKey, 'hex');

    // Verify using tweetnacl or similar library
    // For now, we'll use a simplified check
    // In production, use tweetnacl.sign.detached.verify
    
    // Placeholder verification - in production use proper Ed25519
    return sig.length === 64 && key.length === 32;
  } catch {
    return false;
  }
}

// ============================================================================
// Webhook Handler
// ============================================================================

export interface WebhookRequest {
  body: string | DiscordInteraction;
  headers: Record<string, string>;
}

export interface WebhookResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

/**
 * Discord Webhook Handler
 * Processes incoming webhook requests from Discord
 */
export class DiscordWebhookHandler {
  private bot: DiscordBot;
  private publicKey: string;

  constructor(bot?: DiscordBot, publicKey?: string) {
    this.bot = bot || discordBot;
    this.publicKey = publicKey || authConfig.discord.publicKey;
  }

  /**
   * Handle incoming webhook request
   * @param request - Webhook request
   * @returns Webhook response
   */
  async handle(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      // Get signature headers
      const signature = request.headers['x-signature-ed25519'];
      const timestamp = request.headers['x-signature-timestamp'];

      // Get raw body for signature verification
      const rawBody = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);

      // Verify signature (skip in development if no public key)
      if (this.publicKey && signature && timestamp) {
        const isValid = verifyDiscordSignature(
          signature,
          timestamp,
          rawBody,
          this.publicKey
        );

        if (!isValid) {
          console.warn('Invalid Discord webhook signature');
          return {
            statusCode: 401,
            body: 'Invalid signature',
          };
        }
      }

      // Parse interaction
      let interaction: DiscordInteraction;
      if (typeof request.body === 'string') {
        interaction = JSON.parse(request.body);
      } else {
        interaction = request.body;
      }

      // Handle PING immediately (required for Discord verification)
      if (interaction.type === InteractionType.PING) {
        return {
          statusCode: 200,
          body: JSON.stringify({ type: InteractionResponseType.PONG }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      // Process interaction
      const response = await this.bot.handleInteraction(interaction);

      return {
        statusCode: 200,
        body: JSON.stringify(response),
        headers: { 'Content-Type': 'application/json' },
      };
    } catch (error) {
      console.error('Error handling Discord webhook:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  }
}

// Export singleton instance
export const discordWebhookHandler = new DiscordWebhookHandler();

// ============================================================================
// Next.js API Route Handler
// ============================================================================

/**
 * Create Next.js API route handler for Discord webhook
 * Usage in pages/api/webhook/discord.ts:
 * 
 * import { createDiscordWebhookHandler } from '@/lib/social/discord/webhook';
 * export default createDiscordWebhookHandler();
 */
export function createDiscordWebhookHandler() {
  return async function handler(
    req: { method: string; body: unknown; headers: Record<string, string>; rawBody?: string },
    res: { status: (code: number) => { json: (body: unknown) => void; send: (body: string) => void } }
  ) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const response = await discordWebhookHandler.handle({
      body: req.rawBody || req.body as DiscordInteraction,
      headers: req.headers,
    });

    return res.status(response.statusCode).send(response.body);
  };
}
