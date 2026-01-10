export const API_CONFIG = {
  // Use environment variable for backend URL
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
}

export const BACKEND_ENDPOINTS = {
  // RedPocket APIs
  createRedPocket: "/api/v1/redpocket/create",
  claimRedPocket: "/api/v1/redpocket/claim",
  getRedPocket: (id: string) => `/api/v1/redpocket/${id}`,

  // User APIs
  getUserWallet: (userId: string) => `/api/v1/wallet/${userId}`,
  requestWithdrawal: "/api/v1/withdrawal/request",

  // Enterprise APIs
  getCampaigns: "/api/v1/enterprise/campaigns",
  getClaims: "/api/v1/enterprise/claims",
  getAnalytics: "/api/v1/enterprise/analytics",

  // Health check
  health: "/health",
}
