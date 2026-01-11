import { cookieStorage, createStorage } from 'wagmi'
import { base, mainnet, polygon, moonbeam, astar } from 'viem/chains'

// Reown AppKit Project ID - get from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'b59d9670de2deec2149dd01a8b937146'

// Supported chains - EVM + Polkadot ecosystem
export const chains = [base, polygon, mainnet, moonbeam, astar] as const

// Re-export chains for use in other files
export { moonbeam, astar }

// Polkadot ecosystem chains (for UI highlighting)
export const POLKADOT_CHAINS = [moonbeam.id, astar.id] as const

// Chain metadata for UI
export const CHAIN_METADATA: Record<number, {
  name: string
  color: string
  isPolkadot: boolean
  description: string
}> = {
  [base.id]: {
    name: 'Base',
    color: '#0052FF',
    isPolkadot: false,
    description: 'Coinbase L2 - Low fees'
  },
  [polygon.id]: {
    name: 'Polygon',
    color: '#8247E5',
    isPolkadot: false,
    description: 'Fast & cheap'
  },
  [mainnet.id]: {
    name: 'Ethereum',
    color: '#627EEA',
    isPolkadot: false,
    description: 'Main network'
  },
  [moonbeam.id]: {
    name: 'Moonbeam',
    color: '#53CBC8',
    isPolkadot: true,
    description: 'Polkadot EVM'
  },
  [astar.id]: {
    name: 'Astar',
    color: '#0AE2FF',
    isPolkadot: true,
    description: 'Polkadot dApp hub'
  },
}

// Metadata for AppKit
export const metadata = {
  name: 'Protocol Bank RedPocket',
  description: 'Web3 Red Pocket Distribution Platform',
  url: 'https://redpocket.protocolbanks.com',
  icons: ['https://redpocket.protocolbanks.com/icon.png']
}

// Wagmi storage config
export const wagmiStorage = createStorage({
  storage: cookieStorage
})

// Vault contract address - configurable via environment
export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91') as `0x${string}`

// Token addresses on different chains
export const TOKEN_ADDRESSES: Record<string, Record<number, string>> = {
  USDC: {
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [polygon.id]: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    [moonbeam.id]: '0x931715FEE2d06333043d11F658C8CE934aC61D0c',
  },
  USDT: {
    [base.id]: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    [polygon.id]: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    [mainnet.id]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  }
}

// ERC20 ABI for token operations
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }]
  }
] as const
