"use client"

import { useState, useEffect, useCallback } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { Search, Download, ExternalLink, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle, Loader2, RefreshCw } from "lucide-react"

interface ClaimRecord {
  id: string
  redPocketId: string
  claimerId: string
  claimerPlatformId: string
  claimerPlatform: "telegram" | "discord" | "whatsapp" | "github"
  claimerWalletAddress: string
  amount: number
  txHash: string
  status: "success" | "pending" | "processing" | "failed"
  createdAt: string
  completedAt?: string
}

const tagColors: Record<string, string> = {
  Marketing: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  DevBounty: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Testing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  SecurityFix: "bg-red-500/20 text-red-400 border-red-500/30",
}

const statusConfig = {
  success: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20 border-green-500/30" },
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/30" },
  processing: { icon: Clock, color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" },
}

export function ClaimsContent() {
  const [claims, setClaims] = useState<ClaimRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const fetchClaims = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getClaims({ page: currentPage, limit: pageSize }) as { 
        claims: ClaimRecord[], 
        total: number 
      }
      setClaims(response.claims || [])
      setTotal(response.total || 0)
    } catch (err) {
      console.error("Failed to fetch claims:", err)
      setError("Failed to load claims. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [currentPage])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  const filteredClaims = claims.filter((c) => {
    if (filterPlatform !== "all" && c.claimerPlatform !== filterPlatform) return false
    if (filterStatus !== "all" && c.status !== filterStatus) return false
    if (searchQuery && !c.claimerPlatformId.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const totalAmount = filteredClaims.reduce((a, c) => a + c.amount, 0)
  const successCount = filteredClaims.filter((c) => c.status === "success").length
  const pendingCount = filteredClaims.filter((c) => c.status === "pending" || c.status === "processing").length

  const exportCSV = () => {
    const headers = ["ID", "RedPocket ID", "Claimer", "Platform", "Wallet", "Amount", "Status", "Date", "TX Hash"]
    const rows = filteredClaims.map((c) => [
      c.id,
      c.redPocketId,
      c.claimerPlatformId,
      c.claimerPlatform,
      c.claimerWalletAddress,
      c.amount,
      c.status,
      c.createdAt,
      c.txHash || "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `claims-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  if (loading && claims.length === 0) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claims</h1>
          <p className="text-muted-foreground">Track all claim records with full audit trail</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchClaims}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-5 h-5 text-muted-foreground", loading && "animate-spin")} />
          </button>
          <GradientButton onClick={exportCSV} variant="secondary" className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export CSV
          </GradientButton>
        </div>
      </div>

      {error && (
        <GlassCard className="p-4 border-red-500/30 bg-red-500/10">
          <p className="text-red-400">{error}</p>
        </GlassCard>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Total Claims</p>
          <p className="text-2xl font-bold text-foreground mt-1">{total}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold text-foreground mt-1">${totalAmount.toLocaleString()}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {filteredClaims.length > 0 ? Math.round((successCount / filteredClaims.length) * 100) : 0}%
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{pendingCount}</p>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">All Platforms</option>
              <option value="telegram">Telegram</option>
              <option value="discord">Discord</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="github">GitHub</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Claims Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Claimer</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Wallet</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">TX Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    {claims.length === 0 ? "No claims yet." : "No claims match your filters."}
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => {
                  const status = claim.status as keyof typeof statusConfig
                  const StatusIcon = statusConfig[status]?.icon || Clock
                  const statusStyle = statusConfig[status] || statusConfig.pending
                  return (
                    <tr key={claim.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <PlatformIcon platform={claim.claimerPlatform} className="w-5 h-5" />
                          <div>
                            <p className="font-medium text-foreground">{claim.claimerPlatformId}</p>
                            <p className="text-xs text-muted-foreground capitalize">{claim.claimerPlatform}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-mono text-foreground truncate max-w-[120px]">
                          {claim.claimerWalletAddress ? `${claim.claimerWalletAddress.slice(0, 6)}...${claim.claimerWalletAddress.slice(-4)}` : "-"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-foreground">{claim.amount} USDC</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("w-4 h-4", statusStyle.color)} />
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                              statusStyle.bg,
                              statusStyle.color,
                            )}
                          >
                            {claim.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-foreground">
                          {new Date(claim.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(claim.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        {claim.txHash ? (
                          <a
                            href={`https://basescan.org/tx/${claim.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-foreground transition-colors"
                          >
                            {claim.txHash.slice(0, 6)}...{claim.txHash.slice(-4)} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredClaims.length} of {total} claims
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="px-3 py-1 rounded-lg bg-white/10 text-sm text-foreground">{currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              disabled={currentPage * pageSize >= total}
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
