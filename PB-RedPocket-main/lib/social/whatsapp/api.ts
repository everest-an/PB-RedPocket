/**
 * @fileoverview WhatsApp Cloud API Client
 * @description Low-level API client for WhatsApp Business Cloud API
 * @module lib/social/whatsapp/api
 */

import { authConfig, apiEndpoints } from '../../auth/config';
import {
  WhatsAppTextMessage,
  WhatsAppTemplateMessage,
  WhatsAppInteractiveMessage,
  WHATSAPP_TEMPLATES,
} from './types';

// ============================================================================
// API Client
// ============================================================================

export class WhatsAppAPI {
  private baseUrl: string;
  private phoneNumberId: string;
  private accessToken: string;

  constructor(phoneNumberId?: string, accessToken?: string) {
    this.phoneNumberId = phoneNumberId || authConfig.whatsapp.phoneNumberId;
    this.accessToken = accessToken || authConfig.whatsapp.accessToken;
    this.baseUrl = `${apiEndpoints.whatsapp.base}/${this.phoneNumberId}`;
  }

  /**
   * Make authenticated API request to WhatsApp
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param body - Request body
   * @returns API response
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(data.error || data)}`);
    }

    return data;
  }

  // ==========================================================================
  // Message Sending
  // ==========================================================================

  /**
   * Send a text message
   * @param to - Recipient phone number (with country code, no +)
   * @param text - Message text
   */
  async sendTextMessage(to: string, text: string): Promise<{ messages: Array<{ id: string }> }> {
    const message: WhatsAppTextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: true,
        body: text,
      },
    };

    return this.request('POST', apiEndpoints.whatsapp.messages, message);
  }

  /**
   * Send a template message
   * @param to - Recipient phone number
   * @param templateName - Template name
   * @param languageCode - Language code
   * @param parameters - Template parameters
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    parameters?: Array<{ type: string; text?: string }>
  ): Promise<{ messages: Array<{ id: string }> }> {
    const message: WhatsAppTemplateMessage = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: parameters ? [
          {
            type: 'body',
            parameters: parameters.map(p => ({ type: p.type as 'text', text: p.text })),
          },
        ] : undefined,
      },
    };

    return this.request('POST', apiEndpoints.whatsapp.messages, message);
  }

  /**
   * Send an interactive button message
   * @param to - Recipient phone number
   * @param bodyText - Message body text
   * @param buttons - Array of buttons (max 3)
   * @param headerText - Optional header text
   * @param footerText - Optional footer text
   */
  async sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string
  ): Promise<{ messages: Array<{ id: string }> }> {
    const message: WhatsAppInteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          buttons: buttons.slice(0, 3).map(b => ({
            type: 'reply' as const,
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    };

    return this.request('POST', apiEndpoints.whatsapp.messages, message);
  }

  /**
   * Send an interactive list message
   * @param to - Recipient phone number
   * @param bodyText - Message body text
   * @param buttonText - Button text to open list
   * @param sections - List sections
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title?: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>
  ): Promise<{ messages: Array<{ id: string }> }> {
    const message: WhatsAppInteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections,
        },
      },
    };

    return this.request('POST', apiEndpoints.whatsapp.messages, message);
  }

  // ==========================================================================
  // Pre-built Message Senders
  // ==========================================================================

  /**
   * Send RedPocket claim notification
   * @param to - Recipient phone number
   * @param senderName - RedPocket sender name
   * @param amount - Total amount
   * @param tokenSymbol - Token symbol
   * @param claimLink - Claim link
   */
  async sendRedPocketNotification(
    to: string,
    senderName: string,
    amount: number,
    tokenSymbol: string,
    claimLink: string
  ): Promise<{ messages: Array<{ id: string }> }> {
    // Use template message for better deliverability
    return this.sendTemplateMessage(
      to,
      WHATSAPP_TEMPLATES.REDPOCKET_CLAIM.name,
      WHATSAPP_TEMPLATES.REDPOCKET_CLAIM.language,
      [
        { type: 'text', text: senderName },
        { type: 'text', text: amount.toString() },
        { type: 'text', text: tokenSymbol },
      ]
    );
  }

  /**
   * Send claim success notification
   * @param to - Recipient phone number
   * @param amount - Claimed amount
   * @param tokenSymbol - Token symbol
   * @param walletAddress - Wallet address
   */
  async sendClaimSuccessNotification(
    to: string,
    amount: number,
    tokenSymbol: string,
    walletAddress: string
  ): Promise<{ messages: Array<{ id: string }> }> {
    return this.sendTemplateMessage(
      to,
      WHATSAPP_TEMPLATES.CLAIM_SUCCESS.name,
      WHATSAPP_TEMPLATES.CLAIM_SUCCESS.language,
      [
        { type: 'text', text: amount.toString() },
        { type: 'text', text: tokenSymbol },
        { type: 'text', text: walletAddress },
      ]
    );
  }

  /**
   * Send OTP verification message
   * @param to - Recipient phone number
   * @param otp - OTP code
   */
  async sendOTPMessage(to: string, otp: string): Promise<{ messages: Array<{ id: string }> }> {
    return this.sendTemplateMessage(
      to,
      WHATSAPP_TEMPLATES.OTP_VERIFICATION.name,
      WHATSAPP_TEMPLATES.OTP_VERIFICATION.language,
      [{ type: 'text', text: otp }]
    );
  }

  // ==========================================================================
  // Media
  // ==========================================================================

  /**
   * Get media URL from media ID
   * @param mediaId - Media ID
   */
  async getMediaUrl(mediaId: string): Promise<{ url: string }> {
    return this.request('GET', `/${mediaId}`);
  }

  // ==========================================================================
  // Phone Number Management
  // ==========================================================================

  /**
   * Get phone number info
   */
  async getPhoneNumberInfo(): Promise<{
    verified_name: string;
    display_phone_number: string;
    quality_rating: string;
  }> {
    return this.request('GET', '');
  }

  /**
   * Mark message as read
   * @param messageId - Message ID to mark as read
   */
  async markAsRead(messageId: string): Promise<{ success: boolean }> {
    return this.request('POST', apiEndpoints.whatsapp.messages, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }
}

// Export singleton instance
export const whatsappAPI = new WhatsAppAPI();
