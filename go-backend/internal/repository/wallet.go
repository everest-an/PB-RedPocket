package repository

import (
	"context"

	"github.com/protocolbank/redpocket-backend/internal/model"
)

type WalletRepository struct {
	db *PostgresDB
}

func NewWalletRepository(db *PostgresDB) *WalletRepository {
	return &WalletRepository{db: db}
}

func (r *WalletRepository) Create(ctx context.Context, w *model.Wallet) error {
	query := `
		INSERT INTO wallets (id, user_id, address, chain_id, type, is_deployed, private_key, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Pool.Exec(ctx, query,
		w.ID, w.UserID, w.Address, w.ChainID, w.Type, w.IsDeployed, w.PrivateKey, w.CreatedAt,
	)
	return err
}

func (r *WalletRepository) GetByUserID(ctx context.Context, userID string, chainID int64) (*model.Wallet, error) {
	query := `
		SELECT id, user_id, address, chain_id, type, is_deployed, private_key, created_at
		FROM wallets WHERE user_id = $1 AND chain_id = $2
	`
	w := &model.Wallet{}
	err := r.db.Pool.QueryRow(ctx, query, userID, chainID).Scan(
		&w.ID, &w.UserID, &w.Address, &w.ChainID, &w.Type, &w.IsDeployed, &w.PrivateKey, &w.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *WalletRepository) GetByAddress(ctx context.Context, address string) (*model.Wallet, error) {
	query := `
		SELECT id, user_id, address, chain_id, type, is_deployed, private_key, created_at
		FROM wallets WHERE address = $1
	`
	w := &model.Wallet{}
	err := r.db.Pool.QueryRow(ctx, query, address).Scan(
		&w.ID, &w.UserID, &w.Address, &w.ChainID, &w.Type, &w.IsDeployed, &w.PrivateKey, &w.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return w, nil
}

func (r *WalletRepository) UpdateDeployed(ctx context.Context, id string, deployed bool) error {
	query := `UPDATE wallets SET is_deployed = $2 WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id, deployed)
	return err
}

func (r *WalletRepository) ListByUser(ctx context.Context, userID string) ([]*model.Wallet, error) {
	query := `
		SELECT id, user_id, address, chain_id, type, is_deployed, private_key, created_at
		FROM wallets WHERE user_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var wallets []*model.Wallet
	for rows.Next() {
		w := &model.Wallet{}
		err := rows.Scan(
			&w.ID, &w.UserID, &w.Address, &w.ChainID, &w.Type, &w.IsDeployed, &w.PrivateKey, &w.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		wallets = append(wallets, w)
	}
	return wallets, nil
}
