"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { CoinAnimation } from "./coin-animation"
import { cn } from "@/lib/utils"

type ColorTheme = "fire" | "ocean"

interface RedPocketCardProps {
  id: string
  senderName: string
  senderAvatar?: string
  amount: number
  token: string
  platform: "telegram" | "discord" | "whatsapp" | "github"
  message?: string
  tag?: string
  totalCount?: number
  claimedCount?: number
  isLuckyDraw?: boolean
  colorTheme?: ColorTheme
  onClaim?: (claimedAmount: number, walletAddress: string) => void
}

export function RedPocketCard({
  id,
  senderName,
  senderAvatar,
  amount,
  token,
  platform,
  message,
  tag,
  totalCount,
  claimedCount,
  isLuckyDraw = false,
  colorTheme = "fire",
  onClaim,
}: RedPocketCardProps) {
  const [state, setState] = useState<"idle" | "loading" | "creating-wallet" | "claiming" | "success">("idle")
  const [claimedAmount, setClaimedAmount] = useState(0)
  const [walletAddress, setWalletAddress] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)

  const themeColors = {
    fire: {
      gradient: "from-orange-500 via-pink-500 to-purple-500",
      gradientText: "from-yellow-300 via-orange-400 to-pink-400",
      glow: "orange",
      envelope: "from-red-500 via-red-600 to-red-700",
      envelopeFlap: "from-red-600 to-red-700",
      seal: "from-yellow-300 via-yellow-400 to-amber-500",
      sealText: "text-red-700",
      tagBg: "from-orange-500/20 to-pink-500/20",
      tagBorder: "border-orange-500/30",
      tagText: "text-orange-300",
      progressBar: "from-orange-500 to-pink-500",
      confetti: ["#f97316", "#ec4899", "#a855f7", "#facc15", "#22c55e"],
    },
    ocean: {
      gradient: "from-cyan-500 via-blue-500 to-purple-500",
      gradientText: "from-cyan-300 via-blue-400 to-purple-400",
      glow: "blue",
      envelope: "from-blue-500 via-blue-600 to-indigo-700",
      envelopeFlap: "from-blue-600 to-indigo-700",
      seal: "from-cyan-300 via-teal-400 to-blue-500",
      sealText: "text-blue-900",
      tagBg: "from-cyan-500/20 to-blue-500/20",
      tagBorder: "border-cyan-500/30",
      tagText: "text-cyan-300",
      progressBar: "from-cyan-500 to-blue-500",
      confetti: ["#06b6d4", "#3b82f6", "#8b5cf6", "#22d3ee", "#10b981"],
    },
  }

  const colors = themeColors[colorTheme]

  const handleClaim = async () => {
    setState("loading")

    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      setState("creating-wallet")

      await new Promise((resolve) => setTimeout(resolve, 800))
      setState("claiming")

      const response = await fetch("/api/redpocket/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redPocketId: id,
          platformId: `user_${Date.now()}`,
          platform,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setClaimedAmount(data.claimedAmount)
        setWalletAddress(data.walletAddress)
        setState("success")
        setShowConfetti(true)
        onClaim?.(data.claimedAmount, data.walletAddress)
        setTimeout(() => setShowConfetti(false), 3000)
      } else {
        // Show error state instead of fake data
        setState("idle")
        alert(data.error || "Failed to claim. Please try again.")
      }
    } catch (error) {
      console.error("Claim error:", error)
      setState("idle")
      alert("Network error. Please try again.")
    }
  }

  const getLoadingText = () => {
    switch (state) {
      case "loading":
        return "Connecting..."
      case "creating-wallet":
        return "Creating wallet..."
      case "claiming":
        return "Claiming reward..."
      default:
        return isLuckyDraw ? "Try Your Luck" : "Claim Reward"
    }
  }

  const isLoading = state === "loading" || state === "creating-wallet" || state === "claiming"
  const isOpened = state === "success"

  return (
    <div className="w-full max-w-sm mx-auto relative">
      {showConfetti && <ConfettiEffect colors={colors.confetti} />}

      <GlassCard
        glow={isOpened ? (colors.glow as "orange" | "blue") : "none"}
        className={cn(
          "relative overflow-hidden transition-all duration-700",
          isOpened && `bg-gradient-to-br ${colors.tagBg}`,
        )}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient} animate-gradient-flow`}
        />

        {/* Glowing orbs */}
        <div
          className={cn(
            "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl animate-pulse-glow pointer-events-none",
            colorTheme === "fire" ? "bg-orange-500/20" : "bg-cyan-500/20",
          )}
        />
        <div
          className={cn(
            "absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl animate-pulse-glow pointer-events-none",
            colorTheme === "fire" ? "bg-pink-500/20" : "bg-blue-500/20",
          )}
          style={{ animationDelay: "1s" }}
        />

        {/* Platform badge */}
        <div className="absolute top-4 right-4">
          <div className="glass rounded-full p-2.5 backdrop-blur-xl">
            <PlatformIcon platform={platform} className="w-5 h-5" />
          </div>
        </div>

        {!isOpened ? (
          <div className="flex flex-col items-center py-8 px-2">
            {/* Envelope Animation */}
            <div className="relative mb-6 group">
              <div className="relative animate-float">
                <div
                  className={`w-28 h-24 bg-gradient-to-br ${colors.envelope} rounded-xl shadow-2xl flex items-center justify-center overflow-hidden`}
                >
                  <div
                    className={`absolute w-12 h-12 bg-gradient-to-br ${colors.seal} rounded-full flex items-center justify-center shadow-lg`}
                  >
                    <span className={`${colors.sealText} font-bold text-lg`}>$</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
                <div
                  className={`absolute -top-1 left-1/2 -translate-x-1/2 w-28 h-14 bg-gradient-to-b ${colors.envelopeFlap} rounded-t-xl origin-bottom transition-transform group-hover:rotate-[-10deg]`}
                  style={{ clipPath: "polygon(0 100%, 50% 20%, 100% 100%)" }}
                />
              </div>
              <div className={`absolute inset-0 bg-gradient-to-r ${colors.tagBg} blur-2xl animate-pulse-glow -z-10`} />
            </div>

            {/* Sender info */}
            <div className="flex items-center gap-2 mb-2">
              {senderAvatar && (
                <img
                  src={senderAvatar || "/placeholder.svg"}
                  alt={senderName}
                  className={cn(
                    "w-6 h-6 rounded-full ring-2",
                    colorTheme === "fire" ? "ring-orange-500/50" : "ring-cyan-500/50",
                  )}
                />
              )}
              <h3 className="text-lg font-semibold text-foreground">{senderName}</h3>
            </div>

            {message && (
              <p className="text-muted-foreground text-center text-sm mb-4 px-4 leading-relaxed">{message}</p>
            )}

            {tag && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${colors.tagBg} ${colors.tagText} border ${colors.tagBorder} mb-4`}
              >
                #{tag}
              </span>
            )}

            {/* Amount display */}
            <div className="text-center mb-6">
              <p
                className={`text-3xl font-bold bg-gradient-to-r ${colors.gradientText} bg-clip-text text-transparent drop-shadow-lg`}
              >
                {isLuckyDraw ? "Lucky Draw" : `${amount} ${token}`}
              </p>
              {totalCount && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="h-1.5 w-24 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors.progressBar} rounded-full transition-all duration-500`}
                      style={{ width: `${((claimedCount || 0) / totalCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {claimedCount || 0}/{totalCount}
                  </span>
                </div>
              )}
            </div>

            {/* Claim button */}
            <GradientButton
              size="lg"
              onClick={handleClaim}
              loading={isLoading}
              className="w-full"
              variant={colorTheme === "fire" ? "primary" : "secondary"}
            >
              {getLoadingText()}
            </GradientButton>

            {isLoading && state === "creating-wallet" && (
              <p className="text-xs text-muted-foreground mt-3 animate-pulse">
                No wallet? We are creating one for you...
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 px-2">
            <CoinAnimation isOpen={isOpened} amount={claimedAmount} token={token} colorTheme={colorTheme} />

            {/* Wallet info */}
            <div className="mt-6 w-full bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
              <p className="text-xs text-muted-foreground mb-1">Your AA Wallet</p>
              <p className="text-sm font-mono text-foreground truncate">{walletAddress}</p>
            </div>

            <div className="mt-6 w-full space-y-3">
              <GradientButton
                variant={colorTheme === "fire" ? "primary" : "secondary"}
                className="w-full"
                onClick={() => window.open("https://protocolbanks.com", "_blank")}
              >
                Withdraw at protocolbanks.com
              </GradientButton>
              <p className="text-xs text-center text-muted-foreground">Gas-free AA wallet | Withdraw anytime</p>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

function ConfettiEffect({ colors }: { colors: string[] }) {
  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 8,
  }))

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${c.left}%`,
            width: c.size,
            height: c.size,
            backgroundColor: c.color,
            animation: `confetti-fall ${c.duration}s ease-out ${c.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}
