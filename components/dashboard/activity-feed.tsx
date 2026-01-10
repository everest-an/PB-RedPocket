"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { PlatformIcon } from "@/components/ui/platform-icon"

interface Activity {
  id: string
  type: "claim" | "create" | "complete"
  user: string
  platform: "telegram" | "discord" | "whatsapp" | "github"
  amount?: number
  campaign?: string
  time: string
}

const mockActivities: Activity[] = [
  { id: "1", type: "claim", user: "@alice_dev", platform: "github", amount: 5.5, time: "2 min ago" },
  { id: "2", type: "claim", user: "TelegramUser#123", platform: "telegram", amount: 2.3, time: "5 min ago" },
  { id: "3", type: "create", user: "Admin", platform: "discord", campaign: "Weekly Giveaway", time: "12 min ago" },
  { id: "4", type: "claim", user: "Discord#8821", platform: "discord", amount: 10, time: "15 min ago" },
  { id: "5", type: "complete", user: "System", platform: "whatsapp", campaign: "Beta Launch", time: "1 hour ago" },
  { id: "6", type: "claim", user: "+1***456", platform: "whatsapp", amount: 3.2, time: "2 hours ago" },
]

export function ActivityFeed() {
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
        {mockActivities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <PlatformIcon platform={activity.platform} className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">{getActivityMessage(activity)}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
