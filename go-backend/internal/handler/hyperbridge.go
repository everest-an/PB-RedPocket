package handler

import (
	"math/big"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/protocolbank/redpocket-backend/internal/service"
)

type HyperbridgeHandler struct {
	hyperbridge *service.HyperbridgeService
}

func NewHyperbridgeHandler(hyperbridge *service.HyperbridgeService) *HyperbridgeHandler {
	return &HyperbridgeHandler{hyperbridge: hyperbridge}
}

// GetMultiChainBalances returns balances across all chains in parallel
// GET /api/v1/bridge/balances?account=0x...&asset=USDC
func (h *HyperbridgeHandler) GetMultiChainBalances(c *gin.Context) {
	account := c.Query("account")
	asset := c.Query("asset")

	if account == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "account is required"})
		return
	}
	if asset == "" {
		asset = "USDC"
	}

	balances := h.hyperbridge.GetMultiChainBalances(c.Request.Context(), account, asset)

	c.JSON(http.StatusOK, gin.H{
		"account":  account,
		"asset":    asset,
		"balances": balances,
	})
}

// GetBridgeQuotes returns quotes from all bridge protocols
// GET /api/v1/bridge/quotes?fromChain=8453&toChain=1284&asset=USDC&amount=1000000
func (h *HyperbridgeHandler) GetBridgeQuotes(c *gin.Context) {
	var fromChain, toChain int64
	parseChainID(c.Query("fromChain"), &fromChain)
	parseChainID(c.Query("toChain"), &toChain)
	asset := c.Query("asset")
	amountStr := c.Query("amount")

	if fromChain == 0 || toChain == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fromChain and toChain are required"})
		return
	}
	if asset == "" {
		asset = "USDC"
	}

	amount := new(big.Int)
	if amountStr != "" {
		amount.SetString(amountStr, 10)
	} else {
		amount.SetInt64(1000000) // Default 1 USDC
	}

	quotes := h.hyperbridge.GetBridgeQuotes(
		c.Request.Context(),
		service.ChainID(fromChain),
		service.ChainID(toChain),
		asset,
		amount,
	)

	c.JSON(http.StatusOK, gin.H{
		"fromChain": fromChain,
		"toChain":   toChain,
		"asset":     asset,
		"amount":    amount.String(),
		"quotes":    quotes,
	})
}

type BridgeTransferRequest struct {
	FromChain int64  `json:"fromChain"`
	ToChain   int64  `json:"toChain" binding:"required"`
	Asset     string `json:"asset" binding:"required"`
	Amount    string `json:"amount" binding:"required"`
	Sender    string `json:"sender" binding:"required"`
	Recipient string `json:"recipient"`
	Protocol  string `json:"protocol"` // Optional: xcm, hyperbridge, snowbridge
}

// InitiateBridgeTransfer starts a cross-chain transfer
// POST /api/v1/bridge/transfer
func (h *HyperbridgeHandler) InitiateBridgeTransfer(c *gin.Context) {
	var req BridgeTransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Recipient == "" {
		req.Recipient = req.Sender
	}

	amount := new(big.Int)
	amount.SetString(req.Amount, 10)

	status, err := h.hyperbridge.InitiateHyperbridgeTransfer(c.Request.Context(), &service.CrossChainTransferRequest{
		FromChain: service.ChainID(req.FromChain),
		ToChain:   service.ChainID(req.ToChain),
		Asset:     req.Asset,
		Amount:    amount,
		Sender:    req.Sender,
		Recipient: req.Recipient,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"bridgeId":     status.BridgeID,
		"protocol":     status.Protocol,
		"sourceTxHash": status.SourceTxHash,
		"status":       status.Status,
		"estimatedTime": status.EstimatedTime,
	})
}

// GetBridgeStatus returns the status of a bridge transfer
// GET /api/v1/bridge/status/:bridgeId
func (h *HyperbridgeHandler) GetBridgeStatus(c *gin.Context) {
	bridgeID := c.Param("bridgeId")

	status, err := h.hyperbridge.GetTransferStatus(bridgeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, status)
}

type AutoBridgeRequest struct {
	Account     string `json:"account" binding:"required"`
	Asset       string `json:"asset" binding:"required"`
	Amount      string `json:"amount" binding:"required"`
	TargetChain int64  `json:"targetChain" binding:"required"`
}

// AutoBridge automatically finds best source and bridges
// POST /api/v1/bridge/auto
func (h *HyperbridgeHandler) AutoBridge(c *gin.Context) {
	var req AutoBridgeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	amount := new(big.Int)
	amount.SetString(req.Amount, 10)

	status, err := h.hyperbridge.AutoBridge(
		c.Request.Context(),
		req.Account,
		req.Asset,
		amount,
		service.ChainID(req.TargetChain),
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	if status.Status == "not_needed" {
		c.JSON(http.StatusOK, gin.H{
			"success":    true,
			"bridgeNeeded": false,
			"message":    "Asset already on target chain",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"bridgeNeeded":  true,
		"bridgeId":      status.BridgeID,
		"protocol":      status.Protocol,
		"fromChain":     status.FromChain,
		"toChain":       status.ToChain,
		"sourceTxHash":  status.SourceTxHash,
		"status":        status.Status,
		"estimatedTime": status.EstimatedTime,
	})
}

// FindBestSource finds the chain with highest balance
// GET /api/v1/bridge/best-source?account=0x...&asset=USDC&amount=1000000
func (h *HyperbridgeHandler) FindBestSource(c *gin.Context) {
	account := c.Query("account")
	asset := c.Query("asset")
	amountStr := c.Query("amount")

	if account == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "account is required"})
		return
	}
	if asset == "" {
		asset = "USDC"
	}

	amount := new(big.Int)
	if amountStr != "" {
		amount.SetString(amountStr, 10)
	} else {
		amount.SetInt64(0)
	}

	source, err := h.hyperbridge.FindBestSourceChain(c.Request.Context(), account, asset, amount)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"found": false,
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"found":     true,
		"chainId":   source.ChainID,
		"chainName": source.ChainName,
		"balance":   source.Balance,
		"asset":     source.Asset,
	})
}

func parseChainID(s string, out *int64) {
	if s == "" {
		return
	}
	var v int64
	for _, c := range s {
		if c >= '0' && c <= '9' {
			v = v*10 + int64(c-'0')
		}
	}
	*out = v
}
