"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { MoreHorizontal, Eye, Pause, Trash2, Copy, Loader2 } from "lucide-react"

interface Campaign {
  id: string
  name: string
  platform: "telegram" | "discord" | "whatsapp" | "github"
  totalBudget: number
  spentBudget: number
  totalClaims: number
  status: "active" | "paused" | "completed"
  createdAt: string
}

const statusColors = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
}

export function CampaignTable() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await apiClient.getCampaigns({ page: 1, limit: 5 }) as { campaigns: Campaign[] }
        setCampaigns(response.campaigns || [])
      } catch (error) {
        console.error("Failed to fetch campaigns:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`https://protocolbanks.com/claim/${id}`)
    setOpenMenu(null)
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-foreground">Recent Campaigns</h3>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No campaigns yet. Create your first campaign!
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Campaign</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Platform</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Budget</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Claims</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-foreground">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
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
                    <div>
                      <p className="text-sm text-foreground">${(campaign.spentBudget || 0).toLocaleString()}</p>
                      <div className="w-20 h-1.5 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
                          style={{ width: `${campaign.totalBudget ? ((campaign.spentBudget || 0) / campaign.totalBudget) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">of ${(campaign.totalBudget || 0).toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-foreground">{campaign.totalClaims || 0}</span>
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium border",
                        statusColors[campaign.status] || statusColors.active
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
                      <div className="absolute right-4 top-12 z-10 w-40 glass rounded-xl border border-white/10 py-1 shadow-xl">
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-white/5">
                          <Eye className="w-4 h-4" /> View Details
                        </button>
                        <button 
                          onClick={() => copyLink(campaign.id)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-white/5"
                        >
                          <Copy className="w-4 h-4" /> Copy Link
                        </button>
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-white/5">
                          <Pause className="w-4 h-4" /> Pause
                        </button>
                        <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-white/5">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </GlassCard>
  )
}
