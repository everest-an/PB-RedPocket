/**
 * @fileoverview Discord API Client
 * @description Low-level API client for Discord Bot API
 * @module lib/social/discord/api
 */

import { authConfig, apiEndpoints } from '../../auth/config';
import {
  SlashCommand,
  DiscordMessage,
  InteractionResponseType,
} from './types';

// ============================================================================
// API Client
// ============================================================================

export class DiscordAPI {
  private baseUrl: string;
  private botToken: string;
  private applicationId: string;

  constructor(botToken?: string, applicationId?: string) {
    this.botToken = botToken || authConfig.discord.botToken;
    this.applicationId = applicationId || authConfig.discord.clientId;
    this.baseUrl = apiEndpoints.discord.base;
  }

  /**
   * Make authenticated API request to Discord
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
        'Authorization': `Bot ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord API error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==========================================================================
  // Application Commands
  // ==========================================================================

  /**
   * Register global slash commands
   * @param commands - Array of slash commands
   */
  async registerGlobalCommands(commands: SlashCommand[]): Promise<void> {
    await this.request(
      'PUT',
      `/applications/${this.applicationId}/commands`,
      commands
    );
  }

  /**
   * Register guild-specific slash commands
   * @param guildId - Guild ID
   * @param commands - Array of slash commands
   */
  async registerGuildCommands(guildId: string, commands: SlashCommand[]): Promise<void> {
    await this.request(
      'PUT',
      `/applications/${this.applicationId}/guilds/${guildId}/commands`,
      commands
    );
  }

  /**
   * Get registered global commands
   */
  async getGlobalCommands(): Promise<SlashCommand[]> {
    return this.request('GET', `/applications/${this.applicationId}/commands`);
  }

  // ==========================================================================
  // Interaction Responses
  // ==========================================================================

  /**
   * Respond to an interaction
   * @param interactionId - Interaction ID
   * @param interactionToken - Interaction token
   * @param type - Response type
   * @param data - Response data
   */
  async respondToInteraction(
    interactionId: string,
    interactionToken: string,
    type: InteractionResponseType,
    data?: DiscordMessage
  ): Promise<void> {
    const url = `${this.baseUrl}/interactions/${interactionId}/${interactionToken}/callback`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, data }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Discord interaction response error: ${response.status} - ${error}`);
    }
  }

  /**
   * Edit the original interaction response
   * @param interactionToken - Interaction token
   * @param data - New message data
   */
  async editOriginalResponse(
    interactionToken: string,
    data: DiscordMessage
  ): Promise<void> {
    await this.request(
      'PATCH',
      `/webhooks/${this.applicationId}/${interactionToken}/messages/@original`,
      data
    );
  }

  /**
   * Delete the original interaction response
   * @param interactionToken - Interaction token
   */
  async deleteOriginalResponse(interactionToken: string): Promise<void> {
    await this.request(
      'DELETE',
      `/webhooks/${this.applicationId}/${interactionToken}/messages/@original`
    );
  }

  /**
   * Send a follow-up message
   * @param interactionToken - Interaction token
   * @param data - Message data
   */
  async sendFollowUp(
    interactionToken: string,
    data: DiscordMessage
  ): Promise<{ id: string }> {
    return this.request(
      'POST',
      `/webhooks/${this.applicationId}/${interactionToken}`,
      data
    );
  }

  // ==========================================================================
  // Channel Messages
  // ==========================================================================

  /**
   * Send a message to a channel
   * @param channelId - Channel ID
   * @param data - Message data
   */
  async sendChannelMessage(
    channelId: string,
    data: DiscordMessage
  ): Promise<{ id: string }> {
    return this.request('POST', `/channels/${channelId}/messages`, data);
  }

  /**
   * Edit a channel message
   * @param channelId - Channel ID
   * @param messageId - Message ID
   * @param data - New message data
   */
  async editChannelMessage(
    channelId: string,
    messageId: string,
    data: DiscordMessage
  ): Promise<void> {
    await this.request(
      'PATCH',
      `/channels/${channelId}/messages/${messageId}`,
      data
    );
  }

  /**
   * Delete a channel message
   * @param channelId - Channel ID
   * @param messageId - Message ID
   */
  async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
    await this.request('DELETE', `/channels/${channelId}/messages/${messageId}`);
  }

  // ==========================================================================
  // User Info
  // ==========================================================================

  /**
   * Get current bot user info
   */
  async getCurrentUser(): Promise<{
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
  }> {
    return this.request('GET', '/users/@me');
  }

  /**
   * Get a user by ID
   * @param userId - User ID
   */
  async getUser(userId: string): Promise<{
    id: string;
    username: string;
    discriminator: string;
    global_name?: string;
    avatar?: string;
  }> {
    return this.request('GET', `/users/${userId}`);
  }

  // ==========================================================================
  // Guild Info
  // ==========================================================================

  /**
   * Get guild info
   * @param guildId - Guild ID
   */
  async getGuild(guildId: string): Promise<{
    id: string;
    name: string;
    icon?: string;
    owner_id: string;
    member_count?: number;
  }> {
    return this.request('GET', `/guilds/${guildId}`);
  }

  /**
   * Get guild member
   * @param guildId - Guild ID
   * @param userId - User ID
   */
  async getGuildMember(guildId: string, userId: string): Promise<{
    user: { id: string; username: string };
    nick?: string;
    roles: string[];
    joined_at: string;
  }> {
    return this.request('GET', `/guilds/${guildId}/members/${userId}`);
  }
}

// Export singleton instance
export const discordAPI = new DiscordAPI();
