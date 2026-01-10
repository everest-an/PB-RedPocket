/**
 * @fileoverview Discord Module Exports
 * @description Public API for Discord bot integration
 * @module lib/social/discord
 */

// Types
export * from './types';

// API Client
export { DiscordAPI, discordAPI } from './api';

// Message Templates
export {
  buildRedPocketEmbed,
  buildClaimSuccessEmbed,
  buildClaimErrorEmbed,
  buildWalletEmbed,
  buildHistoryEmbed,
  buildHelpEmbed,
  buildWelcomeEmbed,
  buildClaimButtons,
  buildClaimedButtons,
  buildWalletButtons,
  buildHistoryButtons,
  buildLinkButtons,
  buildRedPocketMessage,
  buildClaimResultMessage,
  buildWalletMessage,
  buildHistoryMessage,
} from './messages';

// Bot Handler
export { DiscordBot, discordBot } from './bot';

// Webhook Handler
export {
  DiscordWebhookHandler,
  discordWebhookHandler,
  createDiscordWebhookHandler,
  verifyDiscordSignature,
} from './webhook';
