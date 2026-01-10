import { type NextRequest, NextResponse } from "next/server"
import type { CreateRedPocketRequest, RedPocket } from "@/lib/types"

// In-memory store for demo
const redPockets = new Map<string, RedPocket>()

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CreateRedPocketRequest = await request.json()

    // Validate required fields
    if (!body.campaignId || !body.amount || !body.token || !body.totalCount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate unique ID
    const id = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Create red pocket
    const redPocket: RedPocket = {
      id,
      campaignId: body.campaignId,
      senderName: "Enterprise", // In production, get from session
      amount: body.amount,
      remainingAmount: body.amount,
      token: body.token,
      tokenAddress: body.tokenAddress,
      chainId: body.chainId,
      platform: body.platform,
      platformChannelId: body.platformChannelId,
      message: body.message,
      tag: body.tag,
      totalCount: body.totalCount,
      claimedCount: 0,
      isLuckyDraw: body.isLuckyDraw,
      minAmount: body.minAmount,
      maxAmount: body.maxAmount,
      expiresAt: new Date(Date.now() + (body.expiresIn || 7 * 24 * 60 * 60) * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      status: "active",
    }

    redPockets.set(id, redPocket)

    // Generate claim link based on platform
    const claimLinks = {
      telegram: `https://t.me/ProtocolBankBot?start=${id}`,
      discord: `https://discord.com/channels/@me?redpocket=${id}`,
      whatsapp: `https://wa.me/?text=Claim%20your%20reward%3A%20https%3A%2F%2Fprotocolbanks.com%2Fclaim%2F${id}`,
      github: `https://protocolbanks.com/claim/${id}`,
    }

    return NextResponse.json({
      success: true,
      redPocket,
      claimLink: claimLinks[body.platform],
      embedLink: `https://protocolbanks.com/claim/${id}`,
    })
  } catch (error) {
    console.error("Create error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
