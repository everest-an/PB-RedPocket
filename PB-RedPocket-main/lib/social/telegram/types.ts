/**
 * @fileoverview Telegram Bot Types
 * @description Type definitions for Telegram Bot API
 * @module lib/social/telegram/types
 */

// ============================================================================
// Keyboard Types
// ============================================================================

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
  login_url?: { url: string };
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  selective?: boolean;
}

export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  web_app?: { url: string };
}

export interface ReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

export type ReplyMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove;

// ============================================================================
// Message Types
// ============================================================================

export interface SendMessageOptions {
  chat_id: number | string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  reply_to_message_id?: number;
  reply_markup?: ReplyMarkup;
}

export interface EditMessageOptions {
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  reply_markup?: InlineKeyboardMarkup;
}

export interface AnswerCallbackQueryOptions {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

// ============================================================================
// RedPocket Message Types
// ============================================================================

export interface RedPocketMessageData {
  redpocketId: string;
  senderName: string;
  senderAvatar?: string;
  totalAmount: number;
  tokenSymbol: string;
  remainingCount: number;
  totalCount: number;
  message?: string;
  expiresAt: Date;
}

export interface ClaimResultMessageData {
  success: boolean;
  claimedAmount?: number;
  tokenSymbol?: string;
  walletAddress?: string;
  txHash?: string;
  error?: string;
  remainingCount?: number;
  totalCount?: number;
}

// ============================================================================
// Bot Command Types
// ============================================================================

export interface BotCommand {
  command: string;
  description: string;
}

export const BOT_COMMANDS: BotCommand[] = [
  { command: 'start', description: 'Start the bot / Claim a RedPocket' },
  { command: 'wallet', description: 'View your wallet balance' },
  { command: 'history', description: 'View claim history' },
  { command: 'withdraw', description: 'Withdraw your rewards' },
  { command: 'link', description: 'Link other social accounts' },
  { command: 'help', description: 'Show help message' },
];

// ============================================================================
// Callback Data Types
// ============================================================================

export enum CallbackAction {
  CLAIM = 'claim',
  VIEW_WALLET = 'wallet',
  VIEW_HISTORY = 'history',
  WITHDRAW = 'withdraw',
  LINK_ACCOUNT = 'link',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
}

export interface CallbackData {
  action: CallbackAction;
  redpocketId?: string;
  platform?: string;
  amount?: number;
  page?: number;
}

/**
 * Encode callback data to string (max 64 bytes)
 */
export function encodeCallbackData(data: CallbackData): string {
  // Use short keys to save space
  const encoded: Record<string, string | number> = { a: data.action };
  if (data.redpocketId) encoded.r = data.redpocketId.slice(0, 8); // Truncate UUID
  if (data.platform) encoded.p = data.platform;
  if (data.amount) encoded.m = data.amount;
  if (data.page) encoded.g = data.page;
  return JSON.stringify(encoded);
}

/**
 * Decode callback data from string
 */
export function decodeCallbackData(str: string): CallbackData | null {
  try {
    const decoded = JSON.parse(str);
    return {
      action: decoded.a,
      redpocketId: decoded.r,
      platform: decoded.p,
      amount: decoded.m,
      page: decoded.g,
    };
  } catch {
    return null;
  }
}
