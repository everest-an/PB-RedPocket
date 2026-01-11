'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider, type Config } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, mainnet, polygon } from '@reown/appkit/networks'
import { projectId, metadata } from '@/lib/web3-config'
import { useState, type ReactNode } from 'react'

// Setup wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [base, polygon, mainnet],
  projectId,
  ssr: true
})

// Create AppKit instance
createAppKit({
  adapters: [wagmiAdapter],
  networks: [base, polygon, mainnet],
  defaultNetwork: base,
  projectId,
  metadata,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'x', 'github', 'discord'],
    emailShowWallets: true
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#f97316',
    '--w3m-border-radius-master': '12px'
  }
})

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
