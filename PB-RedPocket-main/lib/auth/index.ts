/**
 * @fileoverview Auth Module Exports
 * @description Public API for authentication and identity management
 * @module lib/auth
 */

// Types
export * from './types';

// Configuration
export { authConfig, oauthEndpoints, apiEndpoints, platformFeatures, rateLimits } from './config';

// Cryptographic Utilities
export {
  verifyTelegramWebAppData,
  verifyTelegramLoginWidget,
  verifyDiscordSignature,
  verifyGitHubSignature,
  verifyWhatsAppSignature,
  verifyWebhookSignature,
  generateSecureToken,
  generateIdentityHash,
  hashData,
} from './crypto';

// Identity Service
export { IdentityService, identityService } from './identity-service';
