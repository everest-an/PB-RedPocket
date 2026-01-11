# RedPocket - Protocol Banks

<div align="center">

**Cross-Platform Web3 Incentive Distribution Component**

Distribute Web3 rewards as easily as sending a message, with seamless reconciliation

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by Polkadot](https://img.shields.io/badge/Powered%20by-Polkadot-E6007A?logo=polkadot)](https://polkadot.network/)

[Features](#features) • [Architecture](#architecture) • [Quick Start](#quick-start) • [Deployment](#deployment)

</div>

---

## Overview

RedPocket is a frictionless Web3 incentive distribution layer that eliminates traditional wallet barriers. Users don't need pre-existing wallets—they can claim rewards directly via social identities on Discord, Telegram, WhatsApp, and GitHub. Funds are centrally managed, and users only visit the main platform when withdrawing or reviewing reports.

### Core Innovation

**Social Identity as Wallet (Social Login + Account Abstraction)**
- Built on ERC-4337 Account Abstraction standard, auto-generating non-custodial AA wallets on first claim
- No private keys to remember, no app downloads—just click to claim
- Gas sponsorship enabled for zero-friction user onboarding

**Cross-Platform Connectors**
- **GitHub**: Interactive cards embedded in PR/Issue comments
- **Telegram/Discord**: Minimalist message cards triggered by bots
- **WhatsApp**: H5 link-based identity verification claims

**Polkadot Cross-Chain Bridge**
- Leverages Polkadot XCM protocol for cross-chain asset transfers
- Supports Polkadot, Kusama, and their parachain ecosystems
- Unified asset management with seamless cross-chain reconciliation

---

## Features

### 🎁 Embedded Distribution Component

| Platform | Trigger | Interaction |
|----------|---------|-------------|
| **GitHub** | Action / Comment Command | Markdown claim card in PR/Issue |
| **Telegram** | Bot Command `/send` | Inline Button / Lucky Money |
| **Discord** | Slash Command `/reward` | Interactive Embed Message |
| **WhatsApp** | H5 Share Link | Identity-verified claim short link |

**Distribution Logic**
- Enterprises initiate via platform or command, setting amount, quantity, and category
- Mandatory tagging (e.g., Marketing, Dev Bounty)
- Auto-reserve quotas for wallet-less users, activated on link click

### 💼 Enterprise Management Dashboard

**Transaction Overview**
- Real-time flow dashboard: distribution time, platform, recipient, status
- Multi-dimensional reconciliation: trace transactions to specific GitHub PRs or social tasks
- Auto-categorized statistics: generate pie charts by tags

**Financial Reports**
- Auto-generate P&L statements
- Tax-friendly receipts: each expense linked to task completion screenshot or URL
- Export accounting-standard CSV/PDF with real-time exchange rates

**Fund Pool Management**
- Enterprise deposits stablecoins to main account, shared across platforms
- Set spending limits per platform
- Multi-sig wallet for fund security

### 👤 User Withdrawal Portal

**Balance Aggregation**
- Auto-aggregate rewards from all platforms
- Unified display of cross-chain assets (Polkadot/Ethereum/Polygon)
- Real-time claim history

**Flexible Withdrawal**
- **Web3 Path**: Withdraw to MetaMask/OKX wallets
- **Fiat Path**: Cash out to bank via MoonPay/Transak
- Gas-sponsored, zero-cost withdrawals for users

---

## Architecture

### Tech Stack

**Frontend**
- Next.js 16 (React 19.2) - Server-side rendering
- TailwindCSS v4 - Glassmorphism design system
- shadcn/ui - Component library
- Framer Motion - Animation effects

**Backend**
- Node.js + NestJS - Multi-platform webhook hub
- Redis (Upstash) - Caching & session management
- PostgreSQL - Business data storage

**Blockchain Layer**
- **Polkadot XCM** - Cross-chain message passing
- ERC-4337 Account Abstraction
- Base / Polygon - Low-gas main chains
- Privy / Web3Auth - Social login & wallet generation

**Smart Contracts**
```
SimpleAccountFactory    # AA wallet factory
SimpleAccount          # AA wallet implementation
Paymaster              # Gas sponsor contract
TokenVault             # Token fund pool
RedPocket              # Main red packet contract
TransparentUpgradeableProxy  # Upgradeable proxy
```

**Cross-Chain Bridge**
- XCM Types & Config - Polkadot cross-chain config
- Bridge Service - Asset cross-chain service
- Chain Selector - Multi-chain routing

**Social Integrations**
- Telegram Bot API
- Discord.js
- Twilio / WhatsApp Business API
- GitHub App / Actions

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Social Platform Layer                   │
│   Telegram │ Discord │ WhatsApp │ GitHub                │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                 RedPocket Middleware                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Webhook │  │   Auth   │  │  Router  │             │
│  │  Handler │  │  Service │  │  Service │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│            Polkadot Cross-Chain Layer (XCM)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Relay   │  │Parachain │  │  Bridge  │             │
│  │  Chain   │  │ Selector │  │  Service │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────┬───────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│                   EVM Execution Layer                    │
│  Polygon │ Base │ Arbitrum │ Ethereum                   │
│  ERC-4337 Account Abstraction + Smart Contracts        │
└─────────────────────────────────────────────────────────┘
```

### Security & Risk Control

**Multi-Sig Mechanism**
- ProxyAdmin supports multi-sig management
- Enterprise fund pools use Gnosis Safe
- Contract upgrades require multi-party signatures

**Anti-Fraud System**
- Rate limiting
- New account activity thresholds
- Bot behavior detection

**Compliance & Audit**
- Every transaction traceable on-chain
- Auto-generate tax receipts
- Support regulatory report exports

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm / pnpm / yarn
- Redis (Upstash or local)

### Installation

```bash
npm install
```

### Environment Setup

Create `.env.local` file:

```env
# Redis
KV_URL=your_redis_url
KV_REST_API_TOKEN=your_token
KV_REST_API_URL=your_api_url

# Backend API
NEXT_PUBLIC_API_URL=https://api.protocoolbanks.com

# Social Platform Tokens
TELEGRAM_BOT_TOKEN=your_telegram_token
DISCORD_BOT_TOKEN=your_discord_token
WHATSAPP_API_KEY=your_whatsapp_key
GITHUB_APP_PRIVATE_KEY=your_github_key

# Blockchain
PRIVATE_KEY=your_deployer_private_key
INFURA_API_KEY=your_infura_key
```

### Local Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

---

## Deployment

### Frontend Deployment (Vercel)

1. Import GitHub repository in Vercel
2. Configure environment variables (refer to `.env.production.example`)
3. Auto-deploy on push

### Backend Deployment (AWS)

See detailed deployment steps in [DEPLOYMENT.md](DEPLOYMENT.md)

```bash
# Initialize AWS infrastructure
cd infrastructure
terraform init
terraform apply

# Deploy backend services
./scripts/deploy-all.sh
```

### Smart Contract Deployment

```bash
# Testnet deployment
npm run deploy:mumbai

# Mainnet deployment
npm run deploy:polygon
npm run deploy:base
```

---

## Project Structure

```
redpocket/
├── app/                        # Next.js App Router
│   ├── page.tsx               # Homepage (dual-theme red packet showcase)
│   ├── claim/[id]/            # Red packet claim page
│   ├── dashboard/             # Enterprise management dashboard
│   │   ├── campaigns/         # Campaign management
│   │   ├── claims/            # Transaction audit
│   │   ├── wallet/            # Fund pool management
│   │   └── settings/          # Enterprise settings
│   ├── portal/                # User withdrawal portal
│   └── api/                   # API routes
├── components/                # React components
│   ├── redpocket/            # Red packet core components
│   ├── dashboard/            # Dashboard components
│   └── ui/                   # UI base components
├── lib/                       # Utility libraries
│   ├── api-client.ts         # API client
│   ├── wallet.ts             # AA wallet utilities
│   └── types.ts              # TypeScript types
├── backend/                   # Backend services (to be integrated)
├── infrastructure/           # Terraform IaC
└── scripts/                  # Deployment scripts
```

---

## Competitive Advantages

1. **Zero-Barrier Entry**: No wallet needed, claim via social accounts
2. **Cross-Chain Interoperability**: Polkadot XCM enables free asset flow
3. **Platform Consistency**: Unified account aggregates rewards across all platforms
4. **Compliance-Friendly**: Every expense traceable, auto-generated financial receipts
5. **Enterprise-Grade Security**: Multi-sig management, anti-fraud system, fund isolation

---

## Use Case Example

### GitHub Developer Bounty Flow

1. **Trigger**: Project comments `/reward @dev_user 50 USDC --tag "SecurityFix"`
2. **Silent Accounting**: Protocol Bank creates pending record, tagged "Security Fix"
3. **Frictionless Claim**: Developer clicks card, logs in via GitHub to H5
4. **Wallet Generation**: System detects wallet-less user, silently generates AA wallet
5. **Fund Transfer**: 50 USDC auto-transferred to new wallet
6. **Reconciliation Complete**: Dashboard displays full transaction trail

---

## Roadmap

- [x] Base red packet component (dual themes)
- [x] Enterprise management dashboard
- [x] User withdrawal portal
- [x] GitHub integration
- [ ] Telegram Bot integration
- [ ] Discord Bot integration
- [ ] WhatsApp integration
- [ ] Polkadot cross-chain bridge
- [ ] Smart contract audit
- [ ] Mainnet launch

---

## Technical Documentation

- [Deployment Guide](DEPLOYMENT.md)
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md)
- [API Documentation](docs/API.md) *(Coming soon)*
- [Smart Contract Documentation](docs/CONTRACTS.md) *(Coming soon)*

---

## License

MIT License - See [LICENSE](LICENSE)

---

## Contact

- Website: [protocoolbanks.com](https://protocoolbanks.com)
- Email: support@protocoolbanks.com
- GitHub: [github.com/protocool-banks/redpocket](https://github.com/protocool-banks/redpocket)

---

<div align="center">

**Built with Polkadot • Powered by Web3 • Designed for Everyone**

</div>
