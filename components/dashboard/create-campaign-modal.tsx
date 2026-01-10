"use client"

import type React from "react"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateCampaignModal({ isOpen, onClose }: CreateCampaignModalProps) {
  const [platform, setPlatform] = useState<"telegram" | "discord" | "whatsapp" | "github">("telegram")
  const [isLucky, setIsLucky] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Create Campaign</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campaign Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Campaign Name</label>
            <input
              type="text"
              placeholder="e.g., Community Airdrop"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Platform</label>
            <div className="grid grid-cols-4 gap-2">
              {(["telegram", "discord", "whatsapp", "github"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                    platform === p
                      ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                      : "bg-white/5 border-white/10 hover:border-white/20",
                  )}
                >
                  <PlatformIcon platform={p} className="w-6 h-6" />
                  <span className="text-xs capitalize text-foreground">{p}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Total Budget</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  placeholder="1000"
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Token</label>
              <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50">
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="ETH">ETH</option>
              </select>
            </div>
          </div>

          {/* Red Pocket Count */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Number of Red Pockets</label>
            <input
              type="number"
              placeholder="100"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Distribution Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Distribution Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsLucky(false)}
                className={cn(
                  "p-4 rounded-xl border text-center transition-all",
                  !isLucky
                    ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                    : "bg-white/5 border-white/10 hover:border-white/20",
                )}
              >
                <p className="font-medium text-foreground">Fixed Amount</p>
                <p className="text-xs text-muted-foreground mt-1">Equal distribution</p>
              </button>
              <button
                type="button"
                onClick={() => setIsLucky(true)}
                className={cn(
                  "p-4 rounded-xl border text-center transition-all",
                  isLucky
                    ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                    : "bg-white/5 border-white/10 hover:border-white/20",
                )}
              >
                <p className="font-medium text-foreground">Lucky Draw</p>
                <p className="text-xs text-muted-foreground mt-1">Random amounts</p>
              </button>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Message (Optional)</label>
            <textarea
              rows={3}
              placeholder="Welcome to our community..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50 resize-none"
            />
          </div>

          {/* Submit */}
          <GradientButton type="submit" className="w-full" loading={loading}>
            Create Campaign
          </GradientButton>
        </form>
      </GlassCard>
    </div>
  )
}
