import { cookieStorage, createStorage } from 'wagmi'
import { base, mainnet, polygon } from 'wagmi/chains'

// Reown AppKit Project ID - get from https://cloud.reown.com
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || 'demo-project-id'

// Supported chains
export const chains = [base, polygon, mainnet] as const

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

// Token addresses on different chains
export const TOKEN_ADDRESSES = {
  USDC: {
    [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    [polygon.id]: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  USDT: {
    [base.id]: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    [polygon.id]: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    [mainnet.id]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  }
} as const

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
