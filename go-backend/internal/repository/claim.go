package repository

import (
	"context"

	"github.com/protocolbank/redpocket-backend/internal/model"
)

type ClaimRepository struct {
	db *PostgresDB
}

func NewClaimRepository(db *PostgresDB) *ClaimRepository {
	return &ClaimRepository{db: db}
}

func (r *ClaimRepository) Create(ctx context.Context, c *model.Claim) error {
	query := `
		INSERT INTO claims (id, red_pocket_id, claimer_id, platform_id, platform, wallet_address, amount, tx_hash, status, created_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.Pool.Exec(ctx, query,
		c.ID, c.RedPocketID, c.ClaimerID, c.PlatformID, c.Platform, c.WalletAddress,
		c.Amount, c.TxHash, c.Status, c.CreatedAt, c.CompletedAt,
	)
	return err
}

func (r *ClaimRepository) GetByID(ctx context.Context, id string) (*model.Claim, error) {
	query := `
		SELECT id, red_pocket_id, claimer_id, platform_id, platform, wallet_address, amount, tx_hash, status, created_at, completed_at
		FROM claims WHERE id = $1
	`
	c := &model.Claim{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.RedPocketID, &c.ClaimerID, &c.PlatformID, &c.Platform, &c.WalletAddress,
		&c.Amount, &c.TxHash, &c.Status, &c.CreatedAt, &c.CompletedAt,
	)
	if err != nil {
		return nil, err
	}
	return c, nil
}

// Check if user already claimed this red pocket
func (r *ClaimRepository) HasClaimed(ctx context.Context, redPocketID, platformID, platform string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM claims 
			WHERE red_pocket_id = $1 AND platform_id = $2 AND platform = $3
		)
	`
	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, redPocketID, platformID, platform).Scan(&exists)
	return exists, err
}

func (r *ClaimRepository) UpdateStatus(ctx context.Context, id, status, txHash string) error {
	query := `
		UPDATE claims 
		SET status = $2, tx_hash = $3, completed_at = CASE WHEN $2 IN ('success', 'failed') THEN NOW() ELSE completed_at END
		WHERE id = $1
	`
	_, err := r.db.Pool.Exec(ctx, query, id, status, txHash)
	return err
}

func (r *ClaimRepository) ListByRedPocket(ctx context.Context, redPocketID string, limit, offset int) ([]*model.Claim, error) {
	query := `
		SELECT id, red_pocket_id, claimer_id, platform_id, platform, wallet_address, amount, tx_hash, status, created_at, completed_at
		FROM claims WHERE red_pocket_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Pool.Query(ctx, query, redPocketID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var claims []*model.Claim
	for rows.Next() {
		c := &model.Claim{}
		err := rows.Scan(
			&c.ID, &c.RedPocketID, &c.ClaimerID, &c.PlatformID, &c.Platform, &c.WalletAddress,
			&c.Amount, &c.TxHash, &c.Status, &c.CreatedAt, &c.CompletedAt,
		)
		if err != nil {
			return nil, err
		}
		claims = append(claims, c)
	}
	return claims, nil
}

func (r *ClaimRepository) ListByCampaign(ctx context.Context, campaignID string, limit, offset int) ([]*model.Claim, int64, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*) FROM claims c
		JOIN red_pockets rp ON c.red_pocket_id = rp.id
		WHERE rp.campaign_id = $1
	`
	var total int64
	if err := r.db.Pool.QueryRow(ctx, countQuery, campaignID).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT c.id, c.red_pocket_id, c.claimer_id, c.platform_id, c.platform, c.wallet_address, c.amount, c.tx_hash, c.status, c.created_at, c.completed_at
		FROM claims c
		JOIN red_pockets rp ON c.red_pocket_id = rp.id
		WHERE rp.campaign_id = $1
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Pool.Query(ctx, query, campaignID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var claims []*model.Claim
	for rows.Next() {
		c := &model.Claim{}
		err := rows.Scan(
			&c.ID, &c.RedPocketID, &c.ClaimerID, &c.PlatformID, &c.Platform, &c.WalletAddress,
			&c.Amount, &c.TxHash, &c.Status, &c.CreatedAt, &c.CompletedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		claims = append(claims, c)
	}
	return claims, total, nil
}

func (r *ClaimRepository) ListByEnterprise(ctx context.Context, enterpriseID string, limit, offset int) ([]*model.Claim, int64, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*) FROM claims c
		JOIN red_pockets rp ON c.red_pocket_id = rp.id
		JOIN campaigns camp ON rp.campaign_id = camp.id
		WHERE camp.enterprise_id = $1
	`
	var total int64
	if err := r.db.Pool.QueryRow(ctx, countQuery, enterpriseID).Scan(&total); err != nil {
		// If no campaigns table relation, fall back to all claims
		countQuery = `SELECT COUNT(*) FROM claims`
		if err := r.db.Pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
			return nil, 0, err
		}
	}

	query := `
		SELECT c.id, c.red_pocket_id, c.claimer_id, c.platform_id, c.platform, c.wallet_address, c.amount, c.tx_hash, c.status, c.created_at, c.completed_at
		FROM claims c
		ORDER BY c.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var claims []*model.Claim
	for rows.Next() {
		c := &model.Claim{}
		err := rows.Scan(
			&c.ID, &c.RedPocketID, &c.ClaimerID, &c.PlatformID, &c.Platform, &c.WalletAddress,
			&c.Amount, &c.TxHash, &c.Status, &c.CreatedAt, &c.CompletedAt,
		)
		if err != nil {
			return nil, 0, err
		}
		claims = append(claims, c)
	}
	return claims, total, nil
}
