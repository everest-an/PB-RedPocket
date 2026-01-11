package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/protocolbank/redpocket-backend/internal/repository"
)

type HealthHandler struct {
	db    *repository.PostgresDB
	redis *repository.RedisClient
}

func NewHealthHandler(db *repository.PostgresDB, redis *repository.RedisClient) *HealthHandler {
	return &HealthHandler{db: db, redis: redis}
}

func (h *HealthHandler) Health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	status := "healthy"
	checks := gin.H{}

	// Check database
	if err := h.db.Ping(ctx); err != nil {
		status = "unhealthy"
		checks["database"] = "error: " + err.Error()
	} else {
		checks["database"] = "ok"
	}

	// Check Redis
	if err := h.redis.Ping(ctx); err != nil {
		status = "unhealthy"
		checks["redis"] = "error: " + err.Error()
	} else {
		checks["redis"] = "ok"
	}

	statusCode := http.StatusOK
	if status == "unhealthy" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, gin.H{
		"status":    status,
		"checks":    checks,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
