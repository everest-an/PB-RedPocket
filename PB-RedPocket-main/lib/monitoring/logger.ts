/**
 * @fileoverview Structured Logger
 * @description Production-ready logging with structured data
 * @module lib/monitoring/logger
 */

import { LogLevel, LogEntry } from './types';

// ============================================================================
// Logger Configuration
// ============================================================================

interface LoggerConfig {
  service: string;
  level: LogLevel;
  pretty: boolean;
  outputs: Array<'console' | 'file' | 'remote'>;
}

const defaultConfig: LoggerConfig = {
  service: 'redpocket-api',
  level: LogLevel.INFO,
  pretty: process.env.NODE_ENV !== 'production',
  outputs: ['console'],
};

// ============================================================================
// Logger Class
// ============================================================================

export class Logger {
  private config: LoggerConfig;
  private context: Record<string, unknown> = {};

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Create child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    const child = new Logger(this.config);
    child.context = { ...this.context, ...context };
    return child;
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  /**
   * Log fatal message
   */
  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, {
      ...metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      service: this.config.service,
      metadata: { ...this.context, ...metadata },
    };

    this.output(entry);
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  /**
   * Output log entry
   */
  private output(entry: LogEntry): void {
    const formatted = this.config.pretty
      ? this.formatPretty(entry)
      : JSON.stringify(entry);

    if (this.config.outputs.includes('console')) {
      const consoleFn = entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL
        ? console.error
        : entry.level === LogLevel.WARN
          ? console.warn
          : console.log;
      consoleFn(formatted);
    }
  }

  /**
   * Format log entry for human readability
   */
  private formatPretty(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const meta = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    return `[${timestamp}] ${level} ${entry.message}${meta}`;
  }
}

// Export default logger instance
export const logger = new Logger();
