import { type NextRequest, NextResponse } from "next/server"
import type { ClaimRedPocketRequest, ClaimRedPocketResponse, ClaimRecord, RedPocket } from "@/lib/types"
import { getOrCreateWallet, sendGaslessTransaction } from "@/lib/wallet"

// In-memory stores for demo
const redPockets = new Map<string, RedPocket>()
const claims = new Map<string, ClaimRecord[]>()

// Initialize demo data
const demoRedPocket: RedPocket = {
  id: "demo_123",
  campaignId: "campaign_1",
  senderName: "Protocol Bank",
  senderAvatar: "/abstract-logo.png",
  amount: 50,
  remainingAmount: 2900,
  token: "USDC",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  chainId: 8453,
  platform: "telegram",
  message: "Welcome to our community!",
  tag: "Marketing",
  totalCount: 100,
  claimedCount: 42,
  isLuckyDraw: false,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  status: "active",
}
redPockets.set("demo_123", demoRedPocket)

export async function POST(request: NextRequest): Promise<NextResponse<ClaimRedPocketResponse>> {
  try {
    const body: ClaimRedPocketRequest = await request.json()
    const { redPocketId, platformId, platform } = body

    // Get red pocket
    let redPocket = redPockets.get(redPocketId)
    if (!redPocket) {
      // For demo, create a temporary one
      redPocket = { ...demoRedPocket, id: redPocketId }
      redPockets.set(redPocketId, redPocket)
    }

    // Validate status
    if (redPocket.status !== "active") {
      return NextResponse.json({
        success: false,
        error: `Red pocket is ${redPocket.status}`,
      })
    }

    // Check expiration
    if (new Date(redPocket.expiresAt) < new Date()) {
      redPocket.status = "expired"
      return NextResponse.json({
        success: false,
        error: "Red pocket has expired",
      })
    }

    // Check if already claimed by this user
    const userClaims = claims.get(redPocketId) || []
    const existingClaim = userClaims.find((c) => c.claimerPlatformId === platformId && c.claimerPlatform === platform)
    if (existingClaim) {
      return NextResponse.json({
        success: false,
        error: "You have already claimed this red pocket",
      })
    }

    // Check remaining
    if (redPocket.claimedCount >= redPocket.totalCount) {
      redPocket.status = "depleted"
      return NextResponse.json({
        success: false,
        error: "Red pocket is fully claimed",
      })
    }

    // Calculate claim amount
    let claimAmount: number
    if (redPocket.isLuckyDraw) {
      const min = redPocket.minAmount || 0.01
      const avgRemaining = redPocket.remainingAmount / (redPocket.totalCount - redPocket.claimedCount)
      const max = Math.min(redPocket.maxAmount || avgRemaining * 2, redPocket.remainingAmount)
      claimAmount = Number((Math.random() * (max - min) + min).toFixed(2))
    } else {
      claimAmount = redPocket.amount / redPocket.totalCount
    }

    // Ensure we don't exceed remaining
    claimAmount = Math.min(claimAmount, redPocket.remainingAmount)

    // Generate user ID and wallet
    const userId = `user_${platform}_${platformId}`
    const wallet = await getOrCreateWallet(userId, redPocket.chainId)

    // Create claim record
    const claimRecord: ClaimRecord = {
      id: `claim_${Date.now()}`,
      redPocketId,
      claimerId: userId,
      claimerPlatformId: platformId,
      claimerPlatform: platform,
      claimerWalletAddress: wallet.address,
      amount: claimAmount,
      status: "processing",
      createdAt: new Date().toISOString(),
    }

    // Execute gasless transfer
    // In production: call smart contract to transfer tokens
    const { txHash, success } = await sendGaslessTransaction(
      wallet,
      wallet.address,
      "0x", // Transfer calldata
      "0",
    )

    if (success) {
      claimRecord.status = "success"
      claimRecord.txHash = txHash
      claimRecord.completedAt = new Date().toISOString()

      // Update red pocket
      redPocket.claimedCount += 1
      redPocket.remainingAmount -= claimAmount

      if (redPocket.claimedCount >= redPocket.totalCount || redPocket.remainingAmount <= 0) {
        redPocket.status = "depleted"
      }

      // Store claim
      claims.set(redPocketId, [...userClaims, claimRecord])

      return NextResponse.json({
        success: true,
        claimedAmount: claimAmount,
        walletAddress: wallet.address,
        txHash,
      })
    } else {
      claimRecord.status = "failed"
      return NextResponse.json({
        success: false,
        error: "Transaction failed",
      })
    }
  } catch (error) {
    console.error("Claim error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error",
    })
  }
}
