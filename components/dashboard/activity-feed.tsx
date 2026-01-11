"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

interface Activity {
  id: string
  type: "claim" | "create" | "complete"
  user: string
  platform: "telegram" | "discord" | "whatsapp" | "github"
  amount?: number
  campaign?: string
  time: string
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Fetch recent claims and convert to activities
        const response = await apiClient.getClaims({ page: 1, limit: 10 }) as { 
          claims: Array<{
            id: string
            claimerPlatformId: string
            claimerPlatform: "telegram" | "discord" | "whatsapp" | "github"
            amount: number
            createdAt: string
          }>
        }
        
        const claimActivities: Activity[] = (response.claims || []).map(claim => ({
          id: claim.id,
          type: "claim" as const,
          user: claim.claimerPlatformId,
          platform: claim.claimerPlatform,
          amount: claim.amount,
          time: formatTimeAgo(new Date(claim.createdAt)),
        }))
        
        setActivities(claimActivities)
      } catch (error) {
        console.error("Failed to fetch activities:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds} sec ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  const getActivityMessage = (activity: Activity) => {
    switch (activity.type) {
      case "claim":
        return (
          <>
            <span className="text-foreground font-medium">{activity.user}</span>
            <span className="text-muted-foreground"> claimed </span>
            <span className="text-green-400 font-medium">${activity.amount} USDC</span>
          </>
        )
      case "create":
        return (
          <>
            <span className="text-foreground font-medium">{activity.user}</span>
            <span className="text-muted-foreground"> created campaign </span>
            <span className="text-orange-400 font-medium">{activity.campaign}</span>
          </>
        )
      case "complete":
        return (
          <>
            <span className="text-muted-foreground">Campaign </span>
            <span className="text-purple-400 font-medium">{activity.campaign}</span>
            <span className="text-muted-foreground"> completed</span>
          </>
        )
    }
  }

  return (
    <GlassCard className="h-full">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-foreground">Live Activity</h3>
      </div>
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/5">
                <PlatformIcon platform={activity.platform} className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{getActivityMessage(activity)}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}
