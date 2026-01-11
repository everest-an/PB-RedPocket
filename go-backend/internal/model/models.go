package model

import (
	"time"
)

type RedPocket struct {
	ID              string    `json:"id" db:"id"`
	CampaignID      string    `json:"campaignId" db:"campaign_id"`
	SenderName      string    `json:"senderName" db:"sender_name"`
	SenderAvatar    string    `json:"senderAvatar,omitempty" db:"sender_avatar"`
	Amount          float64   `json:"amount" db:"amount"`
	RemainingAmount float64   `json:"remainingAmount" db:"remaining_amount"`
	Token           string    `json:"token" db:"token"`
	TokenAddress    string    `json:"tokenAddress" db:"token_address"`
	ChainID         int64     `json:"chainId" db:"chain_id"`
	Platform        string    `json:"platform" db:"platform"`
	ChannelID       string    `json:"platformChannelId,omitempty" db:"channel_id"`
	Message         string    `json:"message,omitempty" db:"message"`
	Tag             string    `json:"tag,omitempty" db:"tag"`
	TotalCount      int       `json:"totalCount" db:"total_count"`
	ClaimedCount    int       `json:"claimedCount" db:"claimed_count"`
	IsLuckyDraw     bool      `json:"isLuckyDraw" db:"is_lucky_draw"`
	MinAmount       float64   `json:"minAmount,omitempty" db:"min_amount"`
	MaxAmount       float64   `json:"maxAmount,omitempty" db:"max_amount"`
	ExpiresAt       time.Time `json:"expiresAt" db:"expires_at"`
	CreatedAt       time.Time `json:"createdAt" db:"created_at"`
	Status          string    `json:"status" db:"status"` // active, depleted, expired, cancelled
}

type Claim struct {
	ID            string    `json:"id" db:"id"`
	RedPocketID   string    `json:"redPocketId" db:"red_pocket_id"`
	ClaimerID     string    `json:"claimerId" db:"claimer_id"`
	PlatformID    string    `json:"claimerPlatformId" db:"platform_id"`
	Platform      string    `json:"claimerPlatform" db:"platform"`
	WalletAddress string    `json:"claimerWalletAddress" db:"wallet_address"`
	Amount        float64   `json:"amount" db:"amount"`
	TxHash        string    `json:"txHash,omitempty" db:"tx_hash"`
	Status        string    `json:"status" db:"status"` // pending, processing, success, failed
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	CompletedAt   *time.Time `json:"completedAt,omitempty" db:"completed_at"`
}

type Wallet struct {
	ID         string    `json:"id" db:"id"`
	UserID     string    `json:"userId" db:"user_id"`
	Address    string    `json:"address" db:"address"`
	ChainID    int64     `json:"chainId" db:"chain_id"`
	Type       string    `json:"type" db:"type"` // aa, eoa
	IsDeployed bool      `json:"isDeployed" db:"is_deployed"`
	PrivateKey string    `json:"-" db:"private_key"` // encrypted, never expose
	CreatedAt  time.Time `json:"createdAt" db:"created_at"`
}

type Campaign struct {
	ID            string    `json:"id" db:"id"`
	EnterpriseID  string    `json:"enterpriseId" db:"enterprise_id"`
	Name          string    `json:"name" db:"name"`
	Description   string    `json:"description,omitempty" db:"description"`
	TotalBudget   float64   `json:"totalBudget" db:"total_budget"`
	SpentBudget   float64   `json:"spentBudget" db:"spent_budget"`
	Token         string    `json:"token" db:"token"`
	TokenAddress  string    `json:"tokenAddress" db:"token_address"`
	ChainID       int64     `json:"chainId" db:"chain_id"`
	Platform      string    `json:"platform" db:"platform"`
	TotalPockets  int       `json:"totalRedPockets" db:"total_pockets"`
	TotalClaims   int       `json:"totalClaims" db:"total_claims"`
	Tag           string    `json:"tag,omitempty" db:"tag"`
	Status        string    `json:"status" db:"status"`
	CreatedAt     time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt     time.Time `json:"updatedAt" db:"updated_at"`
}

type CampaignAnalytics struct {
	TotalCampaigns  int64   `json:"totalCampaigns"`
	TotalBudget     float64 `json:"totalBudget"`
	TotalSpent      float64 `json:"totalSpent"`
	TotalClaims     int64   `json:"totalClaims"`
	TotalPockets    int64   `json:"totalPockets"`
	ActiveCampaigns int64   `json:"activeCampaigns"`
}

type Enterprise struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	ApiKey    string    `json:"-" db:"api_key"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}
