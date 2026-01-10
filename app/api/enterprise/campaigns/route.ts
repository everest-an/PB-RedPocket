import { type NextRequest, NextResponse } from "next/server"
import type { Campaign, RedPocket, ClaimRecord } from "@/lib/types"

// In-memory stores for demo
const campaigns = new Map<string, Campaign>()
const redPockets = new Map<string, RedPocket>()
const claims = new Map<string, ClaimRecord[]>()

// Initialize demo data
const demoCampaign: Campaign = {
  id: "campaign_1",
  enterpriseId: "enterprise_1",
  name: "Community Welcome",
  description: "Welcome rewards for new community members",
  totalBudget: 5000,
  spentBudget: 2100,
  token: "USDC",
  tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  chainId: 8453,
  platform: "telegram",
  totalRedPockets: 42,
  totalClaims: 423,
  tag: "Marketing",
  status: "active",
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
}
campaigns.set("campaign_1", demoCampaign)

export async function GET(request: NextRequest): Promise<NextResponse> {
  const enterpriseId = request.nextUrl.searchParams.get("enterpriseId") || "enterprise_1"

  // Get campaigns for enterprise
  const enterpriseCampaigns = Array.from(campaigns.values()).filter((c) => c.enterpriseId === enterpriseId)

  return NextResponse.json({
    success: true,
    campaigns: enterpriseCampaigns,
    total: enterpriseCampaigns.length,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    const id = `campaign_${Date.now()}`
    const campaign: Campaign = {
      id,
      enterpriseId: body.enterpriseId || "enterprise_1",
      name: body.name,
      description: body.description,
      totalBudget: body.totalBudget,
      spentBudget: 0,
      token: body.token,
      tokenAddress: body.tokenAddress,
      chainId: body.chainId || 8453,
      platform: body.platform,
      totalRedPockets: 0,
      totalClaims: 0,
      tag: body.tag,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    campaigns.set(id, campaign)

    return NextResponse.json({
      success: true,
      campaign,
    })
  } catch (error) {
    console.error("Campaign create error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
