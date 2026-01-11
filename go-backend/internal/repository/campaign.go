package repository

import (
	"context"
	"time"

	"github.com/protocolbank/redpocket-backend/internal/model"
)

type CampaignRepository struct {
	db *PostgresDB
}

func NewCampaignRepository(db *PostgresDB) *CampaignRepository {
	return &CampaignRepository{db: db}
}

func (r *CampaignRepository) Create(ctx context.Context, c *model.Campaign) error {
	query := `
		INSERT INTO campaigns (
			id, enterprise_id, name, description, total_budget, spent_budget,
			token, token_address, chain_id, platform, total_pockets, total_claims,
			tag, status, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
	`
	_, err := r.db.Pool.Exec(ctx, query,
		c.ID, c.EnterpriseID, c.Name, c.Description, c.TotalBudget, c.SpentBudget,
		c.Token, c.TokenAddress, c.ChainID, c.Platform, c.TotalPockets, c.TotalClaims,
		c.Tag, c.Status, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *CampaignRepository) GetByID(ctx context.Context, id string) (*model.Campaign, error) {
	query := `
		SELECT id, enterprise_id, name, description, total_budget, spent_budget,
			token, token_address, chain_id, platform, total_pockets, total_claims,
			tag, status, created_at, updated_at
		FROM campaigns WHERE id = $1
	`
	c := &model.Campaign{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.EnterpriseID, &c.Name, &c.Description, &c.TotalBudget, &c.SpentBudget,
		&c.Token, &c.TokenAddress, &c.ChainID, &c.Platform, &c.TotalPockets, &c.TotalClaims,
		&c.Tag, &c.Status, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *CampaignRepository) ListByEnterprise(ctx context.Context, enterpriseID string, limit, offset int) ([]*model.Campaign, int64, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM campaigns WHERE enterprise_id = $1`
	var total int64
	if err := r.db.Pool.QueryRow(ctx, countQuery, enterpriseID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, enterprise_id, name, description, total_budget, spent_budget,
			token, token_address, chain_id, platform, total_pockets, total_claims,
			tag, status, created_at, updated_at
		FROM campaigns 
		WHERE enterprise_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Pool.Query(ctx, query, enterpriseID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var campaigns []*model.Campaign
	for rows.Next() {
		c := &model.Campaign{}
		err := rows.Scan(
			&c.ID, &c.EnterpriseID, &c.Name, &c.Description, &c.TotalBudget, &c.SpentBudget,
			&c.Token, &c.TokenAddress, &c.ChainID, &c.Platform, &c.TotalPockets, &c.TotalClaims,
			&c.Tag, &c.Status, &c.CreatedAt, &c.UpdatedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		campaigns = append(campaigns, c)
	}
	return campaigns, total, nil
}

func (r *CampaignRepository) Update(ctx context.Context, c *model.Campaign) error {
	query := `
		UPDATE campaigns SET
			name = $2, description = $3, total_budget = $4, spent_budget = $5,
			total_pockets = $6, total_claims = $7, tag = $8, status = $9, updated_at = $10
		WHERE id = $1
	`
	_, err := r.db.Pool.Exec(ctx, query,
		c.ID, c.Name, c.Description, c.TotalBudget, c.SpentBudget,
		c.TotalPockets, c.TotalClaims, c.Tag, c.Status, time.Now(),
	)
	return err
}

func (r *CampaignRepository) IncrementStats(ctx context.Context, id string, spentAmount float64, claimsCount int) error {
	query := `
		UPDATE campaigns SET
			spent_budget = spent_budget + $2,
			total_claims = total_claims + $3,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Pool.Exec(ctx, query, id, spentAmount, claimsCount)
	return err
}

func (r *CampaignRepository) IncrementPockets(ctx context.Context, id string) error {
	query := `UPDATE campaigns SET total_pockets = total_pockets + 1, updated_at = NOW() WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	return err
}

func (r *CampaignRepository) Delete(ctx context.Context, id string) error {
	query := `UPDATE campaigns SET status = 'deleted', updated_at = NOW() WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	return err
}

// GetAnalytics returns campaign analytics
func (r *CampaignRepository) GetAnalytics(ctx context.Context, enterpriseID string) (*model.CampaignAnalytics, error) {
	query := `
		SELECT 
			COUNT(*) as total_campaigns,
			COALESCE(SUM(total_budget), 0) as total_budget,
			COALESCE(SUM(spent_budget), 0) as total_spent,
			COALESCE(SUM(total_claims), 0) as total_claims,
			COALESCE(SUM(total_pockets), 0) as total_pockets,
			COUNT(*) FILTER (WHERE status = 'active') as active_campaigns
		FROM campaigns WHERE enterprise_id = $1
	`
	a := &model.CampaignAnalytics{}
	err := r.db.Pool.QueryRow(ctx, query, enterpriseID).Scan(
		&a.TotalCampaigns, &a.TotalBudget, &a.TotalSpent,
		&a.TotalClaims, &a.TotalPockets, &a.ActiveCampaigns,
	)
	if err != nil {
		return nil, err
	}
	return a, nil
}
