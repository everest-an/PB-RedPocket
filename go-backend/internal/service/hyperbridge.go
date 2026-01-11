package service

import (
	"context"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"
)

// BridgeProtocol represents supported bridge protocols
type BridgeProtocol string

const (
	ProtocolXCM         BridgeProtocol = "xcm"
	ProtocolHyperbridge BridgeProtocol = "hyperbridge"
	ProtocolSnowbridge  BridgeProtocol = "snowbridge"
)

// HyperbridgeService handles Polkadot Hyperbridge operations
type HyperbridgeService struct {
	httpClient    *http.Client
	xcmBridge     *XCMBridge
	mu            sync.RWMutex
	transferCache map[string]*BridgeTransferStatus
}

// BridgeTransferStatus tracks cross-chain transfer status
type BridgeTransferStatus struct {
	BridgeID      string         `json:"bridgeId"`
	Protocol      BridgeProtocol `json:"protocol"`
	FromChain     ChainID        `json:"fromChain"`
	ToChain       ChainID        `json:"toChain"`
	Asset         string         `json:"asset"`
	Amount        string         `json:"amount"`
	Sender        string         `json:"sender"`
	Recipient     string         `json:"recipient"`
	SourceTxHash  string         `json:"sourceTxHash,omitempty"`
	DestTxHash    string         `json:"destTxHash,omitempty"`
	Status        string         `json:"status"` // pending, confirming, relaying, completed, failed
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	EstimatedTime int            `json:"estimatedTimeSeconds"`
	Error         string         `json:"error,omitempty"`
}

// MultiChainBalance holds balance info across multiple chains
type MultiChainBalance struct {
	ChainID   ChainID `json:"chainId"`
	ChainName string  `json:"chainName"`
	Asset     string  `json:"asset"`
	Balance   string  `json:"balance"`
	Decimals  int     `json:"decimals"`
	Error     string  `json:"error,omitempty"`
}

// BridgeQuote represents a quote for cross-chain transfer
type BridgeQuote struct {
	Protocol      BridgeProtocol `json:"protocol"`
	ProtocolName  string         `json:"protocolName"`
	FromChain     ChainID        `json:"fromChain"`
	ToChain       ChainID        `json:"toChain"`
	Asset         string         `json:"asset"`
	Amount        string         `json:"amount"`
	Fee           string         `json:"fee"`
	FeeUSD        string         `json:"feeUsd"`
	EstimatedTime int            `json:"estimatedTimeSeconds"`
	Available     bool           `json:"available"`
	Reason        string         `json:"reason,omitempty"`
}

func NewHyperbridgeService(xcmBridge *XCMBridge) *HyperbridgeService {
	return &HyperbridgeService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		xcmBridge:     xcmBridge,
		transferCache: make(map[string]*BridgeTransferStatus),
	}
}

// GetMultiChainBalances queries balances across all supported chains in parallel
func (h *HyperbridgeService) GetMultiChainBalances(ctx context.Context, account string, asset string) []MultiChainBalance {
	chains := h.xcmBridge.GetSupportedChains()
	results := make([]MultiChainBalance, len(chains))
	var wg sync.WaitGroup

	for i, chain := range chains {
		wg.Add(1)
		go func(idx int, chainInfo ChainInfo) {
			defer wg.Done()

			result := MultiChainBalance{
				ChainID:   chainInfo.ChainID,
				ChainName: chainInfo.Name,
				Asset:     asset,
				Decimals:  6, // USDC/USDT decimals
			}

			// Check if asset exists on this chain
			if _, err := h.xcmBridge.GetAssetAddress(asset, chainInfo.ChainID); err != nil {
				result.Error = "Asset not available"
				result.Balance = "0"
				results[idx] = result
				return
			}

			balance, err := h.xcmBridge.GetAssetBalance(ctx, chainInfo.ChainID, asset, account)
			if err != nil {
				result.Error = err.Error()
				result.Balance = "0"
			} else {
				result.Balance = balance.String()
			}
			results[idx] = result
		}(i, chain)
	}

	wg.Wait()
	return results
}

// GetBridgeQuotes returns quotes from all available bridge protocols
func (h *HyperbridgeService) GetBridgeQuotes(ctx context.Context, fromChain, toChain ChainID, asset string, amount *big.Int) []BridgeQuote {
	quotes := make([]BridgeQuote, 0, 3)
	var wg sync.WaitGroup
	var mu sync.Mutex

	protocols := []struct {
		protocol BridgeProtocol
		name     string
	}{
		{ProtocolXCM, "XCM (Cross-Consensus Messaging)"},
		{ProtocolHyperbridge, "Polkadot Hyperbridge"},
		{ProtocolSnowbridge, "Snowbridge (ETH ↔ DOT)"},
	}

	for _, p := range protocols {
		wg.Add(1)
		go func(proto BridgeProtocol, protoName string) {
			defer wg.Done()

			quote := h.calculateQuote(ctx, proto, protoName, fromChain, toChain, asset, amount)

			mu.Lock()
			quotes = append(quotes, quote)
			mu.Unlock()
		}(p.protocol, p.name)
	}

	wg.Wait()
	return quotes
}


