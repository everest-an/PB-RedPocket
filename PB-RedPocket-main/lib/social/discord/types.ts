/**
 * @fileoverview Discord Bot Types
 * @description Type definitions for Discord Bot API and interactions
 * @module lib/social/discord/types
 */

// ============================================================================
// Interaction Types
// ============================================================================

export enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  APPLICATION_COMMAND_AUTOCOMPLETE = 4,
  MODAL_SUBMIT = 5,
}

export enum InteractionResponseType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  DEFERRED_UPDATE_MESSAGE = 6,
  UPDATE_MESSAGE = 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
  MODAL = 9,
}

export enum ApplicationCommandType {
  CHAT_INPUT = 1,
  USER = 2,
  MESSAGE = 3,
}

export enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
  ATTACHMENT = 11,
}

// ============================================================================
// Component Types
// ============================================================================

export enum ComponentType {
  ACTION_ROW = 1,
  BUTTON = 2,
  STRING_SELECT = 3,
  TEXT_INPUT = 4,
  USER_SELECT = 5,
  ROLE_SELECT = 6,
  MENTIONABLE_SELECT = 7,
  CHANNEL_SELECT = 8,
}

export enum ButtonStyle {
  PRIMARY = 1,
  SECONDARY = 2,
  SUCCESS = 3,
  DANGER = 4,
  LINK = 5,
}

// ============================================================================
// Message Types
// ============================================================================

export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

export interface DiscordButton {
  type: ComponentType.BUTTON;
  style: ButtonStyle;
  label?: string;
  emoji?: { name: string; id?: string };
  custom_id?: string;
  url?: string;
  disabled?: boolean;
}

export interface DiscordActionRow {
  type: ComponentType.ACTION_ROW;
  components: DiscordButton[];
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  components?: DiscordActionRow[];
  flags?: number;
}

// Message flags
export const MessageFlags = {
  EPHEMERAL: 1 << 6, // Only visible to the user who triggered the interaction
};

// ============================================================================
// Slash Command Definitions
// ============================================================================

export interface SlashCommandOption {
  name: string;
  description: string;
  type: ApplicationCommandOptionType;
  required?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  options?: SlashCommandOption[];
  min_value?: number;
  max_value?: number;
  min_length?: number;
  max_length?: number;
}

export interface SlashCommand {
  name: string;
  description: string;
  type?: ApplicationCommandType;
  options?: SlashCommandOption[];
  default_member_permissions?: string;
  dm_permission?: boolean;
}

// Bot slash commands
export const DISCORD_COMMANDS: SlashCommand[] = [
  {
    name: 'claim',
    description: 'Claim a RedPocket reward',
    options: [
      {
        name: 'id',
        description: 'RedPocket ID to claim',
        type: ApplicationCommandOptionType.STRING,
        required: true,
      },
    ],
  },
  {
    name: 'wallet',
    description: 'View your wallet balance and rewards',
  },
  {
    name: 'history',
    description: 'View your claim history',
    options: [
      {
        name: 'page',
        description: 'Page number',
        type: ApplicationCommandOptionType.INTEGER,
        required: false,
        min_value: 1,
      },
    ],
  },
  {
    name: 'withdraw',
    description: 'Withdraw your rewards',
    options: [
      {
        name: 'amount',
        description: 'Amount to withdraw',
        type: ApplicationCommandOptionType.NUMBER,
        required: true,
        min_value: 0.01,
      },
      {
        name: 'token',
        description: 'Token to withdraw',
        type: ApplicationCommandOptionType.STRING,
        required: true,
        choices: [
          { name: 'USDT', value: 'USDT' },
          { name: 'ETH', value: 'ETH' },
          { name: 'DOT', value: 'DOT' },
        ],
      },
      {
        name: 'address',
        description: 'Destination wallet address',
        type: ApplicationCommandOptionType.STRING,
        required: true,
      },
    ],
  },
  {
    name: 'link',
    description: 'Link other social accounts',
  },
  {
    name: 'redpocket',
    description: 'Create a new RedPocket (Enterprise only)',
    options: [
      {
        name: 'amount',
        description: 'Total amount to distribute',
        type: ApplicationCommandOptionType.NUMBER,
        required: true,
        min_value: 1,
      },
      {
        name: 'token',
        description: 'Token to distribute',
        type: ApplicationCommandOptionType.STRING,
        required: true,
        choices: [
          { name: 'USDT', value: 'USDT' },
          { name: 'ETH', value: 'ETH' },
        ],
      },
      {
        name: 'count',
        description: 'Number of recipients',
        type: ApplicationCommandOptionType.INTEGER,
        required: true,
        min_value: 1,
        max_value: 100,
      },
      {
        name: 'message',
        description: 'Optional message',
        type: ApplicationCommandOptionType.STRING,
        required: false,
        max_length: 200,
      },
      {
        name: 'lucky',
        description: 'Enable lucky draw (random amounts)',
        type: ApplicationCommandOptionType.BOOLEAN,
        required: false,
      },
    ],
  },
  {
    name: 'help',
    description: 'Show help information',
  },
];

// ============================================================================
// Callback Data Types
// ============================================================================

export enum DiscordCallbackAction {
  CLAIM = 'c',
  WALLET = 'w',
  HISTORY = 'h',
  WITHDRAW = 'd',
  LINK = 'l',
  CONFIRM = 'y',
  CANCEL = 'n',
}

export interface DiscordCallbackData {
  action: DiscordCallbackAction;
  redpocketId?: string;
  page?: number;
  amount?: number;
  token?: string;
}

/**
 * Encode callback data to custom_id (max 100 chars)
 */
export function encodeDiscordCallback(data: DiscordCallbackData): string {
  const parts = [data.action];
  if (data.redpocketId) parts.push(`r:${data.redpocketId.slice(0, 8)}`);
  if (data.page) parts.push(`p:${data.page}`);
  if (data.amount) parts.push(`a:${data.amount}`);
  if (data.token) parts.push(`t:${data.token}`);
  return parts.join('|');
}

/**
 * Decode callback data from custom_id
 */
export function decodeDiscordCallback(customId: string): DiscordCallbackData | null {
  try {
    const parts = customId.split('|');
    const data: DiscordCallbackData = {
      action: parts[0] as DiscordCallbackAction,
    };
    
    for (let i = 1; i < parts.length; i++) {
      const [key, value] = parts[i].split(':');
      switch (key) {
        case 'r': data.redpocketId = value; break;
        case 'p': data.page = parseInt(value); break;
        case 'a': data.amount = parseFloat(value); break;
        case 't': data.token = value; break;
      }
    }
    
    return data;
  } catch {
    return null;
  }
}

// ============================================================================
// Color Constants
// ============================================================================

export const DiscordColors = {
  RED_POCKET: 0xE74C3C,    // Red for RedPocket
  SUCCESS: 0x2ECC71,       // Green for success
  ERROR: 0xE74C3C,         // Red for errors
  WARNING: 0xF39C12,       // Orange for warnings
  INFO: 0x3498DB,          // Blue for info
  BRAND: 0x5865F2,         // Discord blurple
};
