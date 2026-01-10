/**
 * @fileoverview Alert Service
 * @description Alerting for critical system failures
 * @module lib/monitoring/alerts
 */

import { AlertRule, Alert, AlertSeverity } from './types';
import { metrics } from './metrics';

// ============================================================================
// Alert Store
// ============================================================================

interface AlertStore {
  rules: Map<string, AlertRule>;
  alerts: Map<string, Alert>;
  lastTriggered: Map<string, number>;
}

const store: AlertStore = {
  rules: new Map(),
  alerts: new Map(),
  lastTriggered: new Map(),
};

// ============================================================================
// Alert Service
// ============================================================================

export class AlertService {
  private channels: Map<string, (alert: Alert) => Promise<void>> = new Map();

  /**
   * Register an alert rule
   */
  registerRule(rule: AlertRule): void {
    store.rules.set(rule.id, rule);
  }

  /**
   * Register a notification channel
   */
  registerChannel(name: string, handler: (alert: Alert) => Promise<void>): void {
    this.channels.set(name, handler);
  }

  /**
   * Evaluate all rules
   */
  async evaluateRules(): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of store.rules.values()) {
      if (!rule.enabled) continue;

      const value = metrics.getGauge(rule.condition.metric) ||
                    metrics.getCounter(rule.condition.metric);

      const triggered = this.evaluateCondition(value, rule.condition);

      if (triggered) {
        const alert = await this.triggerAlert(rule, value);
        if (alert) {
          triggeredAlerts.push(alert);
        }
      } else {
        // Resolve existing alert
        this.resolveAlert(rule.id);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, value: number): Promise<Alert | null> {
    // Check cooldown
    const lastTriggered = store.lastTriggered.get(rule.id) || 0;
    if (Date.now() - lastTriggered < rule.cooldown * 1000) {
      return null;
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${rule.id}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.name}: ${rule.condition.metric} is ${value} (threshold: ${rule.condition.threshold})`,
      value,
      threshold: rule.condition.threshold,
      triggeredAt: new Date(),
      acknowledged: false,
    };

    store.alerts.set(alert.id, alert);
    store.lastTriggered.set(rule.id, Date.now());

    // Send notifications
    await this.sendNotifications(alert, rule.channels);

    return alert;
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(ruleId: string): void {
    for (const [alertId, alert] of store.alerts) {
      if (alert.ruleId === ruleId && !alert.resolvedAt) {
        alert.resolvedAt = new Date();
      }
    }
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = store.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(store.alerts.values())
      .filter(a => !a.resolvedAt);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 100): Alert[] {
    return Array.from(store.alerts.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  /**
   * Send notifications to channels
   */
  private async sendNotifications(alert: Alert, channelNames: string[]): Promise<void> {
    for (const channelName of channelNames) {
      const handler = this.channels.get(channelName);
      if (handler) {
        try {
          await handler(alert);
        } catch (error) {
          console.error(`Failed to send alert to ${channelName}:`, error);
        }
      }
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    value: number,
    condition: AlertRule['condition']
  ): boolean {
    switch (condition.operator) {
      case '>': return value > condition.threshold;
      case '<': return value < condition.threshold;
      case '>=': return value >= condition.threshold;
      case '<=': return value <= condition.threshold;
      case '==': return value === condition.threshold;
      case '!=': return value !== condition.threshold;
      default: return false;
    }
  }

  /**
   * Clear all alerts (for testing)
   */
  clear(): void {
    store.rules.clear();
    store.alerts.clear();
    store.lastTriggered.clear();
  }
}

// ============================================================================
// Default Alert Rules
// ============================================================================

export function createDefaultAlertRules(alertService: AlertService): void {
  alertService.registerRule({
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'Error rate exceeds 5%',
    enabled: true,
    condition: {
      metric: 'http.error_rate',
      operator: '>',
      threshold: 5,
      duration: 60,
    },
    severity: AlertSeverity.ERROR,
    channels: ['slack', 'email'],
    cooldown: 300,
  });

  alertService.registerRule({
    id: 'high_latency',
    name: 'High Latency',
    description: 'P95 latency exceeds 2 seconds',
    enabled: true,
    condition: {
      metric: 'http.latency_p95',
      operator: '>',
      threshold: 2000,
      duration: 60,
    },
    severity: AlertSeverity.WARNING,
    channels: ['slack'],
    cooldown: 300,
  });

  alertService.registerRule({
    id: 'low_balance',
    name: 'Low Paymaster Balance',
    description: 'Paymaster balance below threshold',
    enabled: true,
    condition: {
      metric: 'paymaster.balance',
      operator: '<',
      threshold: 1,
      duration: 0,
    },
    severity: AlertSeverity.CRITICAL,
    channels: ['slack', 'email', 'pagerduty'],
    cooldown: 3600,
  });
}

// Export singleton instance
export const alertService = new AlertService();
