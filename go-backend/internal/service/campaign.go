package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/protocolbank/redpocket-backend/internal/config"
	"github.com/protocolbank/redpocket-backend/internal/model"
	"github.com/protocolbank/redpocket-backend/internal/repository"
)

type CampaignService struct {
	repo     *repository.CampaignRepository
	claimRepo *repository.ClaimRepository
	cfg      *config.Config
}

func NewCampaignService(
	repo *repository.CampaignRepository,
	claimRepo *repository.ClaimRepository,
	cfg *config.Config,
) *CampaignService {
	return &CampaignService{
		repo:     repo,
		claimRepo: claimRepo,
		cfg:      cfg,
	}
}

type CreateCampaignRequest struct {
	EnterpriseID string  `json:"enterpriseId"`
	Name         string  `json:"name" binding:"required"`
	Description  string  `json:"description"`
	TotalBudget  float64 `json:"totalBudget" binding:"required,gt=0"`
	Token        string  `json:"token" binding:"required"`
	TokenAddress string  `json:"tokenAddress"`
	Platform     string  `json:"platform" binding:"required"`
	Tag          string  `json:"tag"`
}

func (s *CampaignService) Create(ctx context.Context, req *CreateCampaignRequest) (*model.Campaign, error) {
	campaign := &model.Campaign{
		ID:           "campaign_" + uuid.New().String()[:8],
		EnterpriseID: req.EnterpriseID,
		Name:         req.Name,
		Description:  req.Description,
		TotalBudget:  req.TotalBudget,
		SpentBudget:  0,
		Token:        req.Token,
		TokenAddress: req.TokenAddress,
		ChainID:      s.cfg.ChainID,
		Platform:     req.Platform,
		TotalPockets: 0,
		TotalClaims:  0,
		Tag:          req.Tag,
		Status:       "active",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.repo.Create(ctx, campaign); err != nil {
		return nil, fmt.Errorf("failed to create campaign: %w", err)
	}

	return campaign, nil
}

func (s *CampaignService) Get(ctx context.Context, id string) (*model.Campaign, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *CampaignService) List(ctx context.Context, enterpriseID string, page, limit int) ([]*model.Campaign, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit
	return s.repo.ListByEnterprise(ctx, enterpriseID, limit, offset)
}

func (s *CampaignService) GetClaims(ctx context.Context, campaignID string, page, limit int) ([]*model.Claim, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit
	return s.claimRepo.ListByCampaign(ctx, campaignID, limit, offset)
}

func (s *CampaignService) GetAnalytics(ctx context.Context, enterpriseID string) (*model.CampaignAnalytics, error) {
	return s.repo.GetAnalytics(ctx, enterpriseID)
}

func (s *CampaignService) UpdateStatus(ctx context.Context, id, status string) error {
	campaign, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	campaign.Status = status
	return s.repo.Update(ctx, campaign)
}

func (s *CampaignService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
