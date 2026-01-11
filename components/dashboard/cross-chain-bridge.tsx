"use client"

import { useState, useEffect } from "react"
import { ArrowRight, Loader2, AlertCircle, CheckCircle, Zap } from "lucide-react"
import { ChainIcon, PolkadotEcosystemIcon } from "@/components/ui/chain-icon"
import { GradientButton } from "@/components/ui/gradient-button"
import { cn } from "@/lib/utils"
import { useAccount, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { base, polygon, mainnet, moonbeam, astar } from 'viem/chains'
import { TOKEN_ADDRESSES, CHAIN_METADATA, POLKADOT_CHAINS } from '@/lib/web3-config'

interface CrossChainBridgeProps {
  targetChainId: number
  token: 'USDC' | 'USDT'
  amount: string
  onBridgeComplete?: (txHash: string) => void
  onSkip?: () => void
}

interface BridgeRoute {
  protocol: 'xcm' | 'layerzero' | 'hyperlane' | 'wormhole'
  name: string
  estimatedTime: string
  estimatedFee: string
  available: boolean
}

const BRIDGE_PROTOCOLS: Record<string, BridgeRoute> = {
  xcm: {
    protocol: 'xcm',
    name: 'Polkadot XCM',
    estimatedTime: '~1 min',
    estimatedFee: '~$0.01',
    available: true,
  },
  layerzero: {
    protocol: 'layerzero',
    name: 'LayerZero',
    estimatedTime: '~2 min',
    estimatedFee: '~$0.50',
    available: true,
  },
  hyperlane: {
    protocol: 'hyperlane',
    name: 'Hyperlane',
    estimatedTime: '~3 min',
    estimatedFee: '~$0.30',
    available: true,
  },
  wormhole: {
    protocol: 'wormhole',
    name: 'Wormhole',
    estimatedTime: '~5 min',
    estimatedFee: '~$1.00',
    available: false,
  },
}

const AVAILABLE_CHAINS = [base, polygon, mainnet, moonbeam, astar]

export function CrossChainBridge({ targetChainId, token, amount, onBridgeComplete, onSkip }: CrossChainBridgeProps) {
  const { address, chain: currentChain } = useAccount()
  const [sourceChainId, setSourceChainId] = useState<number>(base.id)
  const [selectedProtocol, setSelectedProtocol] = useState<string>('layerzero')
  const [isBridging, setIsBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  // Get balances on different chains
  const { data: baseBalance } = useBalance({
    address,
    token: TOKEN_ADDRESSES[token]?.[base.id] as `0x${string}`,
    chainId: base.id,
  })
  
  const { data: polygonBalance } = useBalance({
    address,
    token: TOKEN_ADDRESSES[token]?.[polygon.id] as `0x${string}`,
    chainId: polygon.id,
  })

  const { data: ethBalance } = useBalance({
    address,
    token: TOKEN_ADDRESSES[token]?.[mainnet.id] as `0x${string}`,
    chainId: mainnet.id,
  })

  const balances: Record<number, string> = {
    [base.id]: baseBalance ? formatUnits(baseBalance.value, 6) : '0',
    [polygon.id]: polygonBalance ? formatUnits(polygonBalance.value, 6) : '0',
    [mainnet.id]: ethBalance ? formatUnits(ethBalance.value, 6) : '0',
  }

  // Find best source chain with sufficient balance
  useEffect(() => {
    const requiredAmount = parseFloat(amount) || 0
    for (const chainId of [base.id, polygon.id, mainnet.id]) {
      const balance = parseFloat(balances[chainId] || '0')
      if (balance >= requiredAmount) {
        setSourceChainId(chainId)
        break
      }
    }
  }, [amount, balances])

  // Determine best bridge protocol
  const getBestProtocol = (): string => {
    const isTargetPolkadot = POLKADOT_CHAINS.includes(targetChainId as any)
    const isSourcePolkadot = POLKADOT_CHAINS.includes(sourceChainId as any)
    
    if (isTargetPolkadot && isSourcePolkadot) {
      return 'xcm' // Use XCM for Polkadot ecosystem
    } else if (isTargetPolkadot || isSourcePolkadot) {
      return 'hyperlane' // Cross-ecosystem via Hyperlane
    }
    return 'layerzero' // EVM to EVM via LayerZero
  }

  useEffect(() => {
    setSelectedProtocol(getBestProtocol())
  }, [sourceChainId, targetChainId])

  const handleBridge = async () => {
    setIsBridging(true)
    setBridgeStatus('pending')
    setError('')

    try {
      // Call backend XCM/bridge API
      const response = await fetch('/api/backend/api/v1/xcm/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain: sourceChainId,
          toChain: targetChainId,
          asset: token,
          amount: (parseFloat(amount) * 1e6).toString(), // Convert to smallest unit
          sender: address,
          recipient: address,
          protocol: selectedProtocol,
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        setBridgeStatus('success')
        onBridgeComplete?.(data.sourceTxHash)
      } else {
        throw new Error(data.error || 'Bridge failed')
      }
    } catch (err: any) {
      setError(err.message || 'Bridge failed')
      setBridgeStatus('error')
    } finally {
      setIsBridging(false)
    }
  }

  const sourceChainMeta = CHAIN_METADATA[sourceChainId]
  const targetChainMeta = CHAIN_METADATA[targetChainId]
  const protocol = BRIDGE_PROTOCOLS[selectedProtocol]
  const sourceBalance = balances[sourceChainId] || '0'
  const hasEnoughBalance = parseFloat(sourceBalance) >= (parseFloat(amount) || 0)

  // If already on target chain with enough balance, skip bridge
  if (currentChain?.id === targetChainId && hasEnoughBalance) {
    return null
  }

  return (
    <div className="space-y-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-purple-400" />
        <h3 className="font-semibold text-foreground">Cross-Chain Bridge</h3>
        {POLKADOT_CHAINS.includes(targetChainId as any) && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400">
            <PolkadotEcosystemIcon className="w-3 h-3" />
            XCM
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Your {token} is on a different chain. Bridge it to {targetChainMeta?.name} to create your red pocket.
      </p>

      {/* Source Chain Selection */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Source Chain (where you have {token})</label>
        <div className="grid grid-cols-3 gap-2">
          {[base, polygon, mainnet].map((chain) => {
            const balance = balances[chain.id] || '0'
            const hasBalance = parseFloat(balance) > 0
            const meta = CHAIN_METADATA[chain.id]
            
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => setSourceChainId(chain.id)}
                disabled={!hasBalance}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all",
                  sourceChainId === chain.id
                    ? "bg-purple-500/20 border-purple-500/50"
                    : hasBalance
                      ? "bg-white/5 border-white/10 hover:border-white/20"
                      : "bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
                )}
              >
                <ChainIcon chainId={chain.id} className="w-6 h-6" showBadge={false} />
                <span className="text-xs text-foreground">{meta?.name}</span>
                <span className={cn("text-xs", hasBalance ? "text-green-400" : "text-muted-foreground")}>
                  {parseFloat(balance).toFixed(2)} {token}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bridge Route */}
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center">
          <ChainIcon chainId={sourceChainId} className="w-10 h-10" />
          <span className="text-xs text-muted-foreground mt-1">{sourceChainMeta?.name}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <ArrowRight className="w-6 h-6 text-purple-400" />
          <span className="text-xs text-purple-400">{protocol?.name}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <ChainIcon chainId={targetChainId} className="w-10 h-10" />
          <span className="text-xs text-muted-foreground mt-1">{targetChainMeta?.name}</span>
        </div>
      </div>

      {/* Protocol Selection */}
      <div>
        <label className="block text-xs text-muted-foreground mb-2">Bridge Protocol</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(BRIDGE_PROTOCOLS).map(([key, proto]) => (
            <button
              key={key}
              type="button"
              onClick={() => proto.available && setSelectedProtocol(key)}
              disabled={!proto.available}
              className={cn(
                "flex flex-col p-3 rounded-xl border transition-all text-left",
                selectedProtocol === key
                  ? "bg-purple-500/20 border-purple-500/50"
                  : proto.available
                    ? "bg-white/5 border-white/10 hover:border-white/20"
                    : "bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-sm font-medium text-foreground">{proto.name}</span>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{proto.estimatedTime}</span>
                <span>{proto.estimatedFee}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white/5 rounded-xl p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span className="text-foreground">{amount} {token}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Bridge Fee</span>
          <span className="text-foreground">{protocol?.estimatedFee}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Est. Time</span>
          <span className="text-foreground">{protocol?.estimatedTime}</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {bridgeStatus === 'success' && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">Bridge initiated! Funds will arrive shortly.</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-foreground hover:bg-white/20 transition-colors"
        >
          Skip (use current chain)
        </button>
        <GradientButton
          onClick={handleBridge}
          disabled={!hasEnoughBalance || isBridging}
          loading={isBridging}
          className="flex-1"
        >
          {isBridging ? 'Bridging...' : `Bridge to ${targetChainMeta?.name}`}
        </GradientButton>
      </div>

      {!hasEnoughBalance && (
        <p className="text-xs text-yellow-400 text-center">
          Insufficient {token} balance on {sourceChainMeta?.name}. You have {sourceBalance} {token}.
        </p>
      )}
    </div>
  )
}
