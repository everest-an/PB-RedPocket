"use client"

import { useState } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { CampaignTable } from "@/components/dashboard/campaign-table"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DistributionChart } from "@/components/dashboard/distribution-chart"
import { CreateCampaignModal } from "@/components/dashboard/create-campaign-modal"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { Plus, Gift, Zap, Users, ArrowRight } from "lucide-react"
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

export default function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  const handleCreateClick = () => {
    if (!isConnected) {
      openConnectModal?.()
    } else {
      setShowCreateModal(true)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Manage your RedPocket campaigns</p>
        </div>
        <GradientButton onClick={handleCreateClick} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Red Pocket
        </GradientButton>
      </div>

      {/* Quick Start Card - Show when no campaigns */}
      {!isConnected && (
        <GlassCard className="p-6 relative overflow-hidden" glow="orange">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Get Started</h2>
                <p className="text-muted-foreground">Connect wallet to create your first red pocket</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">1. Connect Wallet</p>
                  <p className="text-xs text-muted-foreground">Link your wallet with USDC</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                <div className="p-2 rounded-lg bg-pink-500/20">
                  <Gift className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">2. Create Red Pocket</p>
                  <p className="text-xs text-muted-foreground">Set amount & recipients</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">3. Share Link</p>
                  <p className="text-xs text-muted-foreground">Post in your community</p>
                </div>
              </div>
            </div>

            <GradientButton onClick={() => openConnectModal?.()} className="flex items-center gap-2">
              Connect Wallet to Start
              <ArrowRight className="w-4 h-4" />
            </GradientButton>
          </div>
        </GlassCard>
      )}

      {/* Stats */}
      <StatsCards />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CampaignTable />
        </div>
        <div className="space-y-6">
          <DistributionChart />
          <ActivityFeed />
        </div>
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
