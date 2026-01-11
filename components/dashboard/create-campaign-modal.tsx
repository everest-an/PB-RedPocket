"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { X, Wallet, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { base } from 'wagmi/chains'
import { TOKEN_ADDRESSES, ERC20_ABI } from '@/lib/web3-config'

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'form' | 'connect' | 'approve' | 'transfer' | 'creating' | 'success'

// Vault address to receive funds (in production, use actual contract)
const VAULT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91' as const

export function CreateCampaignModal({ isOpen, onClose }: CreateCampaignModalProps) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  
  const [step, setStep] = useState<Step>('form')
  const [platform, setPlatform] = useState<"telegram" | "discord" | "whatsapp" | "github">("telegram")
  const [isLucky, setIsLucky] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [budget, setBudget] = useState('')
  const [token, setToken] = useState<'USDC' | 'USDT'>('USDC')
  const [redPocketCount, setRedPocketCount] = useState('')
  const [message, setMessage] = useState('')
  const [createdLink, setCreatedLink] = useState('')
  const [error, setError] = useState('')

  // Get token address for current chain (default to Base)
  const tokenAddress = TOKEN_ADDRESSES[token]?.[base.id] as `0x${string}`

  // Check current allowance
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, VAULT_ADDRESS] : undefined,
    query: { enabled: !!address && step === 'approve' }
  })

  // Check balance
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address }
  })

  // Approve transaction
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract()
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash
  })

  // Transfer transaction
  const { writeContract: transfer, data: transferHash, isPending: isTransferring } = useWriteContract()
  const { isLoading: isTransferConfirming, isSuccess: isTransferSuccess } = useWaitForTransactionReceipt({
    hash: transferHash
  })

  // Handle approve success
  useEffect(() => {
    if (isApproveSuccess && step === 'approve') {
      setStep('transfer')
    }
  }, [isApproveSuccess, step])

  // Handle transfer success
  useEffect(() => {
    if (isTransferSuccess && step === 'transfer') {
      createCampaignOnBackend()
    }
  }, [isTransferSuccess, step])

  const resetForm = () => {
    setStep('form')
    setCampaignName('')
    setBudget('')
    setRedPocketCount('')
    setMessage('')
    setCreatedLink('')
    setError('')
  }

  if (!isOpen) return null

  const budgetAmount = parseFloat(budget) || 0
  const budgetInWei = budgetAmount > 0 ? parseUnits(budget, 6) : BigInt(0) // USDC has 6 decimals
  const hasEnoughBalance = balance ? balance >= budgetInWei : false
  const needsApproval = allowance !== undefined ? allowance < budgetInWei : true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!campaignName || !budget || !redPocketCount) {
      setError('Please fill in all required fields')
      return
    }

    if (!isConnected) {
      setStep('connect')
      return
    }

    if (!hasEnoughBalance) {
      setError(`Insufficient ${token} balance`)
      return
    }

    if (needsApproval) {
      setStep('approve')
    } else {
      setStep('transfer')
    }
  }

  const handleApprove = async () => {
    try {
      approve({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [VAULT_ADDRESS, budgetInWei]
      })
    } catch (err) {
      setError('Approval failed. Please try again.')
    }
  }

  const handleTransfer = async () => {
    try {
      transfer({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [VAULT_ADDRESS, budgetInWei]
      })
    } catch (err) {
      setError('Transfer failed. Please try again.')
    }
  }

  const createCampaignOnBackend = async () => {
    setStep('creating')
    try {
      const response = await fetch('/api/redpocket/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: `camp_${Date.now()}`,
          senderName: address?.slice(0, 10) || 'Anonymous',
          senderAddress: address,
          amount: budgetAmount,
          token,
          tokenAddress,
          platform,
          message,
          tag: 'campaign',
          totalCount: parseInt(redPocketCount),
          isLuckyDraw: isLucky,
          txHash: transferHash
        })
      })

      const data = await response.json()
      if (data.claimLink) {
        setCreatedLink(data.claimLink)
        setStep('success')
      } else {
        throw new Error('Failed to create campaign')
      }
    } catch (err) {
      setError('Failed to create campaign. Please contact support.')
      setStep('form')
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'connect':
        return (
          <div className="text-center py-8">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            <h3 className="text-xl font-bold text-foreground mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to create a red pocket campaign
            </p>
            <GradientButton onClick={() => open()} className="w-full">
              Connect Wallet
            </GradientButton>
            <button
              onClick={() => setStep('form')}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            >
              Go Back
            </button>
          </div>
        )

      case 'approve':
        return (
          <div className="text-center py-8">
            {isApproving || isApproveConfirming ? (
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-orange-400 animate-spin" />
            ) : (
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            )}
            <h3 className="text-xl font-bold text-foreground mb-2">Approve {token}</h3>
            <p className="text-muted-foreground mb-6">
              Allow the contract to use {budget} {token} for your campaign
            </p>
            <GradientButton 
              onClick={handleApprove} 
              className="w-full"
              loading={isApproving || isApproveConfirming}
            >
              {isApproving ? 'Confirming...' : isApproveConfirming ? 'Waiting...' : 'Approve'}
            </GradientButton>
          </div>
        )

      case 'transfer':
        return (
          <div className="text-center py-8">
            {isTransferring || isTransferConfirming ? (
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-orange-400 animate-spin" />
            ) : (
              <Wallet className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            )}
            <h3 className="text-xl font-bold text-foreground mb-2">Transfer Funds</h3>
            <p className="text-muted-foreground mb-6">
              Transfer {budget} {token} to create your campaign
            </p>
            <GradientButton 
              onClick={handleTransfer} 
              className="w-full"
              loading={isTransferring || isTransferConfirming}
            >
              {isTransferring ? 'Confirming...' : isTransferConfirming ? 'Processing...' : 'Transfer'}
            </GradientButton>
          </div>
        )

      case 'creating':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-orange-400 animate-spin" />
            <h3 className="text-xl font-bold text-foreground mb-2">Creating Campaign</h3>
            <p className="text-muted-foreground">Please wait...</p>
          </div>
        )

      case 'success':
        return (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-bold text-foreground mb-2">Campaign Created!</h3>
            <p className="text-muted-foreground mb-4">
              Share this link with your community
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-sm text-foreground break-all">{createdLink}</p>
            </div>
            <div className="flex gap-3">
              <GradientButton 
                onClick={() => navigator.clipboard.writeText(createdLink)}
                className="flex-1"
              >
                Copy Link
              </GradientButton>
              <button
                onClick={() => { resetForm(); onClose(); }}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-foreground hover:bg-white/20 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )

      default:
        return renderForm()
    }
  }

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Wallet Status */}
      {isConnected && address && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          {balance && (
            <span className="ml-auto text-sm text-muted-foreground">
              {formatUnits(balance, 6)} {token}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Campaign Name *</label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g., Community Airdrop"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
          required
        />
      </div>

      {/* Platform Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Platform</label>
        <div className="grid grid-cols-4 gap-2">
          {(["telegram", "discord", "whatsapp", "github"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                platform === p
                  ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                  : "bg-white/5 border-white/10 hover:border-white/20",
              )}
            >
              <PlatformIcon platform={p} className="w-6 h-6" />
              <span className="text-xs capitalize text-foreground">{p}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Total Budget *</label>
          <div className="relative">
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="100"
              min="1"
              step="0.01"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Token</label>
          <select 
            value={token}
            onChange={(e) => setToken(e.target.value as 'USDC' | 'USDT')}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:outline-none focus:border-orange-500/50"
          >
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
      </div>

      {/* Red Pocket Count */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Number of Red Pockets *</label>
        <input
          type="number"
          value={redPocketCount}
          onChange={(e) => setRedPocketCount(e.target.value)}
          placeholder="10"
          min="1"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
          required
        />
        {budget && redPocketCount && (
          <p className="text-xs text-muted-foreground mt-1">
            {isLucky ? 'Random amounts' : `${(parseFloat(budget) / parseInt(redPocketCount)).toFixed(2)} ${token} per pocket`}
          </p>
        )}
      </div>

      {/* Distribution Type */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Distribution Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsLucky(false)}
            className={cn(
              "p-4 rounded-xl border text-center transition-all",
              !isLucky
                ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20",
            )}
          >
            <p className="font-medium text-foreground">Fixed Amount</p>
            <p className="text-xs text-muted-foreground mt-1">Equal distribution</p>
          </button>
          <button
            type="button"
            onClick={() => setIsLucky(true)}
            className={cn(
              "p-4 rounded-xl border text-center transition-all",
              isLucky
                ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50"
                : "bg-white/5 border-white/10 hover:border-white/20",
            )}
          >
            <p className="font-medium text-foreground">Lucky Draw</p>
            <p className="text-xs text-muted-foreground mt-1">Random amounts</p>
          </button>
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Message (Optional)</label>
        <textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Welcome to our community..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50 resize-none"
        />
      </div>

      {/* Submit */}
      <GradientButton type="submit" className="w-full">
        {isConnected ? 'Create Campaign' : 'Connect Wallet & Create'}
      </GradientButton>
    </form>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <GlassCard className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Create Campaign</h2>
          <button onClick={() => { resetForm(); onClose(); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        {renderStep()}
      </GlassCard>
    </div>
  )
}
