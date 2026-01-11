package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"time"

	"github.com/protocolbank/redpocket-backend/internal/config"
)

// ChainID represents supported blockchain networks
type ChainID int

const (
	ChainBase      ChainID = 8453
	ChainPolygon   ChainID = 137
	ChainEthereum  ChainID = 1
	ChainMoonbeam  ChainID = 1284
	ChainAcala     ChainID = 787
	ChainAstar     ChainID = 592
	ChainPolkadot  ChainID = 0 // Relay chain
)

// XCMMessage represents a cross-chain message
type XCMMessage struct {
	Version     int         `json:"version"`
	MessageType string      `json:"messageType"`
	Origin      ChainID     `json:"origin"`
	Destination ChainID     `json:"destination"`
	Payload     interface{} `json:"payload"`
	Nonce       uint64      `json:"nonce"`
}

// AssetTransferPayload for cross-chain asset transfers
type AssetTransferPayload struct {
	Asset     string `json:"asset"`
	Amount    string `json:"amount"`
	Recipient string `json:"recipient"`
	Memo      string `json:"memo,omitempty"`
}

// XCMBridge handles cross-chain operations
type XCMBridge struct {
	cfg        *config.Config
	httpClient *http.Client
	chainRPCs  map[ChainID]string
	assetMap   map[string]map[ChainID]string // asset -> chain -> address
}

// ChainInfo contains chain-specific information
type ChainInfo struct {
	ChainID     ChainID
	Name        string
	RpcURL      string
	ExplorerURL string
	GasPrice    *big.Int
	IsEVM       bool
	IsPolkadot  bool
}

func NewXCMBridge(cfg *config.Config) *XCMBridge {
	bridge := &XCMBridge{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		chainRPCs: make(map[ChainID]string),
		assetMap:  make(map[string]map[ChainID]string),
	}

	// Initialize chain RPCs
	bridge.chainRPCs[ChainBase] = cfg.RPCUrl
	bridge.chainRPCs[ChainPolygon] = "https://polygon-rpc.com"
	bridge.chainRPCs[ChainEthereum] = "https://eth.llamarpc.com"
	bridge.chainRPCs[ChainMoonbeam] = "https://rpc.api.moonbeam.network"
	bridge.chainRPCs[ChainAcala] = "https://acala-rpc.dwellir.com"
	bridge.chainRPCs[ChainAstar] = "https://astar.api.onfinality.io/public"

	// Initialize asset mappings (USDC addresses on different chains)
	bridge.assetMap["USDC"] = map[ChainID]string{
		ChainBase:     "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
		ChainPolygon:  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
		ChainEthereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
		ChainMoonbeam: "0x931715FEE2d06333043d11F658C8CE934aC61D0c",
	}

	bridge.assetMap["USDT"] = map[ChainID]string{
		ChainBase:     "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
		ChainPolygon:  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
		ChainEthereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
	}

	return bridge
}


// GetSupportedChains returns all supported chains
func (b *XCMBridge) GetSupportedChains() []ChainInfo {
	return []ChainInfo{
		{ChainID: ChainBase, Name: "Base", RpcURL: b.chainRPCs[ChainBase], ExplorerURL: "https://basescan.org", IsEVM: true},
		{ChainID: ChainPolygon, Name: "Polygon", RpcURL: b.chainRPCs[ChainPolygon], ExplorerURL: "https://polygonscan.com", IsEVM: true},
		{ChainID: ChainEthereum, Name: "Ethereum", RpcURL: b.chainRPCs[ChainEthereum], ExplorerURL: "https://etherscan.io", IsEVM: true},
		{ChainID: ChainMoonbeam, Name: "Moonbeam", RpcURL: b.chainRPCs[ChainMoonbeam], ExplorerURL: "https://moonbeam.moonscan.io", IsEVM: true, IsPolkadot: true},
		{ChainID: ChainAcala, Name: "Acala", RpcURL: b.chainRPCs[ChainAcala], ExplorerURL: "https://acala.subscan.io", IsPolkadot: true},
		{ChainID: ChainAstar, Name: "Astar", RpcURL: b.chainRPCs[ChainAstar], ExplorerURL: "https://astar.subscan.io", IsEVM: true, IsPolkadot: true},
	}
}