// calculateQuote calculates a quote for a specific protocol
func (h *HyperbridgeService) calculateQuote(ctx context.Context, protocol BridgeProtocol, name string, fromChain, toChain ChainID, asset string, amount *big.Int) BridgeQuote {
	quote := BridgeQuote{
		Protocol:     protocol,
		ProtocolName: name,
		FromChain:    fromChain,
		ToChain:      toChain,
		Asset:        asset,
		Amount:       amount.String(),
	}

	isFromPolkadot := h.xcmBridge.isPolkadotChain(fromChain)
	isToPolkadot := h.xcmBridge.isPolkadotChain(toChain)
	isFromEthereum := fromChain == ChainEthereum

	switch protocol {
	case ProtocolXCM:
		// XCM only works within Polkadot ecosystem
		if isFromPolkadot && isToPolkadot {
			quote.Available = true
			quote.Fee = "10000000000"      // 0.01 DOT
			quote.FeeUSD = "0.05"
			quote.EstimatedTime = 30
		} else {
			quote.Available = false
			quote.Reason = "XCM only supports Polkadot parachain transfers"
		}

	case ProtocolHyperbridge:
		// Hyperbridge connects EVM chains to Polkadot
		if (!isFromPolkadot && isToPolkadot) || (isFromPolkadot && !isToPolkadot) {
			quote.Available = true
			quote.Fee = "100000000000000000" // 0.1 ETH equivalent
			quote.FeeUSD = "0.30"
			quote.EstimatedTime = 120
		} else if !isFromPolkadot && !isToPolkadot {
			// EVM to EVM via Hyperbridge relay
			quote.Available = true
			quote.Fee = "50000000000000000"
			quote.FeeUSD = "0.15"
			quote.EstimatedTime = 90
		} else {
			quote.Available = false
			quote.Reason = "Use XCM for Polkadot-to-Polkadot transfers"
		}

	case ProtocolSnowbridge:
		// Snowbridge specifically for Ethereum mainnet <-> Polkadot
		if (isFromEthereum && isToPolkadot) || (isFromPolkadot && toChain == ChainEthereum) {
			quote.Available = true
			quote.Fee = "1000000000000000000" // ~1 ETH worth
			quote.FeeUSD = "3.00"
			quote.EstimatedTime = 900 // 15 minutes
		} else {
			quote.Available = false
			quote.Reason = "Snowbridge only supports Ethereum ↔ Polkadot"
		}
	}

	return quote
}

// SelectBestProtocol automatically selects the optimal bridge protocol
func (h *HyperbridgeService) SelectBestProtocol(fromChain, toChain ChainID) BridgeProtocol {
	isFromPolkadot := h.xcmBridge.isPolkadotChain(fromChain)
	isToPolkadot := h.xcmBridge.isPolkadotChain(toChain)

	// Polkadot internal: use XCM
	if isFromPolkadot && isToPolkadot {
		return ProtocolXCM
	}

	// Ethereum mainnet to Polkadot: use Snowbridge
	if fromChain == ChainEthereum && isToPolkadot {
		return ProtocolSnowbridge
	}

	// Default: Hyperbridge for EVM <-> Polkadot
	return ProtocolHyperbridge
}

// InitiateHyperbridgeTransfer starts a transfer via Hyperbridge
func (h *HyperbridgeService) InitiateHyperbridgeTransfer(ctx context.Context, req *CrossChainTransferRequest) (*BridgeTransferStatus, error) {
	protocol := h.SelectBestProtocol(req.FromChain, req.ToChain)
	bridgeID := fmt.Sprintf("%s_%d_%d_%d", protocol, time.Now().UnixNano(), req.FromChain, req.ToChain)

	status := &BridgeTransferStatus{
		BridgeID:      bridgeID,
		Protocol:      protocol,
		FromChain:     req.FromChain,
		ToChain:       req.ToChain,
		Asset:         req.Asset,
		Amount:        req.Amount.String(),
		Sender:        req.Sender,
		Recipient:     req.Recipient,
		Status:        "pending",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
		EstimatedTime: h.getEstimatedTime(protocol),
	}

	// Execute based on protocol
	var err error
	switch protocol {
	case ProtocolXCM:
		err = h.executeXCMTransfer(ctx, req, status)
	case ProtocolHyperbridge:
		err = h.executeHyperbridgeTransfer(ctx, req, status)
	case ProtocolSnowbridge:
		err = h.executeSnowbridgeTransfer(ctx, req, status)
	}

	if err != nil {
		status.Status = "failed"
		status.Error = err.Error()
	}

	// Cache the status
	h.mu.Lock()
	h.transferCache[bridgeID] = status
	h.mu.Unlock()

	return status, err
}

func (h *HyperbridgeService) getEstimatedTime(protocol BridgeProtocol) int {
	switch protocol {
	case ProtocolXCM:
		return 30
	case ProtocolHyperbridge:
		return 120
	case ProtocolSnowbridge:
		return 900
	default:
		return 180
	}
}

