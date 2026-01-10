"use client"

import { useState } from "react"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { CampaignTable } from "@/components/dashboard/campaign-table"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { DistributionChart } from "@/components/dashboard/distribution-chart"
import { CreateCampaignModal } from "@/components/dashboard/create-campaign-modal"
import { GradientButton } from "@/components/ui/gradient-button"
import { Plus } from "lucide-react"

export default function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Manage your RedPocket campaigns</p>
        </div>
        <GradientButton onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create Campaign
        </GradientButton>
      </div>

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
