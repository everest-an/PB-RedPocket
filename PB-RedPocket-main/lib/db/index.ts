/**
 * @fileoverview Database Module Exports
 * @description Central export point for database functionality
 * @module lib/db
 */

// Connection management
export {
  getPool,
  getRedis,
  query,
  transaction,
  closeConnections,
  healthCheck,
} from './connection';

// Cache service
export { cache, CacheService } from './cache';

// Repositories
export { redpocketRepository, RedPocketRepository } from './repositories/redpocket.repository';
export { claimRepository, ClaimRepository } from './repositories/claim.repository';
export { userRepository, UserRepository } from './repositories/user.repository';

// Types
export * from './types';
