package bot

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/protocolbank/redpocket-backend/internal/config"
)

// DiscordBot handles Discord bot integration
type DiscordBot struct {
	cfg        *config.Config
	token      string
	httpClient *http.Client
	baseURL    string
}

// DiscordEmbed represents a Discord embed
type DiscordEmbed struct {
	Title       string              `json:"title,omitempty"`
	Description string              `json:"description,omitempty"`
	URL         string              `json:"url,omitempty"`
	Color       int                 `json:"color,omitempty"`
	Fields      []DiscordEmbedField `json:"fields,omitempty"`
	Footer      *DiscordEmbedFooter `json:"footer,omitempty"`
	Thumbnail   *DiscordEmbedImage  `json:"thumbnail,omitempty"`
}

// DiscordEmbedField represents a field in a Discord embed
type DiscordEmbedField struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Inline bool   `json:"inline,omitempty"`
}

// DiscordEmbedFooter represents the footer of a Discord embed
type DiscordEmbedFooter struct {
	Text    string `json:"text"`
	IconURL string `json:"icon_url,omitempty"`
}

// DiscordEmbedImage represents an image in a Discord embed
type DiscordEmbedImage struct {
	URL string `json:"url"`
}

// DiscordMessage represents a Discord message
type DiscordMessage struct {
	Content string         `json:"content,omitempty"`
	Embeds  []DiscordEmbed `json:"embeds,omitempty"`
}

// NewDiscordBot creates a new Discord bot instance
func NewDiscordBot(cfg *config.Config) *DiscordBot {
	token := cfg.DiscordBotToken
	if token == "" {
		log.Println("Warning: DISCORD_BOT_TOKEN not set")
	}

	return &DiscordBot{
		cfg:   cfg,
		token: token,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL: "https://discord.com/api/v10",
	}
}

// IsConfigured returns true if the bot is properly configured
func (b *DiscordBot) IsConfigured() bool {
	return b.token != ""
}

// SendMessage sends a message to a Discord channel
func (b *DiscordBot) SendMessage(channelID string, message *DiscordMessage) error {
	if !b.IsConfigured() {
		return fmt.Errorf("discord bot not configured")
	}

	body, _ := json.Marshal(message)
	url := fmt.Sprintf("%s/channels/%s/messages", b.baseURL, channelID)

	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bot "+b.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("discord API error: %s", string(respBody))
	}

	return nil
}

// SendRedPocketNotification sends a red pocket notification to a channel
func (b *DiscordBot) SendRedPocketNotification(channelID string, senderName string, amount float64, token string, claimLink string, message string) error {
	embed := DiscordEmbed{
		Title:       "🧧 Red Pocket Alert!",
		Description: fmt.Sprintf("**%s** sent a red pocket!\n\n%s", senderName, message),
		URL:         claimLink,
		Color:       0xFF6B35, // Orange color
		Fields: []DiscordEmbedField{
			{
				Name:   "💰 Amount",
				Value:  fmt.Sprintf("%.2f %s", amount, token),
				Inline: true,
			},
			{
				Name:   "🎁 Claim",
				Value:  fmt.Sprintf("[Click Here](%s)", claimLink),
				Inline: true,
			},
		},
		Footer: &DiscordEmbedFooter{
			Text: "Powered by Protocol Bank",
		},
	}

	msg := &DiscordMessage{
		Embeds: []DiscordEmbed{embed},
	}

	return b.SendMessage(channelID, msg)
}

// SendClaimNotification notifies when someone claims a red pocket
func (b *DiscordBot) SendClaimNotification(channelID string, claimerName string, amount float64, token string, remaining int) error {
	embed := DiscordEmbed{
		Title:       "🎉 Red Pocket Claimed!",
		Description: fmt.Sprintf("**%s** claimed a red pocket!", claimerName),
		Color:       0x00FF00, // Green color
		Fields: []DiscordEmbedField{
			{
				Name:   "💰 Received",
				Value:  fmt.Sprintf("%.2f %s", amount, token),
				Inline: true,
			},
			{
				Name:   "📦 Remaining",
				Value:  fmt.Sprintf("%d pockets", remaining),
				Inline: true,
			},
		},
		Footer: &DiscordEmbedFooter{
			Text: "Powered by Protocol Bank",
		},
	}

	msg := &DiscordMessage{
		Embeds: []DiscordEmbed{embed},
	}

	return b.SendMessage(channelID, msg)
}

// SendWebhookMessage sends a message via Discord webhook (no bot token needed)
func (b *DiscordBot) SendWebhookMessage(webhookURL string, message *DiscordMessage) error {
	body, _ := json.Marshal(message)

	resp, err := b.httpClient.Post(webhookURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to send webhook message: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("discord webhook error: %s", string(respBody))
	}

	return nil
}

// SendRedPocketWebhook sends a red pocket notification via webhook
func (b *DiscordBot) SendRedPocketWebhook(webhookURL string, senderName string, amount float64, token string, claimLink string, message string) error {
	embed := DiscordEmbed{
		Title:       "🧧 Red Pocket Alert!",
		Description: fmt.Sprintf("**%s** sent a red pocket!\n\n%s", senderName, message),
		URL:         claimLink,
		Color:       0xFF6B35,
		Fields: []DiscordEmbedField{
			{
				Name:   "💰 Amount",
				Value:  fmt.Sprintf("%.2f %s", amount, token),
				Inline: true,
			},
			{
				Name:   "🎁 Claim",
				Value:  fmt.Sprintf("[Click Here](%s)", claimLink),
				Inline: true,
			},
		},
		Footer: &DiscordEmbedFooter{
			Text: "Powered by Protocol Bank",
		},
	}

	msg := &DiscordMessage{
		Embeds: []DiscordEmbed{embed},
	}

	return b.SendWebhookMessage(webhookURL, msg)
}

// CreateSlashCommands registers slash commands for the bot
func (b *DiscordBot) CreateSlashCommands(applicationID string) error {
	if !b.IsConfigured() {
		return fmt.Errorf("discord bot not configured")
	}

	commands := []map[string]interface{}{
		{
			"name":        "redpocket",
			"description": "Red Pocket commands",
			"options": []map[string]interface{}{
				{
					"name":        "create",
					"description": "Create a new red pocket",
					"type":        1, // SUB_COMMAND
				},
				{
					"name":        "balance",
					"description": "Check your wallet balance",
					"type":        1,
				},
				{
					"name":        "help",
					"description": "Show help information",
					"type":        1,
				},
			},
		},
	}

	body, _ := json.Marshal(commands)
	url := fmt.Sprintf("%s/applications/%s/commands", b.baseURL, applicationID)

	req, _ := http.NewRequest("PUT", url, bytes.NewReader(body))
	req.Header.Set("Authorization", "Bot "+b.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to create commands: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("discord API error: %s", string(respBody))
	}

	return nil
}
