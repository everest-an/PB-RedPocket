/**
 * @fileoverview Configuration Service
 * @description Configuration management with validation and hot reloading
 * @module lib/config/config
 */

import {
  AppConfig,
  ConfigSchema,
  ConfigValidationResult,
  ConfigValidationError,
  ConfigChange,
  ConfigSnapshot,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const defaultConfig: AppConfig = {
  version: '1.0.0',
  environment: 'development',
  
  blockchain: {
    defaultChainId: 1,
    supportedChains: [1, 137, 42161],
    rpcUrls: {
      1: 'https://eth-mainnet.g.alchemy.com/v2/demo',
      137: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
      42161: 'https://arb-mainnet.g.alchemy.com/v2/demo',
    },
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    paymasterAddress: '0x0000000000000000000000000000000000000000',
    factoryAddress: '0x0000000000000000000000000000000000000000',
  },
  
  database: {
    host: 'localhost',
    port: 5432,
    database: 'redpocket',
    username: 'postgres',
    password: '',
    poolSize: 10,
    ssl: false,
  },
  
  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
    keyPrefix: 'rp:',
  },
  
  social: {
    telegram: {
      botToken: '',
      webhookUrl: '',
      webAppUrl: '',
    },
    discord: {
      clientId: '',
      clientSecret: '',
      botToken: '',
      webhookUrl: '',
    },
    whatsapp: {
      accountSid: '',
      authToken: '',
      phoneNumber: '',
    },
    github: {
      appId: '',
      privateKey: '',
      webhookSecret: '',
    },
  },
  
  security: {
    jwtSecret: 'change-me-in-production',
    jwtExpiresIn: '7d',
    rateLimits: {
      api: { windowMs: 60000, maxRequests: 100 },
      claim: { windowMs: 60000, maxRequests: 10 },
    },
    allowedOrigins: ['http://localhost:3000'],
  },
  
  features: {
    enableCrossChain: true,
    enableFiatOfframp: false,
    enableMultiSig: true,
    enableLuckyDraw: true,
    maintenanceMode: false,
  },
};

// ============================================================================
// Configuration Schema
// ============================================================================

const configSchema: Record<string, ConfigSchema> = {
  version: { type: 'string', required: true },
  environment: { type: 'string', required: true, enum: ['development', 'staging', 'production'] },
  'blockchain.defaultChainId': { type: 'number', required: true, min: 1 },
  'blockchain.supportedChains': { type: 'array', required: true, items: { type: 'number' } },
  'database.host': { type: 'string', required: true },
  'database.port': { type: 'number', required: true, min: 1, max: 65535 },
  'database.poolSize': { type: 'number', required: true, min: 1, max: 100 },
  'redis.host': { type: 'string', required: true },
  'redis.port': { type: 'number', required: true, min: 1, max: 65535 },
  'security.jwtExpiresIn': { type: 'string', required: true, pattern: '^\\d+[smhd]$' },
};


// ============================================================================
// Configuration Service
// ============================================================================

export class ConfigService {
  private config: AppConfig;
  private snapshots: ConfigSnapshot[] = [];
  private changeListeners: Array<(changes: ConfigChange[]) => void> = [];

  constructor(initialConfig?: Partial<AppConfig>) {
    this.config = this.mergeConfig(defaultConfig, initialConfig || {});
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get a specific config value by path
   * @param path - Dot-separated path (e.g., 'blockchain.defaultChainId')
   */
  get<T>(path: string): T | undefined {
    const parts = path.split('.');
    let current: unknown = this.config;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current as T;
  }

  /**
   * Set a config value by path
   * @param path - Dot-separated path
   * @param value - New value
   * @param changedBy - Who made the change
   */
  set(path: string, value: unknown, changedBy: string = 'system'): void {
    const oldValue = this.get(path);
    
    // Validate the change
    const schema = configSchema[path];
    if (schema) {
      const error = this.validateValue(path, value, schema);
      if (error) {
        throw new Error(`Validation error: ${error.message}`);
      }
    }

    // Apply the change
    const parts = path.split('.');
    let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;

    // Notify listeners
    const change: ConfigChange = {
      path,
      oldValue,
      newValue: value,
      changedAt: new Date(),
      changedBy,
    };

    this.notifyListeners([change]);
  }

  /**
   * Update multiple config values
   */
  update(updates: Record<string, unknown>, changedBy: string = 'system'): void {
    const changes: ConfigChange[] = [];

    for (const [path, value] of Object.entries(updates)) {
      const oldValue = this.get(path);
      
      const schema = configSchema[path];
      if (schema) {
        const error = this.validateValue(path, value, schema);
        if (error) {
          throw new Error(`Validation error at ${path}: ${error.message}`);
        }
      }

      changes.push({
        path,
        oldValue,
        newValue: value,
        changedAt: new Date(),
        changedBy,
      });
    }

    // Apply all changes
    for (const change of changes) {
      const parts = change.path.split('.');
      let current: Record<string, unknown> = this.config as unknown as Record<string, unknown>;

      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]] as Record<string, unknown>;
      }

