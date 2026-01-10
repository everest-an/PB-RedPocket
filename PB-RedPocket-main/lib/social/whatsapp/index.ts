/**
 * @fileoverview WhatsApp Module Exports
 * @description Public API for WhatsApp Business API integration
 * @module lib/social/whatsapp
 */

// Types
export * from './types';

// API Client
export { WhatsAppAPI, whatsappAPI } from './api';

// Bot Handler
export { WhatsAppBot, whatsappBot } from './bot';

// Webhook Handler
export {
  WhatsAppWebhookHandler,
  whatsappWebhookHandler,
  createWhatsAppWebhookHandler,
  verifyWhatsAppSignature,
} from './webhook';
