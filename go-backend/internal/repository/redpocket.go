package repository

import (
	"context"
	"time"

	"github.com/protocolbank/redpocket-backend/internal/model"
)

type RedPocketRepository struct {
	db *PostgresDB
}

func NewRedPocketRepository(db *PostgresDB) *RedPocketRepository {
	return &RedPocketRepository{db: db}
}

func (r *RedPocketRepository) Create(ctx context.Context, rp *model.RedPocket) error {
	query := `
		INSERT INTO red_pockets (
			id, campaign_id, sender_name, sender_avatar, amount, remaining_amount,
			token, token_address, chain_id, platform, channel_id, message, tag,
			total_count, claimed_count, is_lucky_draw, min_amount, max_amount,
			expires_at, created_at, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
	`
	_, err := r.db.Pool.Exec(ctx, query,
		rp.ID, rp.CampaignID, rp.SenderName, rp.SenderAvatar, rp.Amount, rp.RemainingAmount,
		rp.Token, rp.TokenAddress, rp.ChainID, rp.Platform, rp.ChannelID, rp.Message, rp.Tag,
		rp.TotalCount, rp.ClaimedCount, rp.IsLuckyDraw, rp.MinAmount, rp.MaxAmount,
		rp.ExpiresAt, rp.CreatedAt, rp.Status,
	)
	return err
}

func (r *RedPocketRepository) GetByID(ctx context.Context, id string) (*model.RedPocket, error) {
	query := `
		SELECT id, campaign_id, sender_name, sender_avatar, amount, remaining_amount,
			token, token_address, chain_id, platform, channel_id, message, tag,
			total_count, claimed_count, is_lucky_draw, min_amount, max_amount,
			expires_at, created_at, status
		FROM red_pockets WHERE id = $1
	`
	rp := &model.RedPocket{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&rp.ID, &rp.CampaignID, &rp.SenderName, &rp.SenderAvatar, &rp.Amount, &rp.RemainingAmount,
		&rp.Token, &rp.TokenAddress, &rp.ChainID, &rp.Platform, &rp.ChannelID, &rp.Message, &rp.Tag,
		&rp.TotalCount, &rp.ClaimedCount, &rp.IsLuckyDraw, &rp.MinAmount, &rp.MaxAmount,
		&rp.ExpiresAt, &rp.CreatedAt, &rp.Status,
	)
	if err != nil {
		return nil, err
	}
	return rp, nil
}

// Atomic claim update with row lock - critical for high concurrency
func (r *RedPocketRepository) ClaimAtomic(ctx context.Context, id string, claimAmount float64) (*model.RedPocket, error) {
	query := `
		UPDATE red_pockets 
		SET claimed_count = claimed_count + 1,
			remaining_amount = remaining_amount - $2,
			status = CASE 
				WHEN claimed_count + 1 >= total_count THEN 'depleted'
				WHEN remaining_amount - $2 <= 0 THEN 'depleted'
				ELSE status 
			END
		WHERE id = $1 
			AND status = 'active'
			AND claimed_count < total_count
			AND remaining_amount >= $2
			AND expires_at > NOW()
		RETURNING id, campaign_id, sender_name, sender_avatar, amount, remaining_amount,
			token, token_address, chain_id, platform, channel_id, message, tag,
			total_count, claimed_count, is_lucky_draw, min_amount, max_amount,
			expires_at, created_at, status
	`
	rp := &model.RedPocket{}
	err := r.db.Pool.QueryRow(ctx, query, id, claimAmount).Scan(
		&rp.ID, &rp.CampaignID, &rp.SenderName, &rp.SenderAvatar, &rp.Amount, &rp.RemainingAmount,
		&rp.Token, &rp.TokenAddress, &rp.ChainID, &rp.Platform, &rp.ChannelID, &rp.Message, &rp.Tag,
		&rp.TotalCount, &rp.ClaimedCount, &rp.IsLuckyDraw, &rp.MinAmount, &rp.MaxAmount,
		&rp.ExpiresAt, &rp.CreatedAt, &rp.Status,
	)
	if err != nil {
		return nil, err
	}
	return rp, nil
}

func (r *RedPocketRepository) UpdateStatus(ctx context.Context, id, status string) error {
	query := `UPDATE red_pockets SET status = $2 WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id, status)
	return err
}

func (r *RedPocketRepository) ListByCampaign(ctx context.Context, campaignID string, limit, offset int) ([]*model.RedPocket, error) {
	query := `
		SELECT id, campaign_id, sender_name, sender_avatar, amount, remaining_amount,
			token, token_address, chain_id, platform, channel_id, message, tag,
			total_count, claimed_count, is_lucky_draw, min_amount, max_amount,
			expires_at, created_at, status
		FROM red_pockets 
		WHERE campaign_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Pool.Query(ctx, query, campaignID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*model.RedPocket
	for rows.Next() {
		rp := &model.RedPocket{}
		err := rows.Scan(
			&rp.ID, &rp.CampaignID, &rp.SenderName, &rp.SenderAvatar, &rp.Amount, &rp.RemainingAmount,
			&rp.Token, &rp.TokenAddress, &rp.ChainID, &rp.Platform, &rp.ChannelID, &rp.Message, &rp.Tag,
			&rp.TotalCount, &rp.ClaimedCount, &rp.IsLuckyDraw, &rp.MinAmount, &rp.MaxAmount,
			&rp.ExpiresAt, &rp.CreatedAt, &rp.Status,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, rp)
	}
	return results, nil
}

// Expire old red pockets - run as cron job
func (r *RedPocketRepository) ExpireOld(ctx context.Context) (int64, error) {
	query := `
		UPDATE red_pockets 
		SET status = 'expired' 
		WHERE status = 'active' AND expires_at < $1
	`
	result, err := r.db.Pool.Exec(ctx, query, time.Now())
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}
