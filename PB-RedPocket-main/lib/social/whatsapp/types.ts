/**
 * @fileoverview WhatsApp Business API Types
 * @description Type definitions for WhatsApp Cloud API
 * @module lib/social/whatsapp/types
 */

// ============================================================================
// Message Types
// ============================================================================

export enum WhatsAppMessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  INTERACTIVE = 'interactive',
  IMAGE = 'image',
  DOCUMENT = 'document',
}

export enum InteractiveType {
  BUTTON = 'button',
  LIST = 'list',
  PRODUCT = 'product',
  PRODUCT_LIST = 'product_list',
}

// ============================================================================
// Outgoing Message Types
// ============================================================================

export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateParameter[];
  sub_type?: 'quick_reply' | 'url';
  index?: number;
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
}

export interface WhatsAppInteractiveMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: InteractiveType;
    header?: {
      type: 'text' | 'image' | 'video' | 'document';
      text?: string;
      image?: { link: string };
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: InteractiveAction;
  };
}

export interface InteractiveAction {
  buttons?: InteractiveButton[];
  button?: string;
  sections?: InteractiveSection[];
}

export interface InteractiveButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface InteractiveSection {
  title?: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

// ============================================================================
// Incoming Webhook Types
// ============================================================================

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: 'whatsapp';
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: WhatsAppContact[];
    messages?: WhatsAppIncomingMessage[];
    statuses?: WhatsAppStatus[];
    errors?: WhatsAppError[];
  };
  field: 'messages';
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'document' | 'location';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  button?: {
    text: string;
    payload: string;
  };
  context?: {
    from: string;
    id: string;
  };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: 'business_initiated' | 'user_initiated' | 'referral_conversion';
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: WhatsAppError[];
}

export interface WhatsAppError {
  code: number;
  title: string;
  message: string;
  error_data?: {
    details: string;
  };
}

// ============================================================================
// Template Definitions
// ============================================================================

export const WHATSAPP_TEMPLATES = {
  // RedPocket claim notification
  REDPOCKET_CLAIM: {
    name: 'redpocket_claim',
    language: 'zh_CN',
    components: [
      { type: 'body' as const, parameters: [
        { type: 'text' as const }, // sender name
        { type: 'text' as const }, // amount
        { type: 'text' as const }, // token symbol
      ]},
      { type: 'button' as const, sub_type: 'url' as const, index: 0, parameters: [
        { type: 'text' as const }, // claim link suffix
      ]},
    ],
  },
  
  // Claim success notification
  CLAIM_SUCCESS: {
    name: 'claim_success',
    language: 'zh_CN',
    components: [
      { type: 'body' as const, parameters: [
        { type: 'text' as const }, // amount
        { type: 'text' as const }, // token symbol
        { type: 'text' as const }, // wallet address
      ]},
    ],
  },
  
  // Withdrawal confirmation
  WITHDRAWAL_CONFIRM: {
    name: 'withdrawal_confirm',
    language: 'zh_CN',
    components: [
      { type: 'body' as const, parameters: [
        { type: 'text' as const }, // amount
        { type: 'text' as const }, // token symbol
        { type: 'text' as const }, // destination address
      ]},
      { type: 'button' as const, sub_type: 'quick_reply' as const, index: 0 },
      { type: 'button' as const, sub_type: 'quick_reply' as const, index: 1 },
    ],
  },
  
  // OTP verification
  OTP_VERIFICATION: {
    name: 'otp_verification',
    language: 'zh_CN',
    components: [
      { type: 'body' as const, parameters: [
        { type: 'text' as const }, // OTP code
      ]},
    ],
  },
};

// ============================================================================
// Button IDs
// ============================================================================

export enum WhatsAppButtonId {
  CLAIM = 'claim',
  WALLET = 'wallet',
  HISTORY = 'history',
  WITHDRAW = 'withdraw',
  CONFIRM = 'confirm',
  CANCEL = 'cancel',
  HELP = 'help',
}

// ============================================================================
// Session State
// ============================================================================

export enum WhatsAppSessionState {
  IDLE = 'idle',
  AWAITING_CLAIM = 'awaiting_claim',
  AWAITING_WITHDRAW_AMOUNT = 'awaiting_withdraw_amount',
  AWAITING_WITHDRAW_ADDRESS = 'awaiting_withdraw_address',
  AWAITING_OTP = 'awaiting_otp',
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
}

export interface WhatsAppSession {
  phoneNumber: string;
  state: WhatsAppSessionState;
  context: Record<string, unknown>;
  expiresAt: Date;
}
