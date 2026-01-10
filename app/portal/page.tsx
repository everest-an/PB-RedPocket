"use client"

import { useState } from "react"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { cn } from "@/lib/utils"
import Image from "next/image"
import {
  Wallet,
  ArrowUpRight,
  ExternalLink,
  Copy,
  CheckCircle2,
  Clock,
  LogOut,
  ChevronRight,
  Landmark,
  CreditCard,
} from "lucide-react"

interface ClaimHistory {
  id: string
  campaign: string
  platform: "telegram" | "discord" | "whatsapp" | "github"
  amount: number
  token: string
  claimedAt: string
  txHash: string
}

const mockHistory: ClaimHistory[] = [
  {
    id: "1",
    campaign: "Discord Community Airdrop",
    platform: "discord",
    amount: 10,
    token: "USDC",
    claimedAt: "2025-01-09",
    txHash: "0x1234...5678",
  },
  {
    id: "2",
    campaign: "GitHub Bug Bounty",
    platform: "github",
    amount: 50,
    token: "USDC",
    claimedAt: "2025-01-08",
    txHash: "0xabcd...efgh",
  },
  {
    id: "3",
    campaign: "Telegram Marketing",
    platform: "telegram",
    amount: 5,
    token: "USDC",
    claimedAt: "2025-01-07",
    txHash: "0x9876...5432",
  },
  {
    id: "4",
    campaign: "WhatsApp Beta Test",
    platform: "whatsapp",
    amount: 15,
    token: "USDC",
    claimedAt: "2025-01-05",
    txHash: "0xfedc...ba98",
  },
]

const platformStats = [
  { platform: "telegram" as const, claims: 12, total: 45 },
  { platform: "discord" as const, claims: 8, total: 80 },
  { platform: "github" as const, claims: 3, total: 150 },
  { platform: "whatsapp" as const, claims: 2, total: 30 },
]

export default function PortalPage() {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawMethod, setWithdrawMethod] = useState<"web3" | "fiat">("web3")

  const totalBalance = 305
  const walletAddress = "0x742d35Cc...f595f"

  const user = {
    name: "Alice",
    avatar: "A",
    connectedAccounts: [
      { platform: "discord" as const, id: "@alice_web3" },
      { platform: "github" as const, id: "alice-dev" },
      { platform: "telegram" as const, id: "@alice_crypto" },
    ],
  }

  return (
    <div className="min-h-screen bg-black text-foreground relative overflow-hidden">
      <AnimatedBackground theme="fire" />

      <header className="relative z-10 border-b border-white/10 glass">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo-20core.png" alt="Protocol Banks" width={36} height={36} className="rounded-lg" />
            <Image
              src="/images/logo-20mark-20text-20white.png"
              alt="Protocol Banks"
              width={140}
              height={28}
              className="h-6 w-auto"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white">
                {user.avatar}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block">{user.name}</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name}</h1>
          <p className="text-muted-foreground mt-1">Manage your rewards across all platforms</p>
        </div>

        {/* Balance Card */}
        <GlassCard className="p-6 relative overflow-hidden" glowing>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <p className="text-5xl font-bold text-foreground">${totalBalance}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-sm text-muted-foreground">Across all platforms</span>
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">+$80 this month</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <GradientButton onClick={() => setShowWithdrawModal(true)} className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5" />
                Withdraw
              </GradientButton>
              <button className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-foreground hover:bg-white/5 transition-colors">
                <Wallet className="w-5 h-5" />
                View Wallet
              </button>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Platform Stats */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Earnings by Platform</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {platformStats.map((stat) => (
                  <div key={stat.platform} className="p-4 rounded-xl bg-white/5 text-center">
                    <PlatformIcon platform={stat.platform} className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">${stat.total}</p>
                    <p className="text-xs text-muted-foreground">{stat.claims} claims</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Claim History */}
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Recent Claims</h3>
                <button className="text-sm text-orange-400 hover:underline flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {mockHistory.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <PlatformIcon platform={claim.platform} className="w-8 h-8" />
                      <div>
                        <p className="font-medium text-foreground">{claim.campaign}</p>
                        <p className="text-xs text-muted-foreground">{claim.claimedAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-green-400">
                        +{claim.amount} {claim.token}
                      </p>
                      <a
                        href={`https://basescan.org/tx/${claim.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connected Accounts */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Connected Accounts</h3>
              <div className="space-y-3">
                {user.connectedAccounts.map((account) => (
                  <div key={account.platform} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <PlatformIcon platform={account.platform} className="w-6 h-6" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground capitalize">{account.platform}</p>
                      <p className="text-xs text-muted-foreground">{account.id}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                ))}
                <button className="w-full py-2 rounded-xl border border-dashed border-white/20 text-sm text-muted-foreground hover:text-foreground hover:border-white/40 transition-colors">
                  + Connect More
                </button>
              </div>
            </GlassCard>

            {/* Wallet Info */}
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Your Wallet</h3>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-xs text-green-400">Active</span>
                </div>
                <p className="text-sm text-muted-foreground mb-1">AA Wallet (Base)</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm text-foreground font-mono">{walletAddress}</code>
                  <button className="p-1 rounded hover:bg-white/10 transition-colors">
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                This wallet was automatically created for you. You can withdraw funds anytime.
              </p>
            </GlassCard>

            {/* Pending Claims */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-foreground">Pending</h3>
              </div>
              <div className="text-center py-6">
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground mt-1">No pending claims</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />
          <GlassCard className="relative w-full max-w-md z-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-6">Withdraw Funds</h2>

            {/* Method Selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setWithdrawMethod("web3")}
                className={cn(
                  "p-4 rounded-xl border text-center transition-all",
                  withdrawMethod === "web3"
                    ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                    : "bg-white/5 border-white/10 hover:border-white/20",
                )}
              >
                <Wallet className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                <p className="font-medium text-foreground">Web3 Wallet</p>
                <p className="text-xs text-muted-foreground mt-1">MetaMask, OKX, etc.</p>
              </button>
              <button
                onClick={() => setWithdrawMethod("fiat")}
                className={cn(
                  "p-4 rounded-xl border text-center transition-all",
                  withdrawMethod === "fiat"
                    ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                    : "bg-white/5 border-white/10 hover:border-white/20",
                )}
              >
                <Landmark className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
                <p className="font-medium text-foreground">Bank Account</p>
                <p className="text-xs text-muted-foreground mt-1">Via MoonPay</p>
              </button>
            </div>

            {withdrawMethod === "web3" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      max={totalBalance}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                    />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-orange-400">MAX</button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Available: ${totalBalance} USDC</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Destination Address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Network</span>
                    <span className="text-foreground">Base</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gas Fee</span>
                    <span className="text-green-400">Free (sponsored)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-cyan-400" />
                    <span className="font-medium text-foreground">Powered by MoonPay</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Convert your crypto to fiat and withdraw directly to your bank account
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount (USDC)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    max={totalBalance}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Currency</label>
                  <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50">
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="text-foreground">~1.5%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Est. Arrival</span>
                    <span className="text-foreground">1-3 business days</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-foreground hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <GradientButton className="flex-1">
                {withdrawMethod === "web3" ? "Withdraw" : "Continue to MoonPay"}
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
