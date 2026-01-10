/**
 * @fileoverview Redis Cache Service
 * @description Caching layer for frequently accessed data
 * @module lib/db/cache
 */

import { getRedis } from './connection';
import { RedPocketEntity, UserEntity, DashboardStats } from './types';

// ============================================================================
// Cache Key Prefixes
// ============================================================================

const CACHE_KEYS = {
  REDPOCKET: 'rp:',
  USER: 'user:',
  WALLET: 'wallet:',
  DASHBOARD: 'dash:',
  SESSION: 'sess:',
  RATE_LIMIT: 'rl:',
  CLAIM_LOCK: 'lock:claim:',
} as const;

// ============================================================================
// Cache TTL (in seconds)
// ============================================================================

const TTL = {
  REDPOCKET: 300,      // 5 minutes
  USER: 600,           // 10 minutes
  WALLET: 3600,        // 1 hour
  DASHBOARD: 60,       // 1 minute
  SESSION: 86400,      // 24 hours
  RATE_LIMIT: 60,      // 1 minute
  CLAIM_LOCK: 30,      // 30 seconds
} as const;

// ============================================================================
// Cache Service
// ============================================================================

export class CacheService {
  /**
   * Get cached RedPocket by ID
   * @param id - RedPocket ID
   * @returns Cached RedPocket or null
   */
  async getRedPocket(id: string): Promise<RedPocketEntity | null> {
    const redis = getRedis();
    const data = await redis.get(`${CACHE_KEYS.REDPOCKET}${id}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache RedPocket data
   * @param redpocket - RedPocket entity
   */
  async setRedPocket(redpocket: RedPocketEntity): Promise<void> {
    const redis = getRedis();
    await redis.setex(
      `${CACHE_KEYS.REDPOCKET}${redpocket.id}`,
      TTL.REDPOCKET,
      JSON.stringify(redpocket)
    );
  }

  /**
   * Invalidate RedPocket cache
   * @param id - RedPocket ID
   */
  async invalidateRedPocket(id: string): Promise<void> {
    const redis = getRedis();
    await redis.del(`${CACHE_KEYS.REDPOCKET}${id}`);
  }

  /**
   * Get cached user by platform identity
   * @param platform - Platform name
   * @param platformId - Platform user ID
   * @returns Cached user or null
   */
  async getUser(platform: string, platformId: string): Promise<UserEntity | null> {
    const redis = getRedis();
    const data = await redis.get(`${CACHE_KEYS.USER}${platform}:${platformId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache user data
   * @param user - User entity
   */
  async setUser(user: UserEntity): Promise<void> {
    const redis = getRedis();
    await redis.setex(
      `${CACHE_KEYS.USER}${user.platform}:${user.platform_id}`,
      TTL.USER,
      JSON.stringify(user)
    );
  }

  /**
   * Get cached wallet address
   * @param userId - User ID
   * @param chainId - Chain ID
   * @returns Wallet address or null
   */
  async getWalletAddress(userId: string, chainId: number): Promise<string | null> {
    const redis = getRedis();
    return redis.get(`${CACHE_KEYS.WALLET}${userId}:${chainId}`);
  }

  /**
   * Cache wallet address
   * @param userId - User ID
   * @param chainId - Chain ID
   * @param address - Wallet address
   */
  async setWalletAddress(userId: string, chainId: number, address: string): Promise<void> {
    const redis = getRedis();
    await redis.setex(
      `${CACHE_KEYS.WALLET}${userId}:${chainId}`,
      TTL.WALLET,
      address
    );
  }

  /**
   * Get cached dashboard stats
   * @param enterpriseId - Enterprise ID
   * @returns Dashboard stats or null
   */
  async getDashboardStats(enterpriseId: string): Promise<DashboardStats | null> {
    const redis = getRedis();
    const data = await redis.get(`${CACHE_KEYS.DASHBOARD}${enterpriseId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache dashboard stats
   * @param enterpriseId - Enterprise ID
   * @param stats - Dashboard statistics
   */
  async setDashboardStats(enterpriseId: string, stats: DashboardStats): Promise<void> {
    const redis = getRedis();
    await redis.setex(
      `${CACHE_KEYS.DASHBOARD}${enterpriseId}`,
      TTL.DASHBOARD,
      JSON.stringify(stats)
    );
  }

  /**
   * Acquire claim lock (prevent double claims)
   * @param redpocketId - RedPocket ID
   * @param userId - User ID
   * @returns True if lock acquired, false if already locked
   */
  async acquireClaimLock(redpocketId: string, userId: string): Promise<boolean> {
    const redis = getRedis();
    const key = `${CACHE_KEYS.CLAIM_LOCK}${redpocketId}:${userId}`;
    const result = await redis.set(key, '1', 'EX', TTL.CLAIM_LOCK, 'NX');
    return result === 'OK';
  }

  /**
   * Release claim lock
   * @param redpocketId - RedPocket ID
   * @param userId - User ID
   */
  async releaseClaimLock(redpocketId: string, userId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(`${CACHE_KEYS.CLAIM_LOCK}${redpocketId}:${userId}`);
  }

  /**
   * Check rate limit
   * @param key - Rate limit key (e.g., IP address or user ID)
   * @param limit - Maximum requests allowed
   * @param window - Time window in seconds
   * @returns True if within limit, false if exceeded
   */
  async checkRateLimit(key: string, limit: number, window: number = 60): Promise<boolean> {
    const redis = getRedis();
    const fullKey = `${CACHE_KEYS.RATE_LIMIT}${key}`;
    
    const current = await redis.incr(fullKey);
    
    if (current === 1) {
      await redis.expire(fullKey, window);
    }
    
    return current <= limit;
  }

  /**
   * Store session data
   * @param sessionId - Session ID
   * @param data - Session data
   */
  async setSession(sessionId: string, data: Record<string, unknown>): Promise<void> {
    const redis = getRedis();
    await redis.setex(
      `${CACHE_KEYS.SESSION}${sessionId}`,
      TTL.SESSION,
      JSON.stringify(data)
    );
  }

  /**
   * Get session data
   * @param sessionId - Session ID
   * @returns Session data or null
   */
  async getSession(sessionId: string): Promise<Record<string, unknown> | null> {
    const redis = getRedis();
    const data = await redis.get(`${CACHE_KEYS.SESSION}${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete session
   * @param sessionId - Session ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(`${CACHE_KEYS.SESSION}${sessionId}`);
  }

  /**
   * Increment counter (for analytics)
   * @param key - Counter key
   * @param amount - Amount to increment
   * @returns New counter value
   */
  async incrementCounter(key: string, amount: number = 1): Promise<number> {
    const redis = getRedis();
    return redis.incrby(key, amount);
  }

  /**
   * Publish event to channel
   * @param channel - Channel name
   * @param message - Message to publish
   */
  async publish(channel: string, message: unknown): Promise<void> {
    const redis = getRedis();
    await redis.publish(channel, JSON.stringify(message));
  }
}

// Export singleton instance
export const cache = new CacheService();
