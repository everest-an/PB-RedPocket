/**
 * @fileoverview Authentication Configuration
 * @description Configuration for OAuth2 providers and webhook settings
 * @module lib/auth/config
 */

import { AuthPlatform } from './types';

// ============================================================================
// Environment Variables
// ============================================================================

export const authConfig = {
  // Telegram Bot Configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'ProtocolBankBot',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
    webAppUrl: process.env.TELEGRAM_WEBAPP_URL || 'https://protocolbanks.com/claim',
  },

  // Discord OAuth2 Configuration
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    publicKey: process.env.DISCORD_PUBLIC_KEY || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'https://protocolbanks.com/auth/discord/callback',
    scopes: ['identify', 'email', 'guilds'],
  },

  // GitHub OAuth2 Configuration
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    appId: process.env.GITHUB_APP_ID || '',
    privateKey: process.env.GITHUB_PRIVATE_KEY || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'https://protocolbanks.com/auth/github/callback',
    scopes: ['read:user', 'user:email'],
  },

  // WhatsApp Business API Configuration
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || '',
  },

  // General Auth Settings
  general: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtExpiresIn: '7d',
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    maxAuthAttempts: 5,
    authAttemptWindow: 15 * 60 * 1000, // 15 minutes in ms
  },
};

// ============================================================================
// OAuth2 Endpoints
// ============================================================================

export const oauthEndpoints = {
  discord: {
    authorize: 'https://discord.com/api/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token',
    revoke: 'https://discord.com/api/oauth2/token/revoke',
    userInfo: 'https://discord.com/api/users/@me',
  },
  github: {
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    userInfo: 'https://api.github.com/user',
    userEmails: 'https://api.github.com/user/emails',
  },
};

// ============================================================================
// API Endpoints
// ============================================================================

export const apiEndpoints = {
  telegram: {
    base: 'https://api.telegram.org',
    getMe: '/getMe',
    sendMessage: '/sendMessage',
    setWebhook: '/setWebhook',
    deleteWebhook: '/deleteWebhook',
    getWebhookInfo: '/getWebhookInfo',
    answerCallbackQuery: '/answerCallbackQuery',
    editMessageText: '/editMessageText',
    editMessageReplyMarkup: '/editMessageReplyMarkup',
  },
  discord: {
    base: 'https://discord.com/api/v10',
    interactions: '/interactions',
    webhooks: '/webhooks',
    channels: '/channels',
    guilds: '/guilds',
  },
  whatsapp: {
    base: 'https://graph.facebook.com/v18.0',
    messages: '/messages',
  },
};

// ============================================================================
// Platform Feature Flags
// ============================================================================

export const platformFeatures: Record<AuthPlatform, {
  supportsOAuth: boolean;
  supportsWebhook: boolean;
  supportsBot: boolean;
  supportsInlineKeyboard: boolean;
  supportsEphemeralMessages: boolean;
  maxMessageLength: number;
}> = {
  [AuthPlatform.TELEGRAM]: {
    supportsOAuth: false, // Uses Login Widget instead
    supportsWebhook: true,
    supportsBot: true,
    supportsInlineKeyboard: true,
    supportsEphemeralMessages: false,
    maxMessageLength: 4096,
  },
  [AuthPlatform.DISCORD]: {
    supportsOAuth: true,
    supportsWebhook: true,
    supportsBot: true,
    supportsInlineKeyboard: true,
    supportsEphemeralMessages: true,
    maxMessageLength: 2000,
  },
  [AuthPlatform.GITHUB]: {
    supportsOAuth: true,
    supportsWebhook: true,
    supportsBot: false, // Uses GitHub App
    supportsInlineKeyboard: false,
    supportsEphemeralMessages: false,
    maxMessageLength: 65536,
  },
  [AuthPlatform.WHATSAPP]: {
    supportsOAuth: false, // Uses phone verification
    supportsWebhook: true,
    supportsBot: true,
    supportsInlineKeyboard: true,
    supportsEphemeralMessages: false,
    maxMessageLength: 4096,
  },
};

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

export const rateLimits = {
  telegram: {
    messagesPerSecond: 30,
    messagesPerMinutePerChat: 20,
  },
  discord: {
    globalRateLimit: 50,
    channelRateLimit: 5,
  },
  github: {
    requestsPerHour: 5000,
  },
  whatsapp: {
    messagesPerSecond: 80,
    templateMessagesPerDay: 1000,
  },
};
