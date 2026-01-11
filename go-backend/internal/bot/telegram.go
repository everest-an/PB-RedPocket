package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/protocolbank/redpocket-backend/internal/config"
)

// TelegramBot handles Telegram bot integration
type TelegramBot struct {
	cfg        *config.Config
	token      string
	httpClient *http.Client
	baseURL    string
}

// TelegramUpdate represents an incoming update from Telegram
type TelegramUpdate struct {
	UpdateID int              `json:"update_id"`
	Message  *TelegramMessage `json:"message,omitempty"`
}

// TelegramMessage represents a Telegram message
type TelegramMessage struct {
	MessageID int           `json:"message_id"`
	From      *TelegramUser `json:"from,omitempty"`
	Chat      *TelegramChat `json:"chat"`
	Date      int           `json:"date"`
	Text      string        `json:"text,omitempty"`
}

// TelegramUser represents a Telegram user
type TelegramUser struct {
	ID        int64  `json:"id"`
	IsBot     bool   `json:"is_bot"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name,omitempty"`
	Username  string `json:"username,omitempty"`
}

// TelegramChat represents a Telegram chat
type TelegramChat struct {
	ID    int64  `json:"id"`
	Type  string `json:"type"`
	Title string `json:"title,omitempty"`
}

// NewTelegramBot creates a new Telegram bot instance
func NewTelegramBot(cfg *config.Config) *TelegramBot {
	token := cfg.TelegramBotToken
	if token == "" {
		log.Println("Warning: TELEGRAM_BOT_TOKEN not set")
	}

	return &TelegramBot{
		cfg:   cfg,
		token: token,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL: "https://api.telegram.org/bot",
	}
}

// IsConfigured returns true if the bot is properly configured
func (b *TelegramBot) IsConfigured() bool {
	return b.token != ""
}

// SendMessage sends a message to a Telegram chat
func (b *TelegramBot) SendMessage(chatID int64, text string, parseMode string) error {
	if !b.IsConfigured() {
		return fmt.Errorf("telegram bot not configured")
	}

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": parseMode,
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s%s/sendMessage", b.baseURL, b.token)

	resp, err := b.httpClient.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram API error: %s", string(respBody))
	}

	return nil
}

// SendRedPocketNotification sends a red pocket notification to a chat
func (b *TelegramBot) SendRedPocketNotification(chatID int64, senderName string, amount float64, token string, claimLink string, message string) error {
	text := fmt.Sprintf(`🧧 *Red Pocket Alert!*

*%s* sent a red pocket!

💰 Amount: *%.2f %s*
%s
[🎁 Claim Now](%s)

_Powered by Protocol Bank_`, senderName, amount, token, message, claimLink)

	return b.SendMessage(chatID, text, "Markdown")
}

// SendClaimNotification notifies when someone claims a red pocket
func (b *TelegramBot) SendClaimNotification(chatID int64, claimerName string, amount float64, token string, remaining int) error {
	text := fmt.Sprintf(`🎉 *%s* claimed a red pocket!

💰 Received: *%.2f %s*
📦 Remaining: *%d* pockets

_Powered by Protocol Bank_`, claimerName, amount, token, remaining)

	return b.SendMessage(chatID, text, "Markdown")
}

// HandleWebhook processes incoming webhook updates
func (b *TelegramBot) HandleWebhook(update *TelegramUpdate) error {
	if update.Message == nil {
		return nil
	}

	msg := update.Message
	text := strings.TrimSpace(msg.Text)

	// Handle commands
	if strings.HasPrefix(text, "/") {
		return b.handleCommand(msg)
	}

	return nil
}

func (b *TelegramBot) handleCommand(msg *TelegramMessage) error {
	parts := strings.Fields(msg.Text)
	if len(parts) == 0 {
		return nil
	}

	command := strings.ToLower(parts[0])

	switch command {
	case "/start":
		return b.handleStart(msg)
	case "/help":
		return b.handleHelp(msg)
	case "/create":
		return b.handleCreate(msg)
	case "/balance":
		return b.handleBalance(msg)
	default:
		return nil
	}
}

func (b *TelegramBot) handleStart(msg *TelegramMessage) error {
	text := `🧧 *Welcome to Protocol Bank Red Pocket Bot!*

I can help you create and manage red pockets for your community.

*Commands:*
/create - Create a new red pocket
/balance - Check your wallet balance
/help - Show help message

Visit our dashboard to create campaigns:
https://redpocket.protocolbanks.com/dashboard`

	return b.SendMessage(msg.Chat.ID, text, "Markdown")
}

func (b *TelegramBot) handleHelp(msg *TelegramMessage) error {
	text := `🧧 *Red Pocket Bot Help*

*Available Commands:*
• /start - Start the bot
• /create - Create a new red pocket
• /balance - Check wallet balance
• /help - Show this help

*How to create a red pocket:*
1. Visit the dashboard
2. Connect your wallet
3. Create a campaign
4. Share the link in your group

*Need support?*
Contact: @protocolbank_support`

	return b.SendMessage(msg.Chat.ID, text, "Markdown")
}

func (b *TelegramBot) handleCreate(msg *TelegramMessage) error {
	text := `🧧 *Create a Red Pocket*

To create a red pocket campaign:

1. 🔗 Visit: https://redpocket.protocolbanks.com/dashboard
2. 💳 Connect your wallet
3. 📝 Fill in campaign details
4. 💰 Deposit funds
5. 📤 Share the link here!

_Creating red pockets requires a connected wallet for security._`

	return b.SendMessage(msg.Chat.ID, text, "Markdown")
}

func (b *TelegramBot) handleBalance(msg *TelegramMessage) error {
	text := `💰 *Check Your Balance*

To check your wallet balance:

1. Visit: https://redpocket.protocolbanks.com/dashboard/wallet
2. Connect your wallet
3. View your balances across all chains

_Your wallet, your keys, your funds._`

	return b.SendMessage(msg.Chat.ID, text, "Markdown")
}

// SetWebhook sets the webhook URL for the bot
func (b *TelegramBot) SetWebhook(webhookURL string) error {
	if !b.IsConfigured() {
		return fmt.Errorf("telegram bot not configured")
	}

	payload := map[string]interface{}{
		"url": webhookURL,
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s%s/setWebhook", b.baseURL, b.token)

	resp, err := b.httpClient.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to set webhook: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram API error: %s", string(respBody))
	}

	return nil
}

// GetWebhookInfo gets current webhook info
func (b *TelegramBot) GetWebhookInfo() (map[string]interface{}, error) {
	if !b.IsConfigured() {
		return nil, fmt.Errorf("telegram bot not configured")
	}

	url := fmt.Sprintf("%s%s/getWebhookInfo", b.baseURL, b.token)
	resp, err := b.httpClient.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}
