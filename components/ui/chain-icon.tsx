"use client"

import { cn } from "@/lib/utils"

interface ChainIconProps {
  chainId: number
  className?: string
  showBadge?: boolean
}

// SVG icons for each chain
const ChainIcons: Record<number, React.FC<{ className?: string }>> = {
  // Base
  8453: ({ className }) => (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#0052FF"/>
      <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6zm0 15.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" fill="white"/>
    </svg>
  ),
  // Polygon
  137: ({ className }) => (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#8247E5"/>
      <path d="M21.092 13.517l-3.166-1.828a1.875 1.875 0 00-1.875 0l-3.166 1.828a1.875 1.875 0 00-.937 1.625v3.656c0 .67.357 1.29.937 1.625l3.166 1.828a1.875 1.875 0 001.875 0l3.166-1.828a1.875 1.875 0 00.937-1.625v-3.656a1.875 1.875 0 00-.937-1.625z" fill="white"/>
    </svg>
  ),
  // Ethereum
  1: ({ className }) => (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path d="M16 4v8.87l7.5 3.35L16 4z" fill="white" fillOpacity="0.6"/>
      <path d="M16 4L8.5 16.22l7.5-3.35V4z" fill="white"/>
      <path d="M16 21.97v6.03l7.5-10.38L16 21.97z" fill="white" fillOpacity="0.6"/>
      <path d="M16 28v-6.03l-7.5-4.35L16 28z" fill="white"/>
      <path d="M16 20.57l7.5-4.35L16 12.87v7.7z" fill="white" fillOpacity="0.2"/>
      <path d="M8.5 16.22l7.5 4.35v-7.7l-7.5 3.35z" fill="white" fillOpacity="0.6"/>
    </svg>
  ),
  // Moonbeam (Polkadot)
  1284: ({ className }) => (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#53CBC8"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      <circle cx="16" cy="16" r="4" fill="#53CBC8"/>
      <circle cx="16" cy="8" r="2" fill="white"/>
      <circle cx="16" cy="24" r="2" fill="white"/>
      <circle cx="8" cy="16" r="2" fill="white"/>
      <circle cx="24" cy="16" r="2" fill="white"/>
    </svg>
  ),
  // Astar (Polkadot)
  592: ({ className }) => (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#0AE2FF"/>
      <path d="M16 6l2.5 7.5H26l-6 4.5 2.5 7.5-6.5-5-6.5 5 2.5-7.5-6-4.5h7.5L16 6z" fill="white"/>
    </svg>
  ),
  // Acala (Polkadot)
  787: ({ className }) => (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <circle cx="16" cy="16" r="16" fill="#E40C5B"/>
      <path d="M16 8l6 12H10l6-12z" fill="white"/>
      <circle cx="16" cy="20" r="3" fill="white"/>
    </svg>
  ),
}

// Polkadot badge component
const PolkadotBadge = ({ className }: { className?: string }) => (
  <div className={cn("absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center", className)}>
    <svg viewBox="0 0 16 16" className="w-3 h-3" fill="white">
      <circle cx="8" cy="8" r="3"/>
      <circle cx="8" cy="3" r="1.5"/>
      <circle cx="8" cy="13" r="1.5"/>
      <circle cx="3" cy="8" r="1.5"/>
      <circle cx="13" cy="8" r="1.5"/>
    </svg>
  </div>
)

const POLKADOT_CHAIN_IDS = [1284, 592, 787]

export function ChainIcon({ chainId, className, showBadge = true }: ChainIconProps) {
  const IconComponent = ChainIcons[chainId]
  const isPolkadot = POLKADOT_CHAIN_IDS.includes(chainId)
  
  if (!IconComponent) {
    return (
      <div className={cn("w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-white text-xs", className)}>
        ?
      </div>
    )
  }

  return (
    <div className="relative inline-block">
      <IconComponent className={cn("w-6 h-6", className)} />
      {showBadge && isPolkadot && <PolkadotBadge />}
    </div>
  )
}

// Large Polkadot ecosystem icon for prominent display
export function PolkadotEcosystemIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("w-12 h-12", className)} fill="none">
      <defs>
        <linearGradient id="polkadot-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E6007A"/>
          <stop offset="100%" stopColor="#552BBF"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#polkadot-gradient)"/>
      <circle cx="32" cy="32" r="8" fill="white"/>
      <circle cx="32" cy="14" r="5" fill="white"/>
      <circle cx="32" cy="50" r="5" fill="white"/>
      <circle cx="14" cy="32" r="5" fill="white"/>
      <circle cx="50" cy="32" r="5" fill="white"/>
      <circle cx="19" cy="19" r="4" fill="white" fillOpacity="0.7"/>
      <circle cx="45" cy="19" r="4" fill="white" fillOpacity="0.7"/>
      <circle cx="19" cy="45" r="4" fill="white" fillOpacity="0.7"/>
      <circle cx="45" cy="45" r="4" fill="white" fillOpacity="0.7"/>
    </svg>
  )
}
