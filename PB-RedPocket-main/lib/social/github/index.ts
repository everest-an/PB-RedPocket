/**
 * @fileoverview GitHub Module Exports
 * @description Public API for GitHub App integration
 * @module lib/social/github
 */

// Types
export * from './types';

// API Client
export { GitHubAPI, githubAPI } from './api';

// Bot Handler
export { GitHubBot, githubBot } from './bot';

// Webhook Handler
export {
  GitHubWebhookHandler,
  githubWebhookHandler,
  createGitHubWebhookHandler,
  verifyGitHubSignature,
} from './webhook';
