package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/protocolbank/redpocket-backend/internal/service"
)

type CampaignHandler struct {
	svc *service.CampaignService
}

func NewCampaignHandler(svc *service.CampaignService) *CampaignHandler {
	return &CampaignHandler{svc: svc}
}

func (h *CampaignHandler) Create(c *gin.Context) {
	var req service.CreateCampaignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get enterprise ID from auth context
	enterpriseID, exists := c.Get("enterpriseId")
	if exists {
		req.EnterpriseID = enterpriseID.(string)
	} else {
		req.EnterpriseID = "enterprise_default"
	}

	campaign, err := h.svc.Create(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"campaign": campaign,
	})
}

func (h *CampaignHandler) Get(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}

	campaign, err := h.svc.Get(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "campaign not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"campaign": campaign,
	})
}

func (h *CampaignHandler) List(c *gin.Context) {
	// Get enterprise ID from auth context
	enterpriseID := "enterprise_default"
	if id, exists := c.Get("enterpriseId"); exists {
		enterpriseID = id.(string)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	campaigns, total, err := h.svc.List(c.Request.Context(), enterpriseID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"campaigns": campaigns,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

func (h *CampaignHandler) UpdateStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.UpdateStatus(c.Request.Context(), id, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *CampaignHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.svc.Delete(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *CampaignHandler) ListClaims(c *gin.Context) {
	campaignID := c.Query("campaignId")
	if campaignID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "campaignId is required"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	claims, total, err := h.svc.GetClaims(c.Request.Context(), campaignID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"claims":  claims,
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func (h *CampaignHandler) Analytics(c *gin.Context) {
	// Get enterprise ID from auth context
	enterpriseID := "enterprise_default"
	if id, exists := c.Get("enterpriseId"); exists {
		enterpriseID = id.(string)
	}

	analytics, err := h.svc.GetAnalytics(c.Request.Context(), enterpriseID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    analytics,
	})
}
