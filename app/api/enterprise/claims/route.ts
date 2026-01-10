import { type NextRequest, NextResponse } from "next/server"
import type { ClaimRecord } from "@/lib/types"

// Demo claims data
const demoClaims: ClaimRecord[] = [
  {
    id: "claim_1",
    redPocketId: "demo_123",
    claimerId: "user_telegram_12345",
    claimerPlatformId: "12345",
    claimerPlatform: "telegram",
    claimerWalletAddress: "0x1234...5678",
    amount: 50,
    txHash: "0xabc...def",
    status: "success",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3590000).toISOString(),
  },
  {
    id: "claim_2",
    redPocketId: "demo_123",
    claimerId: "user_discord_67890",
    claimerPlatformId: "67890",
    claimerPlatform: "discord",
    claimerWalletAddress: "0x5678...9abc",
    amount: 25.5,
    txHash: "0xdef...123",
    status: "success",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7190000).toISOString(),
  },
]

export async function GET(request: NextRequest): Promise<NextResponse> {
  const campaignId = request.nextUrl.searchParams.get("campaignId")
  const page = Number(request.nextUrl.searchParams.get("page")) || 1
  const limit = Number(request.nextUrl.searchParams.get("limit")) || 20

  // Filter and paginate claims
  const filteredClaims = [...demoClaims]

  const start = (page - 1) * limit
  const paginatedClaims = filteredClaims.slice(start, start + limit)

  return NextResponse.json({
    success: true,
    claims: paginatedClaims,
    total: filteredClaims.length,
    page,
    limit,
    totalPages: Math.ceil(filteredClaims.length / limit),
  })
}
