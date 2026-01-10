/**
 * @fileoverview API Module Exports
 * @description Central export point for API services
 * @module lib/api
 */

// Services
export { redpocketService, RedPocketService } from './services/redpocket.service';
export { dashboardService, DashboardService } from './services/dashboard.service';

// Re-export types for convenience
export type {
  CreateRedPocketInput,
  ClaimRedPocketInput,
  ClaimResult,
} from './services/redpocket.service';
