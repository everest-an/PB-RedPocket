/**
 * @fileoverview Metrics Collection
 * @description Performance monitoring and metrics collection
 * @module lib/monitoring/metrics
 */

import { Metric, PerformanceMetrics, ResourceUsage } from './types';

// ============================================================================
// Metrics Store
// ============================================================================

interface MetricsStore {
  counters: Map<string, number>;
  gauges: Map<string, number>;
  histograms: Map<string, number[]>;
  timers: Map<string, number[]>;
}

const store: MetricsStore = {
  counters: new Map(),
  gauges: new Map(),
  histograms: new Map(),
  timers: new Map(),
};

// ============================================================================
// Metrics Service
// ============================================================================

export class MetricsService {
  private tags: Record<string, string> = {};

  constructor(defaultTags?: Record<string, string>) {
    this.tags = defaultTags || {};
  }

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const current = store.counters.get(key) || 0;
    store.counters.set(key, current + value);
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    store.gauges.set(key, value);
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const values = store.histograms.get(key) || [];
    values.push(value);
    // Keep last 1000 values
    if (values.length > 1000) values.shift();
    store.histograms.set(key, values);
  }

  /**
   * Start a timer
   */
  startTimer(name: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.timing(name, duration);
    };
  }

  /**
   * Record a timing value
   */
  timing(name: string, durationMs: number, tags?: Record<string, string>): void {
    const key = this.buildKey(name, tags);
    const values = store.timers.get(key) || [];
    values.push(durationMs);
    if (values.length > 1000) values.shift();
    store.timers.set(key, values);
  }

  /**
   * Get counter value
   */
  getCounter(name: string, tags?: Record<string, string>): number {
    const key = this.buildKey(name, tags);
    return store.counters.get(key) || 0;
  }

  /**
   * Get gauge value
   */
  getGauge(name: string, tags?: Record<string, string>): number {
    const key = this.buildKey(name, tags);
    return store.gauges.get(key) || 0;
  }

  /**
   * Get histogram percentile
   */
  getPercentile(name: string, percentile: number, tags?: Record<string, string>): number {
    const key = this.buildKey(name, tags);
    const values = store.histograms.get(key) || store.timers.get(key) || [];
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const requestTimes = store.timers.get('http.request.duration') || [];
    const errorCount = store.counters.get('http.request.error') || 0;
    const totalCount = store.counters.get('http.request.total') || 1;

    return {
      requestsPerSecond: this.getGauge('http.requests_per_second'),
      avgResponseTime: requestTimes.length > 0
        ? requestTimes.reduce((a, b) => a + b, 0) / requestTimes.length
        : 0,
      p50ResponseTime: this.getPercentile('http.request.duration', 50),
      p95ResponseTime: this.getPercentile('http.request.duration', 95),
      p99ResponseTime: this.getPercentile('http.request.duration', 99),
      errorRate: (errorCount / totalCount) * 100,
      activeConnections: this.getGauge('http.active_connections'),
    };
  }

  /**
   * Get resource usage (mock implementation)
   */
  getResourceUsage(): ResourceUsage {
    return {
      cpuPercent: this.getGauge('system.cpu_percent') || Math.random() * 50,
      memoryUsedMb: this.getGauge('system.memory_used_mb') || 512,
      memoryTotalMb: this.getGauge('system.memory_total_mb') || 2048,
      diskUsedGb: this.getGauge('system.disk_used_gb') || 50,
      diskTotalGb: this.getGauge('system.disk_total_gb') || 100,
      networkInMbps: this.getGauge('system.network_in_mbps') || 10,
      networkOutMbps: this.getGauge('system.network_out_mbps') || 5,
    };
  }

  /**
   * Export all metrics
   */
  exportMetrics(): Metric[] {
    const metrics: Metric[] = [];
    const now = new Date();

    for (const [key, value] of store.counters) {
      metrics.push({
        name: key,
        value,
        unit: 'count',
        timestamp: now,
        tags: this.tags,
      });
    }

    for (const [key, value] of store.gauges) {
      metrics.push({
        name: key,
        value,
        unit: 'gauge',
        timestamp: now,
        tags: this.tags,
      });
    }

    return metrics;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    store.counters.clear();
    store.gauges.clear();
    store.histograms.clear();
    store.timers.clear();
  }

  private buildKey(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${tagStr}}`;
  }
}

// Export singleton instance
export const metrics = new MetricsService({ service: 'redpocket' });
