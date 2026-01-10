/**
 * @fileoverview Monitoring Types
 * @description Type definitions for monitoring and alerting
 * @module lib/monitoring/types
 */

// ============================================================================
// Metrics Types
// ============================================================================

export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
}

export interface MetricSeries {
  name: string;
  dataPoints: Array<{ timestamp: Date; value: number }>;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

// ============================================================================
// Log Types
// ============================================================================

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  service: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================================
// Alert Types
// ============================================================================

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    duration: number; // seconds
  };
  severity: AlertSeverity;
  channels: string[];
  cooldown: number; // seconds between alerts
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: Date;
  message?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  uptime: number;
  version: string;
  timestamp: Date;
}

// ============================================================================
// Performance Types
// ============================================================================

export interface PerformanceMetrics {
  requestsPerSecond: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  activeConnections: number;
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  networkInMbps: number;
  networkOutMbps: number;
}
