import { type NextRequest, NextResponse } from "next/server"
import { getOrCreateWallet } from "@/lib/wallet"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const { userId } = await params
  const chainId = Number(request.nextUrl.searchParams.get("chainId")) || 8453

  try {
    const wallet = await getOrCreateWallet(userId, chainId)

    return NextResponse.json({
      success: true,
      wallet,
    })
  } catch (error) {
    console.error("Wallet error:", error)
    return NextResponse.json({ error: "Failed to get/create wallet" }, { status: 500 })
  }
}
