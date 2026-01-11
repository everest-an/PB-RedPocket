package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port             string
	Env              string
	DatabaseURL      string
	RedisURL         string
	RPCUrl           string
	ChainID          int64
	USDCAddress      string
	BundlerURL       string
	PaymasterURL     string
	EntryPoint       string
	JWTSecret        string
	RateLimitRPS     int
	TelegramBotToken string
	DiscordBotToken  string
	VaultAddress     string
}

func Load() *Config {
	return &Config{
		Port:             getEnv("PORT", "8080"),
		Env:              getEnv("ENV", "development"),
		DatabaseURL:      getEnv("DATABASE_URL", "postgres://postgres:password@localhost:5432/redpocket?sslmode=disable"),
		RedisURL:         getEnv("REDIS_URL", "redis://localhost:6379"),
		RPCUrl:           getEnv("RPC_URL", "https://mainnet.base.org"),
		ChainID:          getEnvInt64("CHAIN_ID", 8453),
		USDCAddress:      getEnv("USDC_ADDRESS", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
		BundlerURL:       getEnv("BUNDLER_URL", ""),
		PaymasterURL:     getEnv("PAYMASTER_URL", ""),
		EntryPoint:       getEnv("ENTRY_POINT_ADDRESS", "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"),
		JWTSecret:        getEnv("JWT_SECRET", "change-me-in-production"),
		RateLimitRPS:     getEnvInt("RATE_LIMIT_RPS", 1000),
		TelegramBotToken: getEnv("TELEGRAM_BOT_TOKEN", ""),
		DiscordBotToken:  getEnv("DISCORD_BOT_TOKEN", ""),
		VaultAddress:     getEnv("VAULT_ADDRESS", "0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getEnvInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.ParseInt(value, 10, 64); err == nil {
			return i
		}
	}
	return defaultValue
}
