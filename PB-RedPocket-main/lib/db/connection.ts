/**
 * @fileoverview Database Connection Manager
 * @description PostgreSQL connection pool and Redis client management
 * @module lib/db/connection
 */

import { Pool, PoolConfig, QueryResult } from 'pg';
import Redis from 'ioredis';

// ============================================================================
// Configuration
// ============================================================================

const pgConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'redpocket',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: parseInt(process.env.POSTGRES_POOL_SIZE || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
};

// ============================================================================
// Connection Pool
// ============================================================================

let pgPool: Pool | null = null;
let redisClient: Redis | null = null;

/**
 * Get PostgreSQL connection pool
 * @returns PostgreSQL pool instance
 */
export function getPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool(pgConfig);
    
    // Handle pool errors
    pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
    
    // Log connection info
    pgPool.on('connect', () => {
      console.log('PostgreSQL client connected');
    });
  }
  return pgPool;
}

/**
 * Get Redis client
 * @returns Redis client instance
 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });
  }
  return redisClient;
}

/**
 * Execute a database query
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Execute a transaction
 * @param callback - Transaction callback function
 * @returns Transaction result
 */
export async function transaction<T>(
  callback: (client: Pool) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(pool);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections
 */
export async function closeConnections(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

/**
 * Health check for database connections
 * @returns Health status
 */
export async function healthCheck(): Promise<{
  postgres: boolean;
  redis: boolean;
  latency: { postgres: number; redis: number };
}> {
  const result = {
    postgres: false,
    redis: false,
    latency: { postgres: -1, redis: -1 },
  };
  
  // Check PostgreSQL
  try {
    const pgStart = Date.now();
    await query('SELECT 1');
    result.postgres = true;
    result.latency.postgres = Date.now() - pgStart;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }
  
  // Check Redis
  try {
    const redisStart = Date.now();
    const redis = getRedis();
    await redis.ping();
    result.redis = true;
    result.latency.redis = Date.now() - redisStart;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }
  
  return result;
}
