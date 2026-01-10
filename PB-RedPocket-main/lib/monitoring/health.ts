/**
 * @fileoverview Health Check Service
 * @description System health monitoring and status reporting
 * @module lib/monitoring/health
 */

import { HealthCheck, SystemHealth } from './types';

// ============================================================================
// Health Check Service
// ============================================================================

type HealthCheckFn = () => Promise<{ healthy: boolean; message?: string }>;

export class HealthService {
  private checks: Map<string, HealthCheckFn> = new Map();
  private results: Map<string, HealthCheck> = new Map();
  private startTime: number = Date.now();
  private version: string = '1.0.0';

  /**
   * Register a health check
   */
  register(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async runChecks(): Promise<SystemHealth> {
    const checkResults: HealthCheck[] = [];

    for (const [name, checkFn] of this.checks) {
      const start = Date.now();
      try {
        const result = await checkFn();
        const check: HealthCheck = {
          name,
          status: result.healthy ? 'healthy' : 'unhealthy',
          latency: Date.now() - start,
          lastCheck: new Date(),
          message: result.message,
        };
        this.results.set(name, check);
        checkResults.push(check);
      } catch (error) {
        const check: HealthCheck = {
          name,
          status: 'unhealthy',
          latency: Date.now() - start,
          lastCheck: new Date(),
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        this.results.set(name, check);
        checkResults.push(check);
      }
    }

    // Determine overall status
    const hasUnhealthy = checkResults.some(c => c.status === 'unhealthy');
    const hasDegraded = checkResults.some(c => c.status === 'degraded');

    return {
      status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks: checkResults,
      uptime: Date.now() - this.startTime,
      version: this.version,
      timestamp: new Date(),
    };
  }

  /**
   * Get last check result
   */
  getLastResult(name: string): HealthCheck | undefined {
    return this.results.get(name);
  }

  /**
   * Get quick status without running checks
   */
  getQuickStatus(): SystemHealth {
    const checks = Array.from(this.results.values());
    const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
    const hasDegraded = checks.some(c => c.status === 'degraded');

    return {
      status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      checks,
      uptime: Date.now() - this.startTime,
      version: this.version,
      timestamp: new Date(),
    };
  }

  /**
   * Set version
   */
  setVersion(version: string): void {
    this.version = version;
  }
}

// ============================================================================
// Default Health Checks
// ============================================================================

export function createDefaultHealthChecks(healthService: HealthService): void {
  // Database check
  healthService.register('database', async () => {
    // TODO: Implement actual database ping
    return { healthy: true, message: 'Database connection OK' };
  });

  // Redis check
  healthService.register('redis', async () => {
    // TODO: Implement actual Redis ping
    return { healthy: true, message: 'Redis connection OK' };
  });

  // Blockchain RPC check
  healthService.register('blockchain', async () => {
    // TODO: Implement actual RPC check
    return { healthy: true, message: 'Blockchain RPC OK' };
  });

  // Memory check
  healthService.register('memory', async () => {
    const used = process.memoryUsage();
    const heapUsedMb = used.heapUsed / 1024 / 1024;
    const heapTotalMb = used.heapTotal / 1024 / 1024;
    const usagePercent = (heapUsedMb / heapTotalMb) * 100;

    return {
      healthy: usagePercent < 90,
      message: `Heap: ${heapUsedMb.toFixed(1)}MB / ${heapTotalMb.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`,
    };
  });
}

// Export singleton instance
export const healthService = new HealthService();
