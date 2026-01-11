'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { GradientButton } from './gradient-button'
import { Wallet, LogOut } from 'lucide-react'

export function ConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  if (isConnected && address) {
    return (
      <button
        onClick={() => open({ view: 'Account' })}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
      >
        <Wallet className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-foreground">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    )
  }

  return (
    <GradientButton onClick={() => open()} className="flex items-center gap-2">
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </GradientButton>
  )
}

export function useWallet() {
  const { address, isConnected } = useAppKitAccount()
  const { open } = useAppKit()

  return {
    address,
    isConnected,
    connect: () => open(),
    disconnect: () => open({ view: 'Account' })
  }
}
