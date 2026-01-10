import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  glow?: "orange" | "pink" | "blue" | "green" | "none"
}

export function GlassCard({ children, className, glow = "none" }: GlassCardProps) {
  const glowColors = {
    orange: "shadow-[0_0_60px_rgba(255,120,80,0.3)]",
    pink: "shadow-[0_0_60px_rgba(255,80,150,0.3)]",
    blue: "shadow-[0_0_60px_rgba(80,150,255,0.3)]",
    green: "shadow-[0_0_60px_rgba(80,255,180,0.3)]",
    none: "",
  }

  return (
    <div className={cn("glass rounded-3xl p-6 transition-all duration-300", glowColors[glow], className)}>
      {children}
    </div>
  )
}
