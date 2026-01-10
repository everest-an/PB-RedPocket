"use client"

import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes, ReactNode } from "react"

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary" | "outline"
  size?: "sm" | "md" | "lg"
  loading?: boolean
}

export function GradientButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className,
  disabled,
  ...props
}: GradientButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white hover:shadow-[0_0_30px_rgba(255,100,100,0.5)]",
    secondary:
      "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-white hover:shadow-[0_0_30px_rgba(100,180,255,0.5)]",
    outline: "border border-white/20 text-white hover:bg-white/5",
  }

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  }

  return (
    <button
      className={cn(
        "relative rounded-xl font-medium transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed animate-gradient-flow",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
