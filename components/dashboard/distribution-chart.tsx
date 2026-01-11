"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { apiClient } from "@/lib/api-client"
import { Loader2 } from "lucide-react"

interface PlatformData {
  platform: "telegram" | "discord" | "github" | "whatsapp"
  claims: number
  percentage: number
  color: string
}

const platformColors: Record<string, string> = {
  telegram: "from-blue-400 to-blue-600",
  discord: "from-indigo-400 to-purple-600",
  github: "from-gray-400 to-gray-600",
  whatsapp: "from-green-400 to-green-600",
}

export function DistributionChart() {
  const [platformData, setPlatformData] = useState<PlatformData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.getClaims({ page: 1, limit: 100 }) as { 
          claims: Array<{ claimerPlatform: string }> 
        }
        
        const claims = response.claims || []
        const platformCounts: Record<string, number> = {
          telegram: 0,
          discord: 0,
          github: 0,
          whatsapp: 0,
        }
        
        claims.forEach(claim => {
          if (platformCounts[claim.claimerPlatform] !== undefined) {
            platformCounts[claim.claimerPlatform]++
          }
        })
        
        const total = Object.values(platformCounts).reduce((a, b) => a + b, 0)
        
        const data: PlatformData[] = Object.entries(platformCounts).map(([platform, count]) => ({
          platform: platform as PlatformData['platform'],
          claims: count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
          color: platformColors[platform] || "from-gray-400 to-gray-600",
        }))
        
        // Sort by claims descending
        data.sort((a, b) => b.claims - a.claims)
        
        setPlatformData(data)
      } catch (error) {
        console.error("Failed to fetch platform data:", error)
        // Set default empty data
        setPlatformData([
          { platform: "telegram", claims: 0, percentage: 0, color: platformColors.telegram },
          { platform: "discord", claims: 0, percentage: 0, color: platformColors.discord },
          { platform: "github", claims: 0, percentage: 0, color: platformColors.github },
          { platform: "whatsapp", claims: 0, percentage: 0, color: platformColors.whatsapp },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <GlassCard>
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-semibold text-foreground">Platform Distribution</h3>
      </div>
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : platformData.every(p => p.claims === 0) ? (
          <p className="text-center text-muted-foreground py-4">No claims yet</p>
        ) : (
          platformData.map((item) => (
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
          ))
        )}
      </div>
    </GlassCard>
  )
}
