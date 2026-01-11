"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { TrendingUp, TrendingDown, Gift, Users, Wallet, Activity, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"

interface StatCardProps {
  title: string
  value: string
  change: number
  icon: React.ElementType
  iconColor: string
  loading?: boolean
}

function StatCard({ title, value, change, icon: Icon, iconColor, loading }: StatCardProps) {
  const isPositive = change >= 0

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-orange-500 mt-2" />
          ) : (
            <>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={cn("text-sm", isPositive ? "text-green-400" : "text-red-400")}>
                  {isPositive ? "+" : ""}
                  {change}%
                </span>
                <span className="text-xs text-muted-foreground">vs last week</span>
              </div>
            </>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </GlassCard>
  )
}

interface Analytics {
  totalCampaigns: number
  totalBudget: number
  totalSpent: number
  totalClaims: number
  totalPockets: number
  activeCampaigns: number
}

export function StatsCards() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch campaigns to calculate stats
        const response = await apiClient.getCampaigns({ page: 1, limit: 100 }) as { 
          campaigns: Array<{
            totalBudget: number
            spentBudget: number
            totalClaims: number
            status: string
          }>
        }
        
        const campaigns = response.campaigns || []
        const stats: Analytics = {
          totalCampaigns: campaigns.length,
          totalBudget: campaigns.reduce((a, c) => a + (c.totalBudget || 0), 0),
          totalSpent: campaigns.reduce((a, c) => a + (c.spentBudget || 0), 0),
          totalClaims: campaigns.reduce((a, c) => a + (c.totalClaims || 0), 0),
          totalPockets: 0,
          activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        }
        
        setAnalytics(stats)
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
        // Set default values on error
        setAnalytics({
          totalCampaigns: 0,
          totalBudget: 0,
          totalSpent: 0,
          totalClaims: 0,
          totalPockets: 0,
          activeCampaigns: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const stats = [
    {
      title: "Total Campaigns",
      value: analytics?.totalCampaigns.toString() || "0",
      change: 12,
      icon: Gift,
      iconColor: "bg-gradient-to-br from-orange-500 to-pink-500",
    },
    {
      title: "Total Claims",
      value: analytics?.totalClaims.toLocaleString() || "0",
      change: 23,
      icon: Users,
      iconColor: "bg-gradient-to-br from-cyan-500 to-blue-500",
    },
    {
      title: "Total Distributed",
      value: `$${(analytics?.totalSpent || 0).toLocaleString()}`,
      change: 8,
      icon: Wallet,
      iconColor: "bg-gradient-to-br from-green-500 to-emerald-500",
    },
    {
      title: "Active Campaigns",
      value: analytics?.activeCampaigns.toString() || "0",
      change: 0,
      icon: Activity,
      iconColor: "bg-gradient-to-br from-purple-500 to-pink-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} loading={loading} />
      ))}
    </div>
  )
}
