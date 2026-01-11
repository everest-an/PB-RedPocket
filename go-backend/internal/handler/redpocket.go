package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/protocolbank/redpocket-backend/internal/service"
)

type RedPocketHandler struct {
	svc *service.RedPocketService
}

func NewRedPocketHandler(svc *service.RedPocketService) *RedPocketHandler {
	return &RedPocketHandler{svc: svc}
}

func (h *RedPocketHandler) Create(c *gin.Context) {
	var req service.CreateRedPocketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rp, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Generate claim link - use the red pocket ID
	baseURL := "https://protocolbanks.com"
	claimLink := baseURL + "/claim/" + rp.ID

	// Platform-specific share links
	shareLinks := map[string]string{
		"telegram": "https://t.me/share/url?url=" + claimLink,
		"discord":  claimLink,
		"whatsapp": "https://wa.me/?text=" + claimLink,
		"github":   claimLink,
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"redPocket":  rp,
		"claimLink":  claimLink,
		"shareLink":  shareLinks[rp.Platform],
		"embedLink":  claimLink,
	})
}

func (h *RedPocketHandler) Claim(c *gin.Context) {
	var req service.ClaimRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.svc.Claim(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *RedPocketHandler) Get(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	rp, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "red pocket not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"redPocket": rp,
	})
}

// Enterprise endpoints
func (h *RedPocketHandler) ListCampaigns(c *gin.Context) {
	// TODO: Implement with campaign repository
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"campaigns": []interface{}{},
		"total":     0,
	})
}

func (h *RedPocketHandler) CreateCampaign(c *gin.Context) {
	// TODO: Implement
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *RedPocketHandler) ListClaims(c *gin.Context) {
	// TODO: Implement
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"claims":  []interface{}{},
		"total":   0,
	})
}

func (h *RedPocketHandler) Analytics(c *gin.Context) {
	// TODO: Implement
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{},
	})
}
