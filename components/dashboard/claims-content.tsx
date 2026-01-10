"use client"

import { useState } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { cn } from "@/lib/utils"
import { Search, Download, ExternalLink, ChevronLeft, ChevronRight, CheckCircle2, Clock, XCircle } from "lucide-react"

interface ClaimRecord {
  id: string
  campaignName: string
  claimerPlatformId: string
  claimerPlatform: "telegram" | "discord" | "whatsapp" | "github"
  amount: number
  token: string
  tag: string
  txHash: string
  status: "success" | "pending" | "failed"
  claimedAt: string
  taskLink?: string
}

const mockClaims: ClaimRecord[] = [
  {
    id: "1",
    campaignName: "Discord Community Airdrop",
    claimerPlatformId: "@alice_web3",
    claimerPlatform: "discord",
    amount: 10,
    token: "USDC",
    tag: "Marketing",
    txHash: "0x1234...5678",
    status: "success",
    claimedAt: "2025-01-09 14:32:00",
  },
  {
    id: "2",
    campaignName: "GitHub Contributors Reward",
    claimerPlatformId: "bob_dev",
    claimerPlatform: "github",
    amount: 50,
    token: "USDC",
    tag: "DevBounty",
    txHash: "0xabcd...efgh",
    status: "success",
    claimedAt: "2025-01-09 13:15:00",
    taskLink: "https://github.com/org/repo/pull/102",
  },
  {
    id: "3",
    campaignName: "Telegram Marketing Push",
    claimerPlatformId: "@crypto_fan",
    claimerPlatform: "telegram",
    amount: 5,
    token: "USDC",
    tag: "Marketing",
    txHash: "0x9876...5432",
    status: "pending",
    claimedAt: "2025-01-09 12:45:00",
  },
  {
    id: "4",
    campaignName: "WhatsApp Beta Testers",
    claimerPlatformId: "+1234***5678",
    claimerPlatform: "whatsapp",
    amount: 15,
    token: "USDC",
    tag: "Testing",
    txHash: "",
    status: "failed",
    claimedAt: "2025-01-09 11:20:00",
  },
  {
    id: "5",
    campaignName: "GitHub Security Audit",
    claimerPlatformId: "security_guru",
    claimerPlatform: "github",
    amount: 500,
    token: "USDC",
    tag: "SecurityFix",
    txHash: "0xfedc...ba98",
    status: "success",
    claimedAt: "2025-01-08 16:00:00",
    taskLink: "https://github.com/org/repo/issues/45",
  },
  {
    id: "6",
    campaignName: "Discord Community Airdrop",
    claimerPlatformId: "@charlie_nft",
    claimerPlatform: "discord",
    amount: 10,
    token: "USDC",
    tag: "Marketing",
    txHash: "0x1111...2222",
    status: "success",
    claimedAt: "2025-01-08 14:20:00",
  },
  {
    id: "7",
    campaignName: "Telegram Marketing Push",
    claimerPlatformId: "@defi_master",
    claimerPlatform: "telegram",
    amount: 8,
    token: "USDC",
    tag: "Marketing",
    txHash: "0x3333...4444",
    status: "success",
    claimedAt: "2025-01-08 10:45:00",
  },
]

const tagColors: Record<string, string> = {
  Marketing: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  DevBounty: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Testing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  SecurityFix: "bg-red-500/20 text-red-400 border-red-500/30",
}

export function ClaimsContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterTag, setFilterTag] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  const statusConfig = {
    success: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20 border-green-500/30" },
    pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/30" },
    failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20 border-red-500/30" },
  }

  const filteredClaims = mockClaims.filter((c) => {
    if (filterPlatform !== "all" && c.claimerPlatform !== filterPlatform) return false
    if (filterStatus !== "all" && c.status !== filterStatus) return false
    if (filterTag !== "all" && c.tag !== filterTag) return false
    if (searchQuery && !c.claimerPlatformId.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const totalAmount = filteredClaims.reduce((a, c) => a + c.amount, 0)
  const uniqueTags = [...new Set(mockClaims.map((c) => c.tag))]

  const exportCSV = () => {
    const headers = ["ID", "Campaign", "Claimer", "Platform", "Amount", "Token", "Tag", "Status", "Date", "TX Hash"]
    const rows = filteredClaims.map((c) => [
      c.id,
      c.campaignName,
      c.claimerPlatformId,
      c.claimerPlatform,
      c.amount,
      c.token,
      c.tag,
      c.status,
      c.claimedAt,
      c.txHash,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `claims-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Claims</h1>
          <p className="text-muted-foreground">Track all claim records with full audit trail</p>
        </div>
        <GradientButton onClick={exportCSV} variant="secondary" className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export CSV
        </GradientButton>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Total Claims</p>
          <p className="text-2xl font-bold text-foreground mt-1">{filteredClaims.length}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold text-foreground mt-1">${totalAmount.toLocaleString()}</p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {filteredClaims.length > 0
              ? Math.round((filteredClaims.filter((c) => c.status === "success").length / filteredClaims.length) * 100)
              : 0}
            %
          </p>
        </GlassCard>
        <GlassCard className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {filteredClaims.filter((c) => c.status === "pending").length}
          </p>
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
              <option value="failed">Failed</option>
            </select>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
            >
              <option value="all">All Tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
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
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Campaign</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tag</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.map((claim) => {
                const StatusIcon = statusConfig[claim.status].icon
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
                      <p className="text-sm text-foreground">{claim.campaignName}</p>
                      {claim.taskLink && (
                        <a
                          href={claim.taskLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          View Task <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-foreground">
                        {claim.amount} {claim.token}
                      </p>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-medium border",
                          tagColors[claim.tag] || "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
                        )}
                      >
                        {claim.tag}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("w-4 h-4", statusConfig[claim.status].color)} />
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium border capitalize",
                            statusConfig[claim.status].bg,
                            statusConfig[claim.status].color,
                          )}
                        >
                          {claim.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-foreground">{claim.claimedAt.split(" ")[0]}</p>
                      <p className="text-xs text-muted-foreground">{claim.claimedAt.split(" ")[1]}</p>
                    </td>
                    <td className="p-4 text-right">
                      {claim.txHash && (
                        <a
                          href={`https://basescan.org/tx/${claim.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-foreground transition-colors"
                        >
                          {claim.txHash} <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredClaims.length} of {mockClaims.length} claims
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
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
