/**
 * @fileoverview Social Platform Integration Module
 * @description Unified exports for all social platform integrations
 * @module lib/social
 */

// Telegram
export * as telegram from './telegram';
export { telegramBot, telegramAPI, telegramWebhookHandler } from './telegram';

// Discord
export * as discord from './discord';
export { discordBot, discordAPI, discordWebhookHandler } from './discord';

// WhatsApp
export * as whatsapp from './whatsapp';
export { whatsappBot, whatsappAPI, whatsappWebhookHandler } from './whatsapp';

// GitHub
export * as github from './github';
export { githubBot, githubAPI, githubWebhookHandler } from './github';