      current[parts[parts.length - 1]] = change.newValue;
    }

    this.notifyListeners(changes);
  }

  /**
   * Validate entire configuration
   */
  validate(): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];

    for (const [path, schema] of Object.entries(configSchema)) {
      const value = this.get(path);
      const error = this.validateValue(path, value, schema);
      if (error) {
        errors.push(error);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single value against schema
   */
  private validateValue(
    path: string,
    value: unknown,
    schema: ConfigSchema
  ): ConfigValidationError | null {
    // Check required
    if (schema.required && (value === undefined || value === null)) {
      return { path, message: 'Value is required', value };
    }

    if (value === undefined || value === null) {
      return null;
    }

    // Check type
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      return { path, message: `Expected ${schema.type}, got ${actualType}`, value };
    }

    // Check number constraints
    if (schema.type === 'number') {
      if (schema.min !== undefined && (value as number) < schema.min) {
        return { path, message: `Value must be >= ${schema.min}`, value };
      }
      if (schema.max !== undefined && (value as number) > schema.max) {
        return { path, message: `Value must be <= ${schema.max}`, value };
      }
    }

    // Check string pattern
    if (schema.type === 'string' && schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value as string)) {
        return { path, message: `Value must match pattern ${schema.pattern}`, value };
      }
    }

    // Check enum
    if (schema.enum && !schema.enum.includes(value)) {
      return { path, message: `Value must be one of: ${schema.enum.join(', ')}`, value };
    }

    return null;
  }


  // ==========================================================================
  // Snapshots and Hot Reloading
  // ==========================================================================

  /**
   * Create a snapshot of current configuration
   */
  createSnapshot(createdBy: string, description?: string): ConfigSnapshot {
    const snapshot: ConfigSnapshot = {
      id: `snapshot_${Date.now()}`,
      config: this.getConfig(),
      createdAt: new Date(),
      createdBy,
      description,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Restore configuration from snapshot
   */
  restoreSnapshot(snapshotId: string, restoredBy: string): void {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const oldConfig = this.config;
    this.config = JSON.parse(JSON.stringify(snapshot.config));

    // Generate change events
    const changes = this.diffConfigs(oldConfig, this.config, restoredBy);
    if (changes.length > 0) {
      this.notifyListeners(changes);
    }
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): ConfigSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Register a change listener for hot reloading
   */
  onChange(listener: (changes: ConfigChange[]) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(changes: ConfigChange[]): void {
    for (const listener of this.changeListeners) {
      try {
        listener(changes);
      } catch (error) {
        console.error('Config change listener error:', error);
      }
    }
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Serialize configuration to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Load configuration from JSON
   */
  fromJSON(json: string, loadedBy: string = 'system'): void {
    const newConfig = JSON.parse(json) as AppConfig;
    
    // Validate new config
    const oldConfig = this.config;
    this.config = this.mergeConfig(defaultConfig, newConfig);
    
    const validation = this.validate();
    if (!validation.valid) {
      this.config = oldConfig;
      throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const changes = this.diffConfigs(oldConfig, this.config, loadedBy);
    if (changes.length > 0) {
      this.notifyListeners(changes);
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    return this.deepMerge(base, override) as AppConfig;
  }

  private deepMerge(target: unknown, source: unknown): unknown {
    if (source === undefined) return target;
    if (target === undefined) return source;
    
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return source;
    
    if (Array.isArray(source)) return [...source];
    
    const result: Record<string, unknown> = { ...(target as Record<string, unknown>) };
    
    for (const key of Object.keys(source as Record<string, unknown>)) {
      result[key] = this.deepMerge(
        (target as Record<string, unknown>)[key],
        (source as Record<string, unknown>)[key]
      );
    }
    
    return result;
  }

  private diffConfigs(
    oldConfig: AppConfig,
    newConfig: AppConfig,
    changedBy: string
  ): ConfigChange[] {
    const changes: ConfigChange[] = [];
    
    const flatten = (obj: unknown, prefix = ''): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      
      if (typeof obj !== 'object' || obj === null) {
        return { [prefix]: obj };
      }
      
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(result, flatten(value, path));
        } else {
          result[path] = value;
        }
      }
      
      return result;
    };

    const oldFlat = flatten(oldConfig);
    const newFlat = flatten(newConfig);

    const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);

    for (const key of allKeys) {
      const oldValue = oldFlat[key];
      const newValue = newFlat[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          path: key,
          oldValue,
          newValue,
          changedAt: new Date(),
          changedBy,
        });
      }
    }

    return changes;
  }
}

// Export singleton instance
export const configService = new ConfigService();
