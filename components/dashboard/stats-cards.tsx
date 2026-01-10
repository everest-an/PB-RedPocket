"use client"

import type React from "react"

import { GlassCard } from "@/components/ui/glass-card"
import { TrendingUp, TrendingDown, Gift, Users, Wallet, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string
  change: number
  icon: React.ElementType
  iconColor: string
}

function StatCard({ title, value, change, icon: Icon, iconColor }: StatCardProps) {
  const isPositive = change >= 0

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
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
        </div>
        <div className={cn("p-3 rounded-xl", iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </GlassCard>
  )
}

export function StatsCards() {
  const stats = [
    {
      title: "Total Campaigns",
      value: "24",
      change: 12,
      icon: Gift,
      iconColor: "bg-gradient-to-br from-orange-500 to-pink-500",
    },
    {
      title: "Total Claims",
      value: "1,847",
      change: 23,
      icon: Users,
      iconColor: "bg-gradient-to-br from-cyan-500 to-blue-500",
    },
    {
      title: "Total Distributed",
      value: "$12,450",
      change: 8,
      icon: Wallet,
      iconColor: "bg-gradient-to-br from-green-500 to-emerald-500",
    },
    {
      title: "Active Now",
      value: "142",
      change: -5,
      icon: Activity,
      iconColor: "bg-gradient-to-br from-purple-500 to-pink-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  )
}
