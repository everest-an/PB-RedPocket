package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/protocolbank/redpocket-backend/internal/service"
)

type WalletHandler struct {
	svc *service.WalletService
}

func NewWalletHandler(svc *service.WalletService) *WalletHandler {
	return &WalletHandler{svc: svc}
}

func (h *WalletHandler) GetOrCreate(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	chainIDStr := c.DefaultQuery("chainId", "8453")
	chainID, err := strconv.ParseInt(chainIDStr, 10, 64)
	if err != nil {
		chainID = 8453 // Default to Base
	}

	wallet, err := h.svc.GetOrCreate(c.Request.Context(), userID, chainID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"wallet":  wallet,
	})
}

func (h *WalletHandler) Withdraw(c *gin.Context) {
	var req struct {
		UserID  string  `json:"userId" binding:"required"`
		Amount  float64 `json:"amount" binding:"required,gt=0"`
		Address string  `json:"address" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement withdrawal logic
	// 1. Verify user owns the wallet
	// 2. Check balance
	// 3. Execute transfer to external address

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Withdrawal request submitted",
	})
}
