export const config = {
  // Blockchain
  chainId: Number.parseInt(process.env.CHAIN_ID || "8453"),
  rpcUrl: process.env.RPC_URL || "https://mainnet.base.org",
  usdcAddress: process.env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",

  // Account Abstraction
  paymasterUrl: process.env.PAYMASTER_URL || "",
  bundlerUrl: process.env.BUNDLER_URL || "",
  aaFactoryAddress: process.env.AA_FACTORY_ADDRESS || "",

  // Database
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",

  // Social Platforms
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  },
  discord: {
    botToken: process.env.DISCORD_BOT_TOKEN || "",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  },
  github: {
    appId: process.env.GITHUB_APP_ID || "",
    privateKey: process.env.GITHUB_PRIVATE_KEY || "",
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || "",
  },
  whatsapp: {
    accountSid: process.env.WHATSAPP_ACCOUNT_SID || "",
    authToken: process.env.WHATSAPP_AUTH_TOKEN || "",
  },

  // Auth
  privy: {
    appId: process.env.PRIVY_APP_ID || "",
    appSecret: process.env.PRIVY_APP_SECRET || "",
  },
  jwtSecret: process.env.JWT_SECRET || "",

  // API
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  rateLimit: Number.parseInt(process.env.API_RATE_LIMIT || "100"),
} as const
