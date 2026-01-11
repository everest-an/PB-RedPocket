package service

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/google/uuid"
	"github.com/protocolbank/redpocket-backend/internal/config"
	"github.com/protocolbank/redpocket-backend/internal/model"
	"github.com/protocolbank/redpocket-backend/internal/repository"
)

var (
	ErrRedPocketNotFound  = errors.New("red pocket not found")
	ErrRedPocketExpired   = errors.New("red pocket has expired")
	ErrRedPocketDepleted  = errors.New("red pocket is fully claimed")
	ErrAlreadyClaimed     = errors.New("you have already claimed this red pocket")
	ErrInsufficientFunds  = errors.New("insufficient funds in red pocket")
	ErrClaimLockFailed    = errors.New("claim in progress, please try again")
)

type RedPocketService struct {
	rpRepo    *repository.RedPocketRepository
	claimRepo *repository.ClaimRepository
	walletSvc *WalletService
	redis     *repository.RedisClient
	cfg       *config.Config
}

func NewRedPocketService(
	rpRepo *repository.RedPocketRepository,
	claimRepo *repository.ClaimRepository,
	walletSvc *WalletService,
	redis *repository.RedisClient,
	cfg *config.Config,
) *RedPocketService {
	return &RedPocketService{
		rpRepo:    rpRepo,
		claimRepo: claimRepo,
		walletSvc: walletSvc,
		redis:     redis,
		cfg:       cfg,
	}
}

type CreateRedPocketRequest struct {
	CampaignID   string  `json:"campaignId" binding:"required"`
	SenderName   string  `json:"senderName"`
	SenderAvatar string  `json:"senderAvatar"`
	Amount       float64 `json:"amount" binding:"required,gt=0"`
	Token        string  `json:"token" binding:"required"`
	TokenAddress string  `json:"tokenAddress"`
	Platform     string  `json:"platform" binding:"required"`
	ChannelID    string  `json:"platformChannelId"`
	Message      string  `json:"message"`
	Tag          string  `json:"tag"`
	TotalCount   int     `json:"totalCount" binding:"required,gt=0"`
	IsLuckyDraw  bool    `json:"isLuckyDraw"`
	MinAmount    float64 `json:"minAmount"`
	MaxAmount    float64 `json:"maxAmount"`
	ExpiresIn    int64   `json:"expiresIn"` // seconds, default 7 days
}

func (s *RedPocketService) Create(ctx context.Context, req *CreateRedPocketRequest) (*model.RedPocket, error) {
	expiresIn := req.ExpiresIn
	if expiresIn == 0 {
		expiresIn = 7 * 24 * 60 * 60 // 7 days
	}

	rp := &model.RedPocket{
		ID:              "rp_" + uuid.New().String()[:8],
		CampaignID:      req.CampaignID,
		SenderName:      req.SenderName,
		SenderAvatar:    req.SenderAvatar,
		Amount:          req.Amount,
		RemainingAmount: req.Amount,
		Token:           req.Token,
		TokenAddress:    req.TokenAddress,
		ChainID:         s.cfg.ChainID,
		Platform:        req.Platform,
		ChannelID:       req.ChannelID,
		Message:         req.Message,
		Tag:             req.Tag,
		TotalCount:      req.TotalCount,
		ClaimedCount:    0,
		IsLuckyDraw:     req.IsLuckyDraw,
		MinAmount:       req.MinAmount,
		MaxAmount:       req.MaxAmount,
		ExpiresAt:       time.Now().Add(time.Duration(expiresIn) * time.Second),
		CreatedAt:       time.Now(),
		Status:          "active",
	}

	if err := s.rpRepo.Create(ctx, rp); err != nil {
		return nil, fmt.Errorf("failed to create red pocket: %w", err)
	}

	return rp, nil
}

type ClaimRequest struct {
	RedPocketID string `json:"redPocketId" binding:"required"`
	PlatformID  string `json:"platformId" binding:"required"`
	Platform    string `json:"platform" binding:"required"`
}

type ClaimResponse struct {
	Success       bool    `json:"success"`
	ClaimedAmount float64 `json:"claimedAmount,omitempty"`
	WalletAddress string  `json:"walletAddress,omitempty"`
	TxHash        string  `json:"txHash,omitempty"`
	Error         string  `json:"error,omitempty"`
}

