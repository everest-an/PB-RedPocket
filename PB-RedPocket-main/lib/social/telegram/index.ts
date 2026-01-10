/**
 * @fileoverview Telegram Module Exports
 * @description Public API for Telegram bot integration
 * @module lib/social/telegram
 */

// Types
export * from './types';

// API Client
export { TelegramAPI, telegramAPI } from './api';

// Message Templates
export {
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
  buildConfirmKeyboard,
} from './messages';

// Bot Handler
export { TelegramBot, telegramBot } from './bot';

// Webhook Handler
export {
  TelegramWebhookHandler,
  telegramWebhookHandler,
  createTelegramWebhookHandler,
} from './webhook';
