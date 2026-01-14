"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { GitHubLoginButton } from "@/components/ui/github-login-button"
import { CoinAnimation } from "./coin-animation"
import { cn } from "@/lib/utils"

interface PlatformUser {
  id: number | string
  login?: string
  name: string | null
  email?: string | null
  avatar?: string
  platform: string
  platformId: string
}

interface ClaimWithAuthProps {
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
}

export function ClaimWithAuth({
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
}: ClaimWithAuthProps) {
  const [state, setState] = useState<"auth" | "ready" | "loading" | "creating-wallet" | "claiming" | "success" | "error">("auth")
  const [user, setUser] = useState<PlatformUser | null>(null)
  const [claimedAmount, setClaimedAmount] = useState(0)
  const [walletAddress, setWalletAddress] = useState("")
  const [error, setError] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")

  // Check if user is already authenticated
  useEffect(() => {
    checkExistingAuth()
  }, [])

  const checkExistingAuth = async () => {
    // For GitHub, check cookie
    if (platform === "github") {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()
        if (data.authenticated && data.platform === "github") {
          setUser(data.user)
          setState("ready")
          return
        }
      } catch {
        // Not authenticated
      }
    }
    
    // For other platforms, stay in auth state
    setState("auth")
  }

  const handleGitHubLogin = (githubUser: PlatformUser) => {
    setUser(githubUser)
    setState("ready")
  }

  const handleWhatsAppSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number")
      return
    }
    setUser({
      id: phoneNumber,
      name: phoneNumber,
      platform: "whatsapp",
      platformId: `whatsapp_${phoneNumber.replace(/\D/g, "")}`,
    })
    setState("ready")
  }

  const handleClaim = async () => {
    if (!user) {
      setError("Please authenticate first")
      return
    }

    setState("loading")
    setError("")

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
          platformId: user.platformId,
          platform: user.platform,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setClaimedAmount(data.claimedAmount)
        setWalletAddress(data.walletAddress)
        setState("success")
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      } else {
        setError(data.error || "Failed to claim")
        setState("error")
      }
    } catch (err) {
      console.error("Claim error:", err)
      setError("Network error. Please try again.")
      setState("error")
    }
  }

  const renderAuthStep = () => {
    switch (platform) {
      case "github":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Login with GitHub to claim this red pocket
            </p>
            <GitHubLoginButton 
              redPocketId={id} 
              onLogin={handleGitHubLogin}
              className="w-full"
            />
          </div>
        )
      
      case "whatsapp":
        return (
          <form onSubmit={handleWhatsAppSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your phone number to claim
            </p>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 234 567 8900"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-green-500/50"
            />
            <GradientButton type="submit" className="w-full" variant="secondary">
              Continue
            </GradientButton>
          </form>
        )
      
      case "telegram":
      case "discord":
      default:
        // For Telegram/Discord, we can use a simple identifier or skip auth
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Click below to claim your reward
            </p>
            <GradientButton 
              onClick={() => {
                setUser({
                  id: `anon_${Date.now()}`,
                  name: "Anonymous",
                  platform,
                  platformId: `${platform}_anon_${Date.now()}`,
                })
                setState("ready")
              }}
              className="w-full"
            >
              Claim as Guest
            </GradientButton>
          </div>
        )
    }
  }

  const isLoading = state === "loading" || state === "creating-wallet" || state === "claiming"

  return (
    <div className="w-full max-w-sm mx-auto relative">
      {showConfetti && <ConfettiEffect />}

      <GlassCard
        glow={state === "success" ? "orange" : "none"}
        className="relative overflow-hidden transition-all duration-700"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 animate-gradient-flow" />

        {/* Platform badge */}
        <div className="absolute top-4 right-4">
          <div className="glass rounded-full p-2.5 backdrop-blur-xl">
            <PlatformIcon platform={platform} className="w-5 h-5" />
          </div>
        </div>

        <div className="flex flex-col items-center py-8 px-4">
          {/* Sender info */}
          <div className="flex items-center gap-2 mb-2">
            {senderAvatar && (
              <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full ring-2 ring-orange-500/50" />
            )}
            <h3 className="text-lg font-semibold text-foreground">{senderName}</h3>
          </div>

          {message && (
            <p className="text-muted-foreground text-center text-sm mb-4 px-4">{message}</p>
          )}

          {tag && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-orange-300 border border-orange-500/30 mb-4">
              #{tag}
            </span>
          )}

          {/* Amount */}
          <div className="text-center mb-6">
            <p className="text-3xl font-bold bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
              {isLuckyDraw ? "Lucky Draw" : `${amount} ${token}`}
            </p>
            {totalCount && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-1.5 w-24 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                    style={{ width: `${((claimedCount || 0) / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{claimedCount || 0}/{totalCount}</span>
              </div>
            )}
          </div>

          {/* Auth/Claim states */}
          {state === "auth" && renderAuthStep()}

          {state === "ready" && user && (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                {user.avatar && <img src={user.avatar} alt="" className="w-5 h-5 rounded-full" />}
                <span className="text-sm text-green-400">
                  {user.login || user.name || user.platformId}
                </span>
              </div>
              <GradientButton onClick={handleClaim} className="w-full" size="lg">
                {isLuckyDraw ? "Try Your Luck" : "Claim Reward"}
              </GradientButton>
            </div>
          )}

          {isLoading && (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">
                {state === "loading" && "Connecting..."}
                {state === "creating-wallet" && "Creating your wallet..."}
                {state === "claiming" && "Claiming reward..."}
              </p>
            </div>
          )}

          {state === "success" && (
            <div className="w-full">
              <CoinAnimation isOpen={true} amount={claimedAmount} token={token} colorTheme="fire" />
              <div className="mt-6 w-full bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                <p className="text-xs text-muted-foreground mb-1">Your AA Wallet</p>
                <p className="text-sm font-mono text-foreground truncate">{walletAddress}</p>
              </div>
              <GradientButton className="w-full mt-4" onClick={() => window.open("https://protocolbanks.com", "_blank")}>
                Withdraw at protocolbanks.com
              </GradientButton>
            </div>
          )}

          {(state === "error" || error) && (
            <div className="w-full space-y-4">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
              <GradientButton onClick={() => { setState("ready"); setError(""); }} className="w-full">
                Try Again
              </GradientButton>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  )
}

function ConfettiEffect() {
  const colors = ["#f97316", "#ec4899", "#a855f7", "#facc15", "#22c55e"]
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