// GetAssetAddress returns the token address for an asset on a specific chain
func (b *XCMBridge) GetAssetAddress(asset string, chainID ChainID) (string, error) {
	chainMap, ok := b.assetMap[asset]
	if !ok {
		return "", fmt.Errorf("unsupported asset: %s", asset)
	}
	addr, ok := chainMap[chainID]
	if !ok {
		return "", fmt.Errorf("asset %s not available on chain %d", asset, chainID)
	}
	return addr, nil
}

// GetChainGasPrice fetches current gas price for a chain
func (b *XCMBridge) GetChainGasPrice(ctx context.Context, chainID ChainID) (*big.Int, error) {
	rpcURL, ok := b.chainRPCs[chainID]
	if !ok {
		return nil, fmt.Errorf("unsupported chain: %d", chainID)
	}

	req := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_gasPrice",
		"params":  []interface{}{},
		"id":      1,
	}

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", rpcURL, bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(httpReq)
	if err != nil {
		return big.NewInt(1000000000), nil // Default 1 gwei
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result struct {
		Result string `json:"result"`
	}
	json.Unmarshal(respBody, &result)

	gasPrice := new(big.Int)
	if result.Result != "" && len(result.Result) > 2 {
		gasPrice.SetString(result.Result[2:], 16)
	} else {
		gasPrice.SetInt64(1000000000)
	}

	return gasPrice, nil
}

// SelectOptimalChain selects the most cost-effective chain for a transaction
func (b *XCMBridge) SelectOptimalChain(ctx context.Context, asset string, preferredChains []ChainID) (ChainID, error) {
	if len(preferredChains) == 0 {
		preferredChains = []ChainID{ChainBase, ChainPolygon, ChainMoonbeam}
	}

	var bestChain ChainID
	var lowestGas *big.Int

	for _, chainID := range preferredChains {
		// Check if asset is available on this chain
		if _, err := b.GetAssetAddress(asset, chainID); err != nil {
			continue
		}

		gasPrice, err := b.GetChainGasPrice(ctx, chainID)
		if err != nil {
			continue
		}

		if lowestGas == nil || gasPrice.Cmp(lowestGas) < 0 {
			lowestGas = gasPrice
			bestChain = chainID
		}
	}

	if lowestGas == nil {
		return ChainBase, nil // Default to Base
	}

	return bestChain, nil
}


// CrossChainTransfer executes a cross-chain asset transfer
type CrossChainTransferRequest struct {
	FromChain ChainID
	ToChain   ChainID
	Asset     string
	Amount    *big.Int
	Sender    string
	Recipient string
}

type CrossChainTransferResult struct {
	Success       bool   `json:"success"`
	SourceTxHash  string `json:"sourceTxHash"`
	DestTxHash    string `json:"destTxHash,omitempty"`
	BridgeId      string `json:"bridgeId"`
	EstimatedTime int    `json:"estimatedTimeSeconds"`
	Status        string `json:"status"`
}

// TransferAsset initiates a cross-chain asset transfer
func (b *XCMBridge) TransferAsset(ctx context.Context, req *CrossChainTransferRequest) (*CrossChainTransferResult, error) {
	// Validate chains and asset
	if _, err := b.GetAssetAddress(req.Asset, req.FromChain); err != nil {
		return nil, fmt.Errorf("source chain error: %w", err)
	}
	if _, err := b.GetAssetAddress(req.Asset, req.ToChain); err != nil {
		return nil, fmt.Errorf("destination chain error: %w", err)
	}

	// Determine bridge type based on chains
	if b.isPolkadotChain(req.FromChain) && b.isPolkadotChain(req.ToChain) {
		return b.executeXCMTransfer(ctx, req)
	} else if b.isEVMChain(req.FromChain) && b.isEVMChain(req.ToChain) {
		return b.executeLayerZeroTransfer(ctx, req)
	} else {
		// Cross-ecosystem transfer (EVM <-> Polkadot)
		return b.executeCrossEcosystemTransfer(ctx, req)
	}
}

