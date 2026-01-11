package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/protocolbank/redpocket-backend/internal/bot"
)

type BotHandler struct {
	telegramBot *bot.TelegramBot
	discordBot  *bot.DiscordBot
}

func NewBotHandler(telegramBot *bot.TelegramBot, discordBot *bot.DiscordBot) *BotHandler {
	return &BotHandler{
		telegramBot: telegramBot,
		discordBot:  discordBot,
	}
}

// TelegramWebhook handles incoming Telegram webhook updates
// POST /api/v1/bot/telegram/webhook
func (h *BotHandler) TelegramWebhook(c *gin.Context) {
	var update bot.TelegramUpdate
	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.telegramBot.HandleWebhook(&update); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// SetTelegramWebhook sets the Telegram webhook URL
// POST /api/v1/bot/telegram/set-webhook
func (h *BotHandler) SetTelegramWebhook(c *gin.Context) {
	var req struct {
		WebhookURL string `json:"webhookUrl" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.telegramBot.SetWebhook(req.WebhookURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "webhook set", "url": req.WebhookURL})
}

// GetTelegramWebhookInfo gets current Telegram webhook info
// GET /api/v1/bot/telegram/webhook-info
func (h *BotHandler) GetTelegramWebhookInfo(c *gin.Context) {
	info, err := h.telegramBot.GetWebhookInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, info)
}

// SendTelegramNotification sends a red pocket notification to Telegram
// POST /api/v1/bot/telegram/notify
func (h *BotHandler) SendTelegramNotification(c *gin.Context) {
	var req struct {
		ChatID     int64   `json:"chatId" binding:"required"`
		SenderName string  `json:"senderName" binding:"required"`
		Amount     float64 `json:"amount" binding:"required"`
		Token      string  `json:"token" binding:"required"`
		ClaimLink  string  `json:"claimLink" binding:"required"`
		Message    string  `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.telegramBot.SendRedPocketNotification(req.ChatID, req.SenderName, req.Amount, req.Token, req.ClaimLink, req.Message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "notification sent"})
}

// SendDiscordNotification sends a red pocket notification to Discord
// POST /api/v1/bot/discord/notify
func (h *BotHandler) SendDiscordNotification(c *gin.Context) {
	var req struct {
		ChannelID  string  `json:"channelId" binding:"required"`
		SenderName string  `json:"senderName" binding:"required"`
		Amount     float64 `json:"amount" binding:"required"`
		Token      string  `json:"token" binding:"required"`
		ClaimLink  string  `json:"claimLink" binding:"required"`
		Message    string  `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.discordBot.SendRedPocketNotification(req.ChannelID, req.SenderName, req.Amount, req.Token, req.ClaimLink, req.Message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "notification sent"})
}

// SendDiscordWebhook sends a red pocket notification via Discord webhook
// POST /api/v1/bot/discord/webhook
func (h *BotHandler) SendDiscordWebhook(c *gin.Context) {
	var req struct {
		WebhookURL string  `json:"webhookUrl" binding:"required"`
		SenderName string  `json:"senderName" binding:"required"`
		Amount     float64 `json:"amount" binding:"required"`
		Token      string  `json:"token" binding:"required"`
		ClaimLink  string  `json:"claimLink" binding:"required"`
		Message    string  `json:"message"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.discordBot.SendRedPocketWebhook(req.WebhookURL, req.SenderName, req.Amount, req.Token, req.ClaimLink, req.Message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "webhook sent"})
}

// GetBotStatus returns the status of configured bots
// GET /api/v1/bot/status
func (h *BotHandler) GetBotStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"telegram": gin.H{
			"configured": h.telegramBot.IsConfigured(),
		},
		"discord": gin.H{
			"configured": h.discordBot.IsConfigured(),
		},
	})
}