func (s *RedPocketService) Claim(ctx context.Context, req *ClaimRequest) (*ClaimResponse, error) {
	// 1. Acquire distributed lock to prevent race conditions
	lockKey := fmt.Sprintf("claim:%s:%s:%s", req.RedPocketID, req.Platform, req.PlatformID)
	acquired, err := s.redis.AcquireLock(ctx, lockKey, 10*time.Second)
	if err != nil || !acquired {
		return &ClaimResponse{Success: false, Error: ErrClaimLockFailed.Error()}, nil
	}
	defer s.redis.ReleaseLock(ctx, lockKey)

	// 2. Check if already claimed
	claimed, err := s.claimRepo.HasClaimed(ctx, req.RedPocketID, req.PlatformID, req.Platform)
	if err != nil {
		return nil, err
	}
	if claimed {
		return &ClaimResponse{Success: false, Error: ErrAlreadyClaimed.Error()}, nil
	}

	// 3. Get red pocket
	rp, err := s.rpRepo.GetByID(ctx, req.RedPocketID)
	if err != nil {
		return &ClaimResponse{Success: false, Error: ErrRedPocketNotFound.Error()}, nil
	}

	// 4. Validate status
	if rp.Status != "active" {
		return &ClaimResponse{Success: false, Error: fmt.Sprintf("red pocket is %s", rp.Status)}, nil
	}
	if time.Now().After(rp.ExpiresAt) {
		return &ClaimResponse{Success: false, Error: ErrRedPocketExpired.Error()}, nil
	}
	if rp.ClaimedCount >= rp.TotalCount {
		return &ClaimResponse{Success: false, Error: ErrRedPocketDepleted.Error()}, nil
	}

	// 5. Calculate claim amount
	claimAmount := s.calculateClaimAmount(rp)

	// 6. Get or create wallet for user
	userID := fmt.Sprintf("user_%s_%s", req.Platform, req.PlatformID)
	wallet, err := s.walletSvc.GetOrCreate(ctx, userID, rp.ChainID)
	if err != nil {
		return nil, fmt.Errorf("failed to get/create wallet: %w", err)
	}

	// 7. Atomic update red pocket (prevents overselling)
	_, err = s.rpRepo.ClaimAtomic(ctx, req.RedPocketID, claimAmount)
	if err != nil {
		return &ClaimResponse{Success: false, Error: ErrInsufficientFunds.Error()}, nil
	}

	// 8. Create claim record
	claim := &model.Claim{
		ID:            "claim_" + uuid.New().String()[:8],
		RedPocketID:   req.RedPocketID,
		ClaimerID:     userID,
		PlatformID:    req.PlatformID,
		Platform:      req.Platform,
		WalletAddress: wallet.Address,
		Amount:        claimAmount,
		Status:        "processing",
		CreatedAt:     time.Now(),
	}
	if err := s.claimRepo.Create(ctx, claim); err != nil {
		return nil, fmt.Errorf("failed to create claim: %w", err)
	}

	// 9. Execute transfer (async in production)
	txHash, err := s.walletSvc.TransferToken(ctx, wallet, rp.TokenAddress, claimAmount)
	if err != nil {
		s.claimRepo.UpdateStatus(ctx, claim.ID, "failed", "")
		return &ClaimResponse{Success: false, Error: "transfer failed"}, nil
	}

	// 10. Update claim status
	s.claimRepo.UpdateStatus(ctx, claim.ID, "success", txHash)

	return &ClaimResponse{
		Success:       true,
		ClaimedAmount: claimAmount,
		WalletAddress: wallet.Address,
		TxHash:        txHash,
	}, nil
}

func (s *RedPocketService) calculateClaimAmount(rp *model.RedPocket) float64 {
	if !rp.IsLuckyDraw {
		// Equal distribution
		return rp.Amount / float64(rp.TotalCount)
	}

	// Lucky draw - random amount
	remaining := rp.RemainingAmount
	remainingCount := rp.TotalCount - rp.ClaimedCount

	if remainingCount <= 1 {
		return remaining
	}

	// Use "二倍均值法" algorithm for fair random distribution
	avgRemaining := remaining / float64(remainingCount)
	maxAmount := avgRemaining * 2

	if rp.MaxAmount > 0 && maxAmount > rp.MaxAmount {
		maxAmount = rp.MaxAmount
	}

	minAmount := rp.MinAmount
	if minAmount <= 0 {
		minAmount = 0.01
	}

	// Random between min and max
	amount := minAmount + rand.Float64()*(maxAmount-minAmount)

	// Ensure we don't exceed remaining
	if amount > remaining {
		amount = remaining
	}

	return float64(int(amount*100)) / 100 // Round to 2 decimals
}

func (s *RedPocketService) Get(ctx context.Context, id string) (*model.RedPocket, error) {
	return s.rpRepo.GetByID(ctx, id)
}
