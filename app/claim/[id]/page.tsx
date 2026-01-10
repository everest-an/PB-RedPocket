import { RedPocketCard } from "@/components/redpocket/red-pocket-card"
import Image from "next/image"

// Mock data - in production fetched from API
async function getRedPocket(id: string) {
  // In production: fetch from database
  return {
    id,
    senderName: "Protocol Banks",
    senderAvatar: "/images/logo-20core.png",
    amount: 50,
    token: "USDC",
    platform: "telegram" as const,
    message: "Thank you for joining our community! Here is your welcome reward.",
    tag: "Marketing",
    totalCount: 100,
    claimedCount: 42,
    isLuckyDraw: false,
  }
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const redPocket = await getRedPocket(id)

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