func (b *XCMBridge) isPolkadotChain(chainID ChainID) bool {
	return chainID == ChainMoonbeam || chainID == ChainAcala || chainID == ChainAstar || chainID == ChainPolkadot
}

func (b *XCMBridge) isEVMChain(chainID ChainID) bool {
	return chainID == ChainBase || chainID == ChainPolygon || chainID == ChainEthereum || chainID == ChainMoonbeam || chainID == ChainAstar
}

// executeXCMTransfer handles Polkadot ecosystem transfers via XCM
func (b *XCMBridge) executeXCMTransfer(ctx context.Context, req *CrossChainTransferRequest) (*CrossChainTransferResult, error) {
	// Build XCM message
	xcmMsg := &XCMMessage{
		Version:     3, // XCM v3
		MessageType: "TransferAsset",
		Origin:      req.FromChain,
		Destination: req.ToChain,
		Payload: AssetTransferPayload{
			Asset:     req.Asset,
			Amount:    req.Amount.String(),
			Recipient: req.Recipient,
		},
		Nonce: uint64(time.Now().UnixNano()),
	}

	// In production, this would:
	// 1. Connect to Polkadot.js API
	// 2. Build XCM extrinsic
	// 3. Sign and submit transaction
	// 4. Wait for confirmation on both chains

	// For now, simulate the transfer
	bridgeId := fmt.Sprintf("xcm_%d_%d", time.Now().UnixNano(), req.FromChain)
	
	return &CrossChainTransferResult{
		Success:       true,
		SourceTxHash:  fmt.Sprintf("0x%x", xcmMsg.Nonce),
		BridgeId:      bridgeId,
		EstimatedTime: 60, // ~1 minute for XCM
		Status:        "pending",
	}, nil
}

// executeLayerZeroTransfer handles EVM chain transfers via LayerZero
func (b *XCMBridge) executeLayerZeroTransfer(ctx context.Context, req *CrossChainTransferRequest) (*CrossChainTransferResult, error) {
	// LayerZero OFT (Omnichain Fungible Token) transfer
	// In production, this would:
	// 1. Call LayerZero endpoint contract
	// 2. Estimate fees
	// 3. Execute sendFrom on OFT contract
	// 4. Track message delivery

	bridgeId := fmt.Sprintf("lz_%d_%d", time.Now().UnixNano(), req.FromChain)

	return &CrossChainTransferResult{
		Success:       true,
		SourceTxHash:  fmt.Sprintf("0x%x", time.Now().UnixNano()),
		BridgeId:      bridgeId,
		EstimatedTime: 120, // ~2 minutes for LayerZero
		Status:        "pending",
	}, nil
}

// executeCrossEcosystemTransfer handles transfers between EVM and Polkadot
func (b *XCMBridge) executeCrossEcosystemTransfer(ctx context.Context, req *CrossChainTransferRequest) (*CrossChainTransferResult, error) {
	// Cross-ecosystem transfers go through Moonbeam as a bridge
	// EVM -> Moonbeam -> Polkadot parachain (or reverse)

	bridgeId := fmt.Sprintf("cross_%d_%d_%d", time.Now().UnixNano(), req.FromChain, req.ToChain)

	return &CrossChainTransferResult{
		Success:       true,
		SourceTxHash:  fmt.Sprintf("0x%x", time.Now().UnixNano()),
		BridgeId:      bridgeId,
		EstimatedTime: 180, // ~3 minutes for cross-ecosystem
		Status:        "pending",
	}, nil
}


// GetTransferStatus checks the status of a cross-chain transfer
func (b *XCMBridge) GetTransferStatus(ctx context.Context, bridgeId string) (*CrossChainTransferResult, error) {
	// In production, query the bridge protocol for status
	// For now, return completed status
	return &CrossChainTransferResult{
		Success:  true,
		BridgeId: bridgeId,
		Status:   "completed",
	}, nil
}

