import { type NextRequest, NextResponse } from "next/server"
import type { RedPocket, GetRedPocketResponse } from "@/lib/types"

// In-memory store for demo - use database in production
const redPockets = new Map<string, RedPocket>()

// Initialize demo red pocket
const demoRedPocket: RedPocket = {
  id: "demo_123",
  campaignId: "campaign_1",
  senderName: "Protocol Bank",
  senderAvatar: "/abstract-logo.png",
  amount: 50,
  remainingAmount: 2900,
  token: "USDC",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  chainId: 8453, // Base
  platform: "telegram",
  message: "Welcome to our community! Claim your reward now.",
  tag: "Marketing",
  totalCount: 100,
  claimedCount: 42,
  isLuckyDraw: false,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  status: "active",
}
redPockets.set("demo_123", demoRedPocket)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<GetRedPocketResponse | { error: string }>> {
  const { id } = await params

  const redPocket = redPockets.get(id)

  if (!redPocket) {
    return NextResponse.json({ error: "Red pocket not found" }, { status: 404 })
  }

  // Check expiration
  if (new Date(redPocket.expiresAt) < new Date()) {
    redPocket.status = "expired"
  }

  // Check if depleted
  if (redPocket.claimedCount >= redPocket.totalCount || redPocket.remainingAmount <= 0) {
    redPocket.status = "depleted"
  }

  // In production, check user's claim status from database
  const platformId = request.nextUrl.searchParams.get("platformId")
  const hasClaimed = false // Check database

  return NextResponse.json({
    redPocket,
    isEligible: redPocket.status === "active" && !hasClaimed,
    hasClaimed,
  })
}
