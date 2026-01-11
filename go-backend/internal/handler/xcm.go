package handler

import (
	"fmt"
	"math/big"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/protocolbank/redpocket-backend/internal/service"
)

type XCMHandler struct {
	bridge *service.XCMBridge
}

func NewXCMHandler(bridge *service.XCMBridge) *XCMHandler {
	return &XCMHandler{bridge: bridge}
}

// GetSupportedChains returns all supported blockchain networks
// GET /api/v1/xcm/chains
func (h *XCMHandler) GetSupportedChains(c *gin.Context) {
	chains := h.bridge.GetSupportedChains()
	c.JSON(http.StatusOK, gin.H{
		"chains": chains,
	})
}

// GetAssetInfo returns asset information across chains
// GET /api/v1/xcm/assets/:asset
func (h *XCMHandler) GetAssetInfo(c *gin.Context) {
	asset := c.Param("asset")
	
	chains := h.bridge.GetSupportedChains()
	assetInfo := make([]gin.H, 0)
	
	for _, chain := range chains {
		addr, err := h.bridge.GetAssetAddress(asset, chain.ChainID)
		if err == nil {
			assetInfo = append(assetInfo, gin.H{
				"chainId":   chain.ChainID,
				"chainName": chain.Name,
				"address":   addr,
			})
		}
	}
	
	if len(assetInfo) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "asset not found"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"asset":  asset,
		"chains": assetInfo,
	})
}

// GetOptimalChain returns the most cost-effective chain
// GET /api/v1/xcm/optimal-chain?asset=USDC
func (h *XCMHandler) GetOptimalChain(c *gin.Context) {
	asset := c.Query("asset")
	if asset == "" {
		asset = "USDC"
	}
	
	chainID, err := h.bridge.SelectOptimalChain(c.Request.Context(), asset, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	gasPrice, _ := h.bridge.GetChainGasPrice(c.Request.Context(), chainID)
	
	c.JSON(http.StatusOK, gin.H{
		"chainId":  chainID,
		"asset":    asset,
		"gasPrice": gasPrice.String(),
	})
}

type TransferRequest struct {
	FromChain int64  `json:"fromChain" binding:"required"`
	ToChain   int64  `json:"toChain" binding:"required"`
	Asset     string `json:"asset" binding:"required"`
	Amount    string `json:"amount" binding:"required"`
	Sender    string `json:"sender" binding:"required"`
	Recipient string `json:"recipient" binding:"required"`
}

// InitiateTransfer starts a cross-chain transfer
// POST /api/v1/xcm/transfer
func (h *XCMHandler) InitiateTransfer(c *gin.Context) {
	var req TransferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	amount := new(big.Int)
	amount.SetString(req.Amount, 10)
	
	result, err := h.bridge.TransferAsset(c.Request.Context(), &service.CrossChainTransferRequest{
		FromChain: service.ChainID(req.FromChain),
		ToChain:   service.ChainID(req.ToChain),
		Asset:     req.Asset,
		Amount:    amount,
		Sender:    req.Sender,
		Recipient: req.Recipient,
	})
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, result)
}

// GetTransferStatus checks transfer status
// GET /api/v1/xcm/transfer/:bridgeId
func (h *XCMHandler) GetTransferStatus(c *gin.Context) {
	bridgeId := c.Param("bridgeId")
	
	result, err := h.bridge.GetTransferStatus(c.Request.Context(), bridgeId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, result)
}

// GetBalance queries asset balance on a chain
// GET /api/v1/xcm/balance?chainId=8453&asset=USDC&account=0x...
func (h *XCMHandler) GetBalance(c *gin.Context) {
	chainIdStr := c.Query("chainId")
	asset := c.Query("asset")
	account := c.Query("account")
	
	if chainIdStr == "" || asset == "" || account == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "chainId, asset, and account are required"})
		return
	}
	
	var chainId int64
	if _, err := fmt.Sscanf(chainIdStr, "%d", &chainId); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chainId"})
		return
	}
	
	balance, err := h.bridge.GetAssetBalance(c.Request.Context(), service.ChainID(chainId), asset, account)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"chainId": chainId,
		"asset":   asset,
		"account": account,
		"balance": balance.String(),
	})
}

// EstimateFee estimates cross-chain transfer fee
// GET /api/v1/xcm/estimate-fee?fromChain=8453&toChain=137&asset=USDC&amount=1000000
func (h *XCMHandler) EstimateFee(c *gin.Context) {
	var fromChain, toChain int64
	fmt.Sscanf(c.Query("fromChain"), "%d", &fromChain)
	fmt.Sscanf(c.Query("toChain"), "%d", &toChain)
	asset := c.Query("asset")
	amountStr := c.Query("amount")
	
	if fromChain == 0 || toChain == 0 || asset == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "fromChain, toChain, and asset are required"})
		return
	}
	
	amount := new(big.Int)
	if amountStr != "" {
		amount.SetString(amountStr, 10)
	}
	
	fee, err := h.bridge.EstimateCrossChainFee(c.Request.Context(), service.ChainID(fromChain), service.ChainID(toChain), asset, amount)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"fromChain":    fromChain,
		"toChain":      toChain,
		"asset":        asset,
		"estimatedFee": fee.String(),
	})
}

// HealthCheck checks chain health status
// GET /api/v1/xcm/health/:chainId
func (h *XCMHandler) HealthCheck(c *gin.Context) {
	var chainId int64
	fmt.Sscanf(c.Param("chainId"), "%d", &chainId)
	
	healthy, err := h.bridge.ChainHealthCheck(c.Request.Context(), service.ChainID(chainId))
	
	status := "healthy"
	if err != nil || !healthy {
		status = "unhealthy"
	}
	
	gasPrice, _ := h.bridge.GetChainGasPrice(c.Request.Context(), service.ChainID(chainId))
	
	c.JSON(http.StatusOK, gin.H{
		"chainId":  chainId,
		"status":   status,
		"gasPrice": gasPrice.String(),
	})
}
