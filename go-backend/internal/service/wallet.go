package service

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/google/uuid"
	"github.com/protocolbank/redpocket-backend/internal/config"
	"github.com/protocolbank/redpocket-backend/internal/model"
	"github.com/protocolbank/redpocket-backend/internal/repository"
)

type WalletService struct {
	repo *repository.WalletRepository
	cfg  *config.Config
}

func NewWalletService(repo *repository.WalletRepository, cfg *config.Config) *WalletService {
	return &WalletService{repo: repo, cfg: cfg}
}

func (s *WalletService) GetOrCreate(ctx context.Context, userID string, chainID int64) (*model.Wallet, error) {
	// Try to get existing wallet
	wallet, err := s.repo.GetByUserID(ctx, userID, chainID)
	if err == nil {
		return wallet, nil
	}

	// Create new AA wallet
	return s.createAAWallet(ctx, userID, chainID)
}

func (s *WalletService) createAAWallet(ctx context.Context, userID string, chainID int64) (*model.Wallet, error) {
	// Generate new private key (owner key for AA wallet)
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		return nil, fmt.Errorf("failed to generate key: %w", err)
	}

	// Get public key and derive address
	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return nil, errors.New("failed to cast public key")
	}

	// For AA wallet, this is the owner address
	// The actual AA wallet address is computed from factory + owner + salt
	ownerAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// Compute AA wallet address (counterfactual)
	// In production, use actual AA SDK to compute this
	aaAddress := s.computeAAAddress(ownerAddress, chainID)

	// Encrypt private key before storing
	encryptedKey := hex.EncodeToString(crypto.FromECDSA(privateKey))
	// TODO: Use proper encryption (AES-GCM) with KMS in production

	wallet := &model.Wallet{
		ID:         "wallet_" + uuid.New().String()[:8],
		UserID:     userID,
		Address:    aaAddress.Hex(),
		ChainID:    chainID,
		Type:       "aa",
		IsDeployed: false, // Will be deployed on first transaction
		PrivateKey: encryptedKey,
		CreatedAt:  time.Now(),
	}

	if err := s.repo.Create(ctx, wallet); err != nil {
		return nil, fmt.Errorf("failed to save wallet: %w", err)
	}

	return wallet, nil
}

// Compute counterfactual AA wallet address
func (s *WalletService) computeAAAddress(owner common.Address, chainID int64) common.Address {
	// This is a simplified version
	// In production, use the actual AA factory contract's getAddress method
	// or compute using CREATE2 formula:
	// address = keccak256(0xff ++ factory ++ salt ++ keccak256(initCode))[12:]

	// For now, derive a deterministic address from owner
	salt := big.NewInt(0) // Use 0 as default salt
	data := append(owner.Bytes(), salt.Bytes()...)
	hash := crypto.Keccak256(data)

	return common.BytesToAddress(hash[12:])
}

// Transfer tokens using AA (gasless)
func (s *WalletService) TransferToken(ctx context.Context, wallet *model.Wallet, tokenAddress string, amount float64) (string, error) {
	// In production, this would:
	// 1. Build UserOperation for ERC20 transfer
	// 2. Sign with wallet owner key
	// 3. Submit to bundler with paymaster
	// 4. Wait for transaction confirmation

	// For now, return simulated tx hash
	// TODO: Implement actual AA transaction

	if s.cfg.BundlerURL == "" {
		// Simulation mode
		hash := crypto.Keccak256([]byte(fmt.Sprintf("%s:%s:%f:%d", wallet.Address, tokenAddress, amount, time.Now().UnixNano())))
		return "0x" + hex.EncodeToString(hash), nil
	}

	// Real implementation would go here
	// return s.executeAATransaction(ctx, wallet, tokenAddress, amount)

	return "", errors.New("AA transaction not implemented - configure BUNDLER_URL")
}

func (s *WalletService) GetByUserID(ctx context.Context, userID string, chainID int64) (*model.Wallet, error) {
	return s.repo.GetByUserID(ctx, userID, chainID)
}
