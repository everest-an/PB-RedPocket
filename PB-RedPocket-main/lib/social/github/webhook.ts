/**
 * @fileoverview GitHub Webhook Handler
 * @description HTTP webhook endpoint handler for GitHub App
 * @module lib/social/github/webhook
 */

import crypto from 'crypto';
import { githubBot, GitHubBot } from './bot';
import { authConfig } from '../../auth/config';

// ============================================================================
// Signature Verification
// ============================================================================

/**
 * Verify GitHub webhook signature
 * @param signature - X-Hub-Signature-256 header
 * @param body - Raw request body
 * @param secret - Webhook secret
 * @returns Whether the signature is valid
 */
export function verifyGitHubSignature(
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
  body: string | Record<string, unknown>;
  headers: Record<string, string>;
}

export interface WebhookResponse {
  statusCode: number;
  body: string;
}

/**
 * GitHub Webhook Handler
 * Processes incoming webhook requests from GitHub
 */
export class GitHubWebhookHandler {
  private bot: GitHubBot;
  private webhookSecret: string;

  constructor(bot?: GitHubBot, webhookSecret?: string) {
    this.bot = bot || githubBot;
    this.webhookSecret = webhookSecret || authConfig.github.webhookSecret;
  }

  /**
   * Handle incoming webhook request
   * @param request - Webhook request
   * @returns Webhook response
   */
  async handle(request: WebhookRequest): Promise<WebhookResponse> {
    try {
      // Get event type
      const eventType = request.headers['x-github-event'];
      if (!eventType) {
        return { statusCode: 400, body: 'Missing X-GitHub-Event header' };
      }

      // Get raw body for signature verification
      const rawBody = typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body);

      // Verify signature if secret is configured
      if (this.webhookSecret) {
        const signature = request.headers['x-hub-signature-256'];
        if (!verifyGitHubSignature(signature, rawBody, this.webhookSecret)) {
          console.warn('Invalid GitHub webhook signature');
          return { statusCode: 401, body: 'Invalid signature' };
        }
      }

      // Parse payload
      let payload: Record<string, unknown>;
      if (typeof request.body === 'string') {
        payload = JSON.parse(request.body);
      } else {
        payload = request.body;
      }

      // Get delivery ID for logging
      const deliveryId = request.headers['x-github-delivery'];
      console.log(`Processing GitHub webhook: ${eventType} (${deliveryId})`);

      // Process event asynchronously
      this.bot.handleEvent(eventType, payload).catch(error => {
        console.error(`Error processing GitHub event ${eventType}:`, error);
      });

      // Return 200 immediately to acknowledge receipt
      return { statusCode: 200, body: 'OK' };
    } catch (error) {
      console.error('Error handling GitHub webhook:', error);
      return { statusCode: 500, body: 'Internal Server Error' };
    }
  }
}

// Export singleton instance
export const githubWebhookHandler = new GitHubWebhookHandler();

// ============================================================================
// Next.js API Route Handler
// ============================================================================

/**
 * Create Next.js API route handler for GitHub webhook
 * Usage in pages/api/webhook/github.ts:
 * 
 * import { createGitHubWebhookHandler } from '@/lib/social/github/webhook';
 * export default createGitHubWebhookHandler();
 */
export function createGitHubWebhookHandler() {
  return async function handler(
    req: { method: string; body: unknown; headers: Record<string, string>; rawBody?: string },
    res: { status: (code: number) => { send: (body: string) => void; json: (body: unknown) => void } }
  ) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const response = await githubWebhookHandler.handle({
      body: req.rawBody || req.body as Record<string, unknown>,
      headers: req.headers,
    });

    return res.status(response.statusCode).send(response.body);
  };
}
