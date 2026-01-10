"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { PlatformIcon } from "@/components/ui/platform-icon"

const platformData = [
  { platform: "telegram" as const, claims: 845, percentage: 45, color: "from-blue-400 to-blue-600" },
  { platform: "discord" as const, claims: 562, percentage: 30, color: "from-indigo-400 to-purple-600" },
  { platform: "github" as const, claims: 280, percentage: 15, color: "from-gray-400 to-gray-600" },
  { platform: "whatsapp" as const, claims: 160, percentage: 10, color: "from-green-400 to-green-600" },
]

export function DistributionChart() {
  return (
    <GlassCard>
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-foreground">Platform Distribution</h3>
      </div>
      <div className="p-4 space-y-4">
        {platformData.map((item) => (
          <div key={item.platform} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={item.platform} className="w-5 h-5" />
                <span className="text-sm capitalize text-foreground">{item.platform}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-foreground">{item.claims}</span>
                <span className="text-xs text-muted-foreground ml-1">({item.percentage}%)</span>
              </div>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
