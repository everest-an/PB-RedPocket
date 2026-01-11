"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { useAccount, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatUnits } from 'viem'
import { base } from 'wagmi/chains'
import { TOKEN_ADDRESSES } from '@/lib/web3-config'
import {
  Wallet,
  Plus,
  Copy,
  ExternalLink,
  Shield,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"

export default function WalletPage() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [copied, setCopied] = useState(false)

  const { data: usdcBalance, refetch: refetchUsdc } = useBalance({
    address: address,
    token: TOKEN_ADDRESSES.USDC[base.id] as `0x${string}`,
  })
  
  const { data: usdtBalance, refetch: refetchUsdt } = useBalance({
    address: address,
    token: TOKEN_ADDRESSES.USDT[base.id] as `0x${string}`,
  })

  const { data: ethBalance } = useBalance({
    address: address,
  })

  const tokens = [
    { 
      symbol: "USDC", 
      name: "USD Coin", 
      balance: usdcBalance ? parseFloat(formatUnits(usdcBalance.value, 6)) : 0,
    },
    { 
      symbol: "USDT", 
      name: "Tether", 
      balance: usdtBalance ? parseFloat(formatUnits(usdtBalance.value, 6)) : 0,
    },
    { 
      symbol: "ETH", 
      name: "Ethereum", 
      balance: ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)) : 0,
    },
  ]

  const totalBalance = tokens.reduce((a, t) => {
    if (t.symbol === 'ETH') return a + t.balance * 3500
    return a + t.balance
  }, 0)

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isConnected) {
    return (
      <div className="p-6 lg:p-8">
        <GlassCard className="p-8 text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-orange-400" />
          <h2 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-6">Connect your wallet to view balances and manage funds</p>
          <GradientButton onClick={() => openConnectModal?.()}>
            Connect Wallet
          </GradientButton>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground">Manage your funds for red pocket campaigns</p>
        </div>
      </div>

      <GlassCard className="p-6 relative overflow-hidden" glow="orange">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <p className="text-4xl font-bold text-foreground">${totalBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">Connected</span>
                </div>
                <span className="text-xs text-muted-foreground">Base Network</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30">
              <Wallet className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-muted-foreground mb-2">Your Wallet Address</p>
            <div className="flex items-center gap-3">
              <code className="text-sm text-foreground font-mono flex-1 truncate">{address}</code>
              <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
              <a href={`https://basescan.org/address/${address}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Token Balances</h3>
          <button onClick={() => { refetchUsdc(); refetchUsdt(); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-3">
          {tokens.map((token) => (
            <div key={token.symbol} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-800 flex items-center justify-center text-lg font-bold text-foreground">
                  {token.symbol[0]}
                </div>
                <div>
                  <p className="font-medium text-foreground">{token.name}</p>
                  <p className="text-sm text-muted-foreground">{token.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-foreground">{token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}</p>
                <p className="text-sm text-muted-foreground">${(token.symbol === 'ETH' ? token.balance * 3500 : token.balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">How to Create Red Pockets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold mb-3">1</div>
            <p className="font-medium text-foreground">Have USDC/USDT</p>
            <p className="text-sm text-muted-foreground mt-1">Ensure you have tokens in your wallet on Base network</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold mb-3">2</div>
            <p className="font-medium text-foreground">Create Campaign</p>
            <p className="text-sm text-muted-foreground mt-1">Go to Campaigns and click Create Red Pocket</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold mb-3">3</div>
            <p className="font-medium text-foreground">Share Link</p>
            <p className="text-sm text-muted-foreground mt-1">Copy the link and share in your community</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
