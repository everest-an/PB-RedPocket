import { RedPocketCard } from "@/components/redpocket/red-pocket-card"
import { API_CONFIG, BACKEND_ENDPOINTS } from "@/app/api/config"
import Image from "next/image"
import { notFound } from "next/navigation"

interface RedPocketData {
  id: string
  senderName: string
  senderAvatar?: string
  amount: number
  token: string
  platform: "telegram" | "discord" | "whatsapp" | "github"
  message?: string
  tag?: string
  totalCount: number
  claimedCount: number
  isLuckyDraw: boolean
}

async function getRedPocket(id: string): Promise<RedPocketData | null> {
  try {
    const response = await fetch(
      `${API_CONFIG.baseURL}${BACKEND_ENDPOINTS.getRedPocket(id)}`,
      {
        method: "GET",
        headers: API_CONFIG.headers,
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (!data.success || !data.redPocket) {
      return null
    }

    const rp = data.redPocket
    // Calculate amount per pocket for display
    const amountPerPocket = rp.isLuckyDraw 
      ? rp.amount / rp.totalCount  // Average for lucky draw
      : rp.amount / rp.totalCount  // Fixed amount
      
    return {
      id: rp.id,
      senderName: rp.senderName || "Anonymous",
      senderAvatar: rp.senderAvatar || "/images/logo-20core.png",
      amount: amountPerPocket,
      token: rp.token || "USDC",
      platform: rp.platform || "telegram",
      message: rp.message,
      tag: rp.tag,
      totalCount: rp.totalCount || 0,
      claimedCount: rp.claimedCount || 0,
      isLuckyDraw: rp.isLuckyDraw || false,
    }
  } catch (error) {
    console.error("Failed to fetch red pocket:", error)
    return null
  }
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const redPocket = await getRedPocket(id)

  if (!redPocket) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Image src="/images/logo-20core.png" alt="Protocol Banks" width={28} height={28} className="rounded-md" />
            <Image
              src="/images/logo-20mark-20text-20white.png"
              alt="Protocol Banks"
              width={140}
              height={24}
              className="h-6 w-auto"
            />
          </div>
          <p className="text-neutral-600 text-xs mt-1">Web3 Rewards Made Simple</p>
        </div>

        {/* Red Pocket Card */}
        <RedPocketCard {...redPocket} />

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-neutral-700">Powered by Account Abstraction | Gas-free</p>
        </div>
      </div>
    </main>
  )
}