// GetAssetBalance queries balance on a specific chain
func (b *XCMBridge) GetAssetBalance(ctx context.Context, chainID ChainID, asset string, account string) (*big.Int, error) {
	tokenAddr, err := b.GetAssetAddress(asset, chainID)
	if err != nil {
		return nil, err
	}

	rpcURL, ok := b.chainRPCs[chainID]
	if !ok {
		return nil, fmt.Errorf("unsupported chain: %d", chainID)
	}

	// ERC20 balanceOf call
	// balanceOf(address) selector: 0x70a08231
	callData := "0x70a08231000000000000000000000000" + account[2:] // Remove 0x prefix

	req := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_call",
		"params": []interface{}{
			map[string]string{
				"to":   tokenAddr,
				"data": callData,
			},
			"latest",
		},
		"id": 1,
	}

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", rpcURL, bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(httpReq)
	if err != nil {
		return big.NewInt(0), nil
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result struct {
		Result string `json:"result"`
	}
	json.Unmarshal(respBody, &result)

	balance := new(big.Int)
	if result.Result != "" && len(result.Result) > 2 {
		balance.SetString(result.Result[2:], 16)
	}

	return balance, nil
}

// EstimateCrossChainFee estimates the fee for a cross-chain transfer
func (b *XCMBridge) EstimateCrossChainFee(ctx context.Context, fromChain, toChain ChainID, asset string, amount *big.Int) (*big.Int, error) {
	// Base fee estimation
	baseFee := big.NewInt(0)

	if b.isPolkadotChain(fromChain) && b.isPolkadotChain(toChain) {
		// XCM fee: ~0.01 DOT equivalent
		baseFee.SetString("10000000000", 10) // 0.01 DOT in planck
	} else if b.isEVMChain(fromChain) && b.isEVMChain(toChain) {
		// LayerZero fee: gas + protocol fee
		gasPrice, _ := b.GetChainGasPrice(ctx, fromChain)
		gasLimit := big.NewInt(200000)
		baseFee.Mul(gasPrice, gasLimit)
	} else {
		// Cross-ecosystem: higher fee
		gasPrice, _ := b.GetChainGasPrice(ctx, fromChain)
		gasLimit := big.NewInt(500000)
		baseFee.Mul(gasPrice, gasLimit)
	}

	return baseFee, nil
}

// ChainHealthCheck checks if a chain is healthy and not congested
func (b *XCMBridge) ChainHealthCheck(ctx context.Context, chainID ChainID) (bool, error) {
	rpcURL, ok := b.chainRPCs[chainID]
	if !ok {
		return false, fmt.Errorf("unsupported chain: %d", chainID)
	}

	req := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_blockNumber",
		"params":  []interface{}{},
		"id":      1,
	}

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", rpcURL, bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(httpReq)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return false, fmt.Errorf("chain unhealthy: status %d", resp.StatusCode)
	}

	return true, nil
}

// AutoSelectChainWithFailover selects optimal chain with automatic failover
func (b *XCMBridge) AutoSelectChainWithFailover(ctx context.Context, asset string) (ChainID, error) {
	preferredOrder := []ChainID{ChainBase, ChainPolygon, ChainMoonbeam, ChainEthereum}

	for _, chainID := range preferredOrder {
		// Check asset availability
		if _, err := b.GetAssetAddress(asset, chainID); err != nil {
			continue
		}

		// Check chain health
		healthy, err := b.ChainHealthCheck(ctx, chainID)
		if err != nil || !healthy {
			continue
		}

		// Check gas price (skip if too high)
		gasPrice, _ := b.GetChainGasPrice(ctx, chainID)
		maxGas := big.NewInt(100000000000) // 100 gwei threshold
		if gasPrice.Cmp(maxGas) > 0 {
			continue
		}

		return chainID, nil
	}

	// Fallback to Base
	return ChainBase, nil
}
