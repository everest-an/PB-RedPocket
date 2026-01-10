// RedPocket Types

export interface RedPocket {
  id: string
  campaignId: string
  senderName: string
  senderAvatar?: string
  amount: number
  remainingAmount: number
  token: string
  tokenAddress: string
  chainId: number
  platform: "telegram" | "discord" | "whatsapp" | "github"
  platformChannelId?: string
  message?: string
  tag?: string
  totalCount: number
  claimedCount: number
  isLuckyDraw: boolean
  minAmount?: number
  maxAmount?: number
  expiresAt: string
  createdAt: string
  status: "active" | "expired" | "depleted" | "cancelled"
}

export interface ClaimRecord {
  id: string
  redPocketId: string
  claimerId: string
  claimerPlatformId: string
  claimerPlatform: string
  claimerWalletAddress: string
  amount: number
  txHash?: string
  status: "pending" | "processing" | "success" | "failed"
  createdAt: string
  completedAt?: string
}

export interface Wallet {
  id: string
  userId: string
  address: string
  chainId: number
  type: "aa" | "eoa"
  isDeployed: boolean
  createdAt: string
}

export interface User {
  id: string
  platformId: string
  platform: string
  walletAddress?: string
  phoneNumber?: string
  email?: string
  createdAt: string
  lastActiveAt: string
}

export interface Campaign {
  id: string
  enterpriseId: string
  name: string
  description?: string
  totalBudget: number
  spentBudget: number
  token: string
  tokenAddress: string
  chainId: number
  platform: "telegram" | "discord" | "whatsapp" | "github"
  totalRedPockets: number
  totalClaims: number
  tag?: string
  status: "active" | "paused" | "completed"
  createdAt: string
  updatedAt: string
}

export interface Enterprise {
  id: string
  name: string
  email: string
  walletAddress: string
  balance: number
  totalSpent: number
  createdAt: string
}

// API Request/Response types
export interface CreateRedPocketRequest {
  campaignId: string
  amount: number
  token: string
  tokenAddress: string
  chainId: number
  platform: "telegram" | "discord" | "whatsapp" | "github"
  platformChannelId?: string
  message?: string
  tag?: string
  totalCount: number
  isLuckyDraw: boolean
  minAmount?: number
  maxAmount?: number
  expiresIn?: number // seconds
}

export interface ClaimRedPocketRequest {
  redPocketId: string
  platformId: string
  platform: string
}

export interface ClaimRedPocketResponse {
  success: boolean
  claimedAmount?: number
  walletAddress?: string
  txHash?: string
  error?: string
}

export interface GetRedPocketResponse {
  redPocket: RedPocket
  isEligible: boolean
  hasClaimed: boolean
  claimRecord?: ClaimRecord
}
