"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { cn } from "@/lib/utils"
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react"

interface Token {
  symbol: string
  name: string
  balance: number
  value: number
  icon: string
  change: number
}

interface Transaction {
  id: string
  type: "deposit" | "withdraw" | "distribution"
  amount: number
  token: string
  status: "completed" | "pending" | "failed"
  timestamp: string
  txHash: string
}

const tokens: Token[] = [
  { symbol: "USDC", name: "USD Coin", balance: 12450.5, value: 12450.5, icon: "/usdc-coins.png", change: 0 },
  { symbol: "USDT", name: "Tether", balance: 5230.0, value: 5230.0, icon: "/usdt-coins.png", change: 0 },
  { symbol: "ETH", name: "Ethereum", balance: 2.45, value: 8575.0, icon: "/eth.jpg", change: 3.2 },
]

const transactions: Transaction[] = [
  {
    id: "1",
    type: "deposit",
    amount: 5000,
    token: "USDC",
    status: "completed",
    timestamp: "2025-01-09 10:30:00",
    txHash: "0x1234...5678",
  },
  {
    id: "2",
    type: "distribution",
    amount: 234,
    token: "USDC",
    status: "completed",
    timestamp: "2025-01-09 09:15:00",
    txHash: "0xabcd...efgh",
  },
  {
    id: "3",
    type: "distribution",
    amount: 150,
    token: "USDC",
    status: "pending",
    timestamp: "2025-01-09 08:45:00",
    txHash: "0x9876...5432",
  },
  {
    id: "4",
    type: "withdraw",
    amount: 1000,
    token: "USDC",
    status: "completed",
    timestamp: "2025-01-08 16:20:00",
    txHash: "0xfedc...ba98",
  },
  {
    id: "5",
    type: "deposit",
    amount: 10000,
    token: "USDC",
    status: "completed",
    timestamp: "2025-01-07 14:00:00",
    txHash: "0x1111...2222",
  },
]

const platformLimits = [
  { platform: "Telegram", limit: 2000, used: 1200 },
  { platform: "Discord", limit: 3000, used: 2340 },
  { platform: "WhatsApp", limit: 1500, used: 0 },
  { platform: "GitHub", limit: 5000, used: 1800 },
]

export default function WalletPage() {
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)

  const walletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f..."
  const totalBalance = tokens.reduce((a, t) => a + t.value, 0)

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress)
  }

  const statusConfig = {
    completed: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" },
    pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20" },
    failed: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/20" },
  }

  const typeConfig = {
    deposit: { icon: ArrowDownLeft, color: "text-green-400", label: "Deposit" },
    withdraw: { icon: ArrowUpRight, color: "text-orange-400", label: "Withdraw" },
    distribution: { icon: RefreshCw, color: "text-cyan-400", label: "Distribution" },
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
          <p className="text-muted-foreground">Manage your fund pool and platform limits</p>
        </div>
        <div className="flex gap-3">
          <GradientButton onClick={() => setShowDepositModal(true)} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Deposit
          </GradientButton>
          <GradientButton
            onClick={() => setShowWithdrawModal(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ArrowUpRight className="w-5 h-5" />
            Withdraw
          </GradientButton>
        </div>
      </div>

      {/* Main Wallet Card */}
      <GlassCard className="p-6 relative overflow-hidden" glowing>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
              <p className="text-4xl font-bold text-foreground">${totalBalance.toLocaleString()}</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400">Secured</span>
                </div>
                <span className="text-xs text-muted-foreground">on Base Network</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30">
              <Wallet className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-muted-foreground mb-2">Wallet Address</p>
            <div className="flex items-center gap-3">
              <code className="text-sm text-foreground font-mono flex-1">{walletAddress}</code>
              <button onClick={copyAddress} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
              <a
                href={`https://basescan.org/address/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Balances */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Token Balances</h3>
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.symbol}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
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
                    <p className="font-medium text-foreground">
                      {token.balance.toLocaleString()} {token.symbol}
                    </p>
                    <p className="text-sm text-muted-foreground">${token.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Recent Transactions */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              {transactions.map((tx) => {
                const TypeIcon = typeConfig[tx.type].icon
                const StatusIcon = statusConfig[tx.status].icon
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-xl", statusConfig[tx.status].bg)}>
                        <TypeIcon className={cn("w-5 h-5", typeConfig[tx.type].color)} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{typeConfig[tx.type].label}</p>
                        <p className="text-xs text-muted-foreground">{tx.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p
                          className={cn(
                            "font-medium",
                            tx.type === "deposit"
                              ? "text-green-400"
                              : tx.type === "withdraw"
                                ? "text-orange-400"
                                : "text-cyan-400",
                          )}
                        >
                          {tx.type === "deposit" ? "+" : "-"}
                          {tx.amount} {tx.token}
                        </p>
                        <a
                          href={`https://basescan.org/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {tx.txHash}
                        </a>
                      </div>
                      <StatusIcon className={cn("w-5 h-5", statusConfig[tx.status].color)} />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>

        {/* Platform Limits */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Platform Limits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set spending limits per platform to control budget allocation
            </p>
            <div className="space-y-4">
              {platformLimits.map((p) => (
                <div key={p.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{p.platform}</span>
                    <span className="text-xs text-muted-foreground">
                      ${p.used.toLocaleString()} / ${p.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        p.used / p.limit > 0.8
                          ? "bg-gradient-to-r from-red-500 to-orange-500"
                          : "bg-gradient-to-r from-orange-500 to-pink-500",
                      )}
                      style={{ width: `${Math.min((p.used / p.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
              Edit Limits
            </button>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Plus className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Add Funds</p>
                  <p className="text-xs text-muted-foreground">Top up your balance</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Auto Top-up</p>
                  <p className="text-xs text-muted-foreground">Configure automatic deposits</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Shield className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Security Settings</p>
                  <p className="text-xs text-muted-foreground">2FA and withdrawal limits</p>
                </div>
              </button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowDepositModal(false)} />
          <GlassCard className="relative w-full max-w-md z-10">
            <h2 className="text-xl font-bold text-foreground mb-6">Deposit Funds</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Token</label>
                <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50">
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground mb-2">Deposit Address</p>
                <code className="text-sm text-foreground font-mono break-all">{walletAddress}</code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-foreground hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <GradientButton className="flex-1">Confirm Deposit</GradientButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowWithdrawModal(false)} />
          <GlassCard className="relative w-full max-w-md z-10">
            <h2 className="text-xl font-bold text-foreground mb-6">Withdraw Funds</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Token</label>
                <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50">
                  <option value="USDC">USDC (Balance: 12,450.50)</option>
                  <option value="USDT">USDT (Balance: 5,230.00)</option>
                  <option value="ETH">ETH (Balance: 2.45)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Destination Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-foreground hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <GradientButton className="flex-1">Confirm Withdraw</GradientButton>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
