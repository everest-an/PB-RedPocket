"use client"

import { useState, useEffect, useCallback } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { CreateCampaignModal } from "@/components/dashboard/create-campaign-modal"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  Trash2,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  Loader2,
  RefreshCw,
} from "lucide-react"

interface Campaign {
  id: string
  name: string
  description: string
  platform: "telegram" | "discord" | "whatsapp" | "github"
  tag: string
  totalBudget: number
  spentBudget: number
  totalClaims: number
  totalRedPockets: number
  status: "active" | "paused" | "completed"
  createdAt: string
}

const tagColors: Record<string, string> = {
  Marketing: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  DevBounty: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Testing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  SecurityFix: "bg-red-500/20 text-red-400 border-red-500/30",
}

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
}

export function CampaignsContent() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getCampaigns({ page: currentPage, limit: pageSize }) as { campaigns: Campaign[], total: number }
      setCampaigns(response.campaigns || [])
    } catch (err) {
      console.error("Failed to fetch campaigns:", err)
      setError("Failed to load campaigns. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterPlatform !== "all" && c.platform !== filterPlatform) return false
    if (filterStatus !== "all" && c.status !== filterStatus) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const totalSpent = campaigns.reduce((a, c) => a + (c.spentBudget || 0), 0)
  const totalClaims = campaigns.reduce((a, c) => a + (c.totalClaims || 0), 0)
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`https://protocolbanks.com/claim/${id}`)
  }

  if (loading && campaigns.length === 0) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground">Manage all your RedPocket campaigns</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCampaigns}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5 text-muted-foreground", loading && "animate-spin")} />
          </button>
          <GradientButton onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Campaign
          </GradientButton>
        </div>
      </div>

      {error && (
        <GlassCard className="p-4 border-red-500/30 bg-red-500/10">
          <p className="text-red-400">{error}</p>
        </GlassCard>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-pink-500/20">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{campaigns.length}</p>
              <p className="text-xs text-muted-foreground">Total Campaigns</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">${totalSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalClaims.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Claims</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeCampaigns}</p>
              <p className="text-xs text-muted-foreground">Active Now</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">All Platforms</option>
              <option value="telegram">Telegram</option>
              <option value="discord">Discord</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="github">GitHub</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Campaigns Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Campaign</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Platform</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tag</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Budget</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Progress</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {campaigns.length === 0 ? "No campaigns yet. Create your first campaign!" : "No campaigns match your filters."}
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{campaign.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={campaign.platform} className="w-5 h-5" />
                        <span className="text-sm capitalize text-foreground">{campaign.platform}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border",
                          tagColors[campaign.tag] || "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
                        )}
                      >
                        {campaign.tag || "General"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-foreground font-medium">
                          ${(campaign.spentBudget || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          of ${(campaign.totalBudget || 0).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-foreground">
                            {campaign.totalClaims || 0}/{campaign.totalRedPockets || 0}
                          </span>
                          <span className="text-muted-foreground">
                            {campaign.totalRedPockets ? Math.round(((campaign.totalClaims || 0) / campaign.totalRedPockets) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full transition-all"
                            style={{ width: `${campaign.totalRedPockets ? ((campaign.totalClaims || 0) / campaign.totalRedPockets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                          statusColors[campaign.status] || statusColors.active,
                        )}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="p-4 text-right relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === campaign.id ? null : campaign.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                      </button>
                      {openMenu === campaign.id && (
                        <div className="absolute right-4 top-12 z-10 w-44 glass rounded-xl border border-white/10 py-1 shadow-xl">
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-white/5">
                            <Eye className="w-4 h-4" /> View Details
                          </button>
                          <button
                            onClick={() => copyLink(campaign.id)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-white/5"
                          >
                            <Copy className="w-4 h-4" /> Copy Share Link
                          </button>
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-white/5">
                            <ExternalLink className="w-4 h-4" /> Open Link
                          </button>
                          {campaign.status === "active" ? (
                            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-white/5">
                              <Pause className="w-4 h-4" /> Pause
                            </button>
                          ) : campaign.status === "paused" ? (
                            <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-400 hover:bg-white/5">
                              <Play className="w-4 h-4" /> Resume
                            </button>
                          ) : null}
                          <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-white/5">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCampaigns.length} of {campaigns.length} campaigns
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-white/10 text-sm text-foreground">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Create Campaign Modal */}
      <CreateCampaignModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
