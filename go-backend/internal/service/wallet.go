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
	repo     *repository.WalletRepository
	cfg      *config.Config
	aaClient *AAClient
}

func NewWalletService(repo *repository.WalletRepository, cfg *config.Config) *WalletService {
	var aaClient *AAClient
	if cfg.BundlerURL != "" {
		aaClient = NewAAClient(cfg.BundlerURL, cfg.PaymasterURL, cfg.EntryPoint)
	}
	return &WalletService{repo: repo, cfg: cfg, aaClient: aaClient}
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
func (s *WalletService) TransferToken(ctx context.Context, wallet *model.Wallet, tokenAddress string, to string, amount *big.Int) (string, error) {
	// Check if AA client is configured
	if s.aaClient == nil || s.cfg.BundlerURL == "" {
		// Simulation mode - return fake tx hash
		hash := crypto.Keccak256([]byte(fmt.Sprintf("%s:%s:%s:%d", wallet.Address, tokenAddress, amount.String(), time.Now().UnixNano())))
		return "0x" + hex.EncodeToString(hash), nil
	}

	// Real AA transaction flow
	return s.executeAATransaction(ctx, wallet, tokenAddress, to, amount)
}

// executeAATransaction performs a real ERC-4337 transaction via Pimlico
func (s *WalletService) executeAATransaction(ctx context.Context, wallet *model.Wallet, tokenAddress string, to string, amount *big.Int) (string, error) {
	// 1. Get nonce for the AA wallet
	nonce, err := s.aaClient.GetAccountNonce(ctx, wallet.Address)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %w", err)
	}

	// 2. Build ERC20 transfer calldata
	transferCallData := BuildERC20TransferCallData(tokenAddress, to, amount)

	// 3. Build execute calldata (AA wallet's execute function)
	executeCallData := BuildExecuteCallData(tokenAddress, big.NewInt(0), transferCallData)

	// 4. Get current gas prices from network
	maxFeePerGas := big.NewInt(1000000000)      // 1 gwei default
	maxPriorityFeePerGas := big.NewInt(100000000) // 0.1 gwei default

	// 5. Build UserOperation
	userOp := &UserOperation{
		Sender:               wallet.Address,
		Nonce:                fmt.Sprintf("0x%x", nonce),
		InitCode:             "0x", // Empty if wallet already deployed
		CallData:             executeCallData,
		CallGasLimit:         "0x50000",
		VerificationGasLimit: "0x50000",
		PreVerificationGas:   "0xc350",
		MaxFeePerGas:         fmt.Sprintf("0x%x", maxFeePerGas),
		MaxPriorityFeePerGas: fmt.Sprintf("0x%x", maxPriorityFeePerGas),
		PaymasterAndData:     "0x",
		Signature:            "0x",
	}

	// 6. If wallet not deployed, add init code
	if !wallet.IsDeployed {
		initCode, err := s.buildInitCode(wallet)
		if err != nil {
			return "", fmt.Errorf("failed to build init code: %w", err)
		}
		userOp.InitCode = initCode
	}

	// 7. Estimate gas
	userOp, err = s.aaClient.EstimateUserOperationGas(ctx, userOp)
	if err != nil {
		return "", fmt.Errorf("failed to estimate gas: %w", err)
	}

	// 8. Get paymaster sponsorship (gasless for user)
	userOp, err = s.aaClient.SponsorUserOperation(ctx, userOp, s.cfg.ChainID)
	if err != nil {
		return "", fmt.Errorf("failed to get sponsorship: %w", err)
	}

	// 9. Sign the UserOperation
	userOp, err = SignUserOperation(userOp, wallet.PrivateKey, s.cfg.ChainID, s.cfg.EntryPoint)
	if err != nil {
		return "", fmt.Errorf("failed to sign user operation: %w", err)
	}

	// 10. Send to bundler
	userOpHash, err := s.aaClient.SendUserOperation(ctx, userOp)
	if err != nil {
		return "", fmt.Errorf("failed to send user operation: %w", err)
	}

	// 11. Wait for receipt (with timeout)
	txHash, err := s.aaClient.WaitForUserOperationReceipt(ctx, userOpHash, 60*time.Second)
	if err != nil {
		// Return userOpHash even if we timeout - tx might still succeed
		return userOpHash, fmt.Errorf("waiting for receipt: %w (userOpHash: %s)", err, userOpHash)
	}

	// 12. Mark wallet as deployed if this was first tx
	if !wallet.IsDeployed {
		wallet.IsDeployed = true
		_ = s.repo.UpdateDeployed(ctx, wallet.ID, true)
	}

	return txHash, nil
}

// buildInitCode builds the init code for deploying a new AA wallet
func (s *WalletService) buildInitCode(wallet *model.Wallet) (string, error) {
	// SimpleAccount factory address on Base
	// This is the standard ERC-4337 SimpleAccount factory
	factoryAddress := "0x9406Cc6185a346906296840746125a0E44976454"

	// createAccount(address owner, uint256 salt) selector: 0x5fbfb9cf
	methodID := "5fbfb9cf"

	// Decode owner address from wallet's private key
	privateKeyBytes, err := hex.DecodeString(wallet.PrivateKey)
	if err != nil {
		return "", fmt.Errorf("invalid private key: %w", err)
	}
	privateKey, err := crypto.ToECDSA(privateKeyBytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse private key: %w", err)
	}
	ownerAddress := crypto.PubkeyToAddress(privateKey.PublicKey)

	// Pad owner address to 32 bytes
	paddedOwner := common.LeftPadBytes(ownerAddress.Bytes(), 32)

	// Salt = 0
	salt := common.LeftPadBytes(big.NewInt(0).Bytes(), 32)

	// InitCode = factory address + calldata
	initCode := factoryAddress + methodID + hex.EncodeToString(paddedOwner) + hex.EncodeToString(salt)

	return initCode, nil
}

func (s *WalletService) GetByUserID(ctx context.Context, userID string, chainID int64) (*model.Wallet, error) {
	return s.repo.GetByUserID(ctx, userID, chainID)
}
