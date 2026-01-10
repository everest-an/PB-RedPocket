"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type ColorTheme = "fire" | "ocean"

interface CoinAnimationProps {
  isOpen: boolean
  amount: number
  token: string
  colorTheme?: ColorTheme
}

export function CoinAnimation({ isOpen, amount, token, colorTheme = "fire" }: CoinAnimationProps) {
  const [showCoins, setShowCoins] = useState(false)
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([])

  const themeConfig = {
    fire: {
      coin: "from-yellow-400 via-yellow-500 to-orange-500",
      coinShadow: "shadow-[0_0_40px_rgba(255,200,0,0.5)]",
      coinText: "text-yellow-900",
      amountGradient: "from-yellow-400 via-orange-400 to-pink-400",
      confettiColors: ["#FF7850", "#FF5096", "#FFD700", "#FF6B6B", "#FFA500"],
    },
    ocean: {
      coin: "from-cyan-400 via-blue-500 to-indigo-500",
      coinShadow: "shadow-[0_0_40px_rgba(100,200,255,0.5)]",
      coinText: "text-blue-900",
      amountGradient: "from-cyan-400 via-blue-400 to-purple-400",
      confettiColors: ["#06B6D4", "#3B82F6", "#8B5CF6", "#22D3EE", "#10B981"],
    },
  }

  const colors = themeConfig[colorTheme]

  useEffect(() => {
    if (isOpen) {
      setShowCoins(true)
      const newConfetti = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: colors.confettiColors[Math.floor(Math.random() * colors.confettiColors.length)],
      }))
      setConfetti(newConfetti)
    }
  }, [isOpen, colors.confettiColors])

  if (!isOpen) return null

  return (
    <div className="relative">
      {confetti.map((c) => (
        <div
          key={c.id}
          className="absolute w-2 h-2 rounded-full pointer-events-none"
          style={{
            left: `${c.left}%`,
            top: "-20px",
            backgroundColor: c.color,
            animation: `confetti-fall 2s ease-out ${c.delay}s forwards`,
          }}
        />
      ))}

      <div
        className={cn(
          "flex flex-col items-center gap-2 transition-all duration-500",
          showCoins ? "opacity-100 scale-100" : "opacity-0 scale-50",
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "w-20 h-20 rounded-full bg-gradient-to-br flex items-center justify-center",
              colors.coin,
              colors.coinShadow,
              showCoins && "animate-coin-spin",
            )}
            style={{ perspective: "1000px" }}
          >
            <span className={cn("text-2xl font-bold", colors.coinText)}>$</span>
          </div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
        </div>

        <div className="text-center mt-4">
          <p className={cn("text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent", colors.amountGradient)}>
            +{amount} {token}
          </p>
          <p className="text-muted-foreground text-sm mt-1">Successfully claimed!</p>
        </div>
      </div>
    </div>
  )
}
