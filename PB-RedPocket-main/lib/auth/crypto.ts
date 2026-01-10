/**
 * @fileoverview Cryptographic Utilities for Authentication
 * @description HMAC signature verification and token generation
 * @module lib/auth/crypto
 */

import crypto from 'crypto';
import { AuthPlatform } from './types';
import { authConfig } from './config';

// ============================================================================
// Telegram Signature Verification
// ============================================================================

/**
 * Verify Telegram Web App init data signature
 * @param initData - URL-encoded init data string
 * @returns Whether the signature is valid
 */
export function verifyTelegramWebAppData(initData: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;

    // Remove hash from params for verification
    params.delete('hash');

    // Sort params alphabetically and create data-check-string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key from bot token
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(authConfig.telegram.botToken)
      .digest();

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return hash === expectedHash;
  } catch {
    return false;
  }
}

/**
 * Verify Telegram Login Widget data
 * @param data - Login widget callback data
 * @returns Whether the signature is valid
 */
export function verifyTelegramLoginWidget(data: Record<string, string>): boolean {
  try {
    const { hash, ...rest } = data;
    if (!hash) return false;

    // Create data-check-string
    const dataCheckString = Object.keys(rest)
      .sort()
      .map(key => `${key}=${rest[key]}`)
      .join('\n');

    // Create secret key (SHA256 of bot token)
    const secretKey = crypto
      .createHash('sha256')
      .update(authConfig.telegram.botToken)
      .digest();

    // Calculate expected hash
    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return hash === expectedHash;
  } catch {
    return false;
  }
}

// ============================================================================
// Discord Signature Verification
// ============================================================================

/**
 * Verify Discord interaction signature
 * @param signature - X-Signature-Ed25519 header
 * @param timestamp - X-Signature-Timestamp header
 * @param body - Raw request body
 * @returns Whether the signature is valid
 */
export function verifyDiscordSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  try {
    const publicKey = authConfig.discord.publicKey;
    if (!publicKey) return false;

    // Discord uses Ed25519 signatures
    const message = Buffer.from(timestamp + body);
    const sig = Buffer.from(signature, 'hex');
    const key = Buffer.from(publicKey, 'hex');

    // Use Node.js crypto for Ed25519 verification
    return crypto.verify(null, message, { key, format: 'der', type: 'spki' }, sig);
  } catch {
    // Fallback: return false if verification fails
    return false;
  }
}

// ============================================================================
// GitHub Signature Verification
// ============================================================================

/**
 * Verify GitHub webhook signature
 * @param signature - X-Hub-Signature-256 header
 * @param body - Raw request body
 * @returns Whether the signature is valid
 */
export function verifyGitHubSignature(signature: string, body: string): boolean {
  try {
    const secret = authConfig.github.webhookSecret;
    if (!secret || !signature) return false;

    // GitHub uses sha256=<hex> format
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
// WhatsApp Signature Verification
// ============================================================================

/**
 * Verify WhatsApp webhook signature
 * @param signature - X-Hub-Signature-256 header
 * @param body - Raw request body
 * @returns Whether the signature is valid
 */
export function verifyWhatsAppSignature(signature: string, body: string): boolean {
  try {
    const secret = authConfig.whatsapp.webhookSecret;
    if (!secret || !signature) return false;

    // WhatsApp uses sha256=<hex> format (same as GitHub)
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
// Generic Webhook Verification
// ============================================================================

/**
 * Verify webhook signature for any platform
 * @param platform - Platform type
 * @param signature - Signature header value
 * @param body - Raw request body
 * @param timestamp - Optional timestamp header
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(
  platform: AuthPlatform,
  signature: string,
  body: string,
  timestamp?: string
): boolean {
  switch (platform) {
    case AuthPlatform.TELEGRAM:
      // Telegram uses different verification for webhooks vs web app
      return true; // Telegram webhook verification is done via secret token in URL
    case AuthPlatform.DISCORD:
      return timestamp ? verifyDiscordSignature(signature, timestamp, body) : false;
    case AuthPlatform.GITHUB:
      return verifyGitHubSignature(signature, body);
    case AuthPlatform.WHATSAPP:
      return verifyWhatsAppSignature(signature, body);
    default:
      return false;
  }
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a secure random token
 * @param length - Token length in bytes (default 32)
 * @returns Hex-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a deterministic hash for identity binding
 * @param platform - Platform type
 * @param platformId - Platform user ID
 * @returns Deterministic hash for wallet salt
 */
export function generateIdentityHash(platform: AuthPlatform, platformId: string): string {
  const data = `${platform}:${platformId}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash sensitive data for storage
 * @param data - Data to hash
 * @returns SHA256 hash
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