// executeXCMTransfer handles XCM protocol transfers
func (h *HyperbridgeService) executeXCMTransfer(ctx context.Context, req *CrossChainTransferRequest, status *BridgeTransferStatus) error {
	// Build XCM v3 message
	// In production: use substrate-go or polkadot-api
	
	status.Status = "confirming"
	status.SourceTxHash = fmt.Sprintf("0x%x", time.Now().UnixNano())
	
	// Simulate async confirmation
	go func() {
		time.Sleep(30 * time.Second)
		h.mu.Lock()
		if s, ok := h.transferCache[status.BridgeID]; ok {
			s.Status = "completed"
			s.DestTxHash = fmt.Sprintf("0x%x", time.Now().UnixNano())
			s.UpdatedAt = time.Now()
		}
		h.mu.Unlock()
	}()

	return nil
}

// executeHyperbridgeTransfer handles Hyperbridge protocol transfers
func (h *HyperbridgeService) executeHyperbridgeTransfer(ctx context.Context, req *CrossChainTransferRequest, status *BridgeTransferStatus) error {
	// Hyperbridge uses ISMP (Interoperable State Machine Protocol)
	// Steps:
	// 1. Lock tokens on source chain
	// 2. Generate state proof
	// 3. Submit proof to Hyperbridge
	// 4. Mint/unlock on destination chain

	status.Status = "confirming"
	status.SourceTxHash = fmt.Sprintf("0x%x", time.Now().UnixNano())

	// Simulate the multi-step process
	go func() {
		// Step 1: Confirming on source
		time.Sleep(30 * time.Second)
		h.updateStatus(status.BridgeID, "relaying", "")

		// Step 2: Relaying via Hyperbridge
		time.Sleep(60 * time.Second)
		h.updateStatus(status.BridgeID, "completed", fmt.Sprintf("0x%x", time.Now().UnixNano()))
	}()

	return nil
}

// executeSnowbridgeTransfer handles Snowbridge protocol transfers
func (h *HyperbridgeService) executeSnowbridgeTransfer(ctx context.Context, req *CrossChainTransferRequest, status *BridgeTransferStatus) error {
	// Snowbridge uses light client verification
	// Ethereum -> Polkadot: ~15 min (Ethereum finality)
	// Polkadot -> Ethereum: ~30 min (Polkadot finality + Ethereum confirmation)

	status.Status = "confirming"
	status.SourceTxHash = fmt.Sprintf("0x%x", time.Now().UnixNano())

	go func() {
		// Ethereum finality wait
		time.Sleep(5 * time.Minute)
		h.updateStatus(status.BridgeID, "relaying", "")

		// Cross-chain relay
		time.Sleep(10 * time.Minute)
		h.updateStatus(status.BridgeID, "completed", fmt.Sprintf("0x%x", time.Now().UnixNano()))
	}()

	return nil
}

func (h *HyperbridgeService) updateStatus(bridgeID, status, destTxHash string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if s, ok := h.transferCache[bridgeID]; ok {
		s.Status = status
		s.UpdatedAt = time.Now()
		if destTxHash != "" {
			s.DestTxHash = destTxHash
		}
	}
}

// GetTransferStatus returns the current status of a transfer
func (h *HyperbridgeService) GetTransferStatus(bridgeID string) (*BridgeTransferStatus, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	status, ok := h.transferCache[bridgeID]
	if !ok {
		return nil, fmt.Errorf("transfer not found: %s", bridgeID)
	}
	return status, nil
}

// FindBestSourceChain finds the chain with highest balance for an asset
func (h *HyperbridgeService) FindBestSourceChain(ctx context.Context, account, asset string, requiredAmount *big.Int) (*MultiChainBalance, error) {
	balances := h.GetMultiChainBalances(ctx, account, asset)

	var best *MultiChainBalance
	var bestBalance *big.Int

	for i := range balances {
		b := &balances[i]
		if b.Error != "" {
			continue
		}

		balance := new(big.Int)
		balance.SetString(b.Balance, 10)

		// Must have enough balance
		if balance.Cmp(requiredAmount) < 0 {
			continue
		}

		// Prefer higher balance
		if bestBalance == nil || balance.Cmp(bestBalance) > 0 {
			best = b
			bestBalance = balance
		}
	}

	if best == nil {
		return nil, fmt.Errorf("no chain has sufficient %s balance", asset)
	}

	return best, nil
}

// AutoBridge automatically bridges assets from best source to target chain
func (h *HyperbridgeService) AutoBridge(ctx context.Context, account, asset string, amount *big.Int, targetChain ChainID) (*BridgeTransferStatus, error) {
	// Find best source chain
	source, err := h.FindBestSourceChain(ctx, account, asset, amount)
	if err != nil {
		return nil, err
	}

	// If already on target chain, no bridge needed
	if source.ChainID == targetChain {
		return &BridgeTransferStatus{
			Status: "not_needed",
			FromChain: source.ChainID,
			ToChain: targetChain,
		}, nil
	}

	// Initiate bridge
	return h.InitiateHyperbridgeTransfer(ctx, &CrossChainTransferRequest{
		FromChain: source.ChainID,
		ToChain:   targetChain,
		Asset:     asset,
		Amount:    amount,
		Sender:    account,
		Recipient: account,
	})
}
