/**
 * @fileoverview Configuration Types
 * @description Type definitions for configuration management
 * @module lib/config/types
 */

// ============================================================================
// Configuration Schema Types
// ============================================================================

export interface ConfigSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: unknown[];
  items?: ConfigSchema;
  properties?: Record<string, ConfigSchema>;
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
}

// ============================================================================
// Application Configuration Types
// ============================================================================

export interface AppConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  
  blockchain: BlockchainConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  social: SocialConfig;
  security: SecurityConfig;
  features: FeatureFlags;
}

export interface BlockchainConfig {
  defaultChainId: number;
  supportedChains: number[];
  rpcUrls: Record<number, string>;
  entryPointAddress: string;
  paymasterAddress: string;
  factoryAddress: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  poolSize: number;
  ssl: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

export interface SocialConfig {
  telegram: {
    botToken: string;
    webhookUrl: string;
    webAppUrl: string;
  };
  discord: {
    clientId: string;
    clientSecret: string;
    botToken: string;
    webhookUrl: string;
  };
  whatsapp: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  github: {
    appId: string;
    privateKey: string;
    webhookSecret: string;
  };
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  rateLimits: Record<string, { windowMs: number; maxRequests: number }>;
  allowedOrigins: string[];
}

export interface FeatureFlags {
  enableCrossChain: boolean;
  enableFiatOfframp: boolean;
  enableMultiSig: boolean;
  enableLuckyDraw: boolean;
  maintenanceMode: boolean;
}

// ============================================================================
// Configuration Change Types
// ============================================================================

export interface ConfigChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: Date;
  changedBy: string;
}

export interface ConfigSnapshot {
  id: string;
  config: AppConfig;
  createdAt: Date;
  createdBy: string;
  description?: string;
}
