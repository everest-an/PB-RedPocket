package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/protocolbank/redpocket-backend/internal/config"
	"github.com/protocolbank/redpocket-backend/internal/handler"
	"github.com/protocolbank/redpocket-backend/internal/middleware"
	"github.com/protocolbank/redpocket-backend/internal/repository"
	"github.com/protocolbank/redpocket-backend/internal/service"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Load config
	cfg := config.Load()

	// Initialize database
	db, err := repository.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Redis
	rdb, err := repository.NewRedisClient(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer rdb.Close()

	// Initialize repositories
	redPocketRepo := repository.NewRedPocketRepository(db)
	walletRepo := repository.NewWalletRepository(db)
	claimRepo := repository.NewClaimRepository(db)
	campaignRepo := repository.NewCampaignRepository(db)

	// Initialize services
	walletSvc := service.NewWalletService(walletRepo, cfg)
	redPocketSvc := service.NewRedPocketService(redPocketRepo, claimRepo, walletSvc, rdb, cfg)
	campaignSvc := service.NewCampaignService(campaignRepo, claimRepo, cfg)
	xcmBridge := service.NewXCMBridge(cfg)

	// Initialize handlers
	redPocketHandler := handler.NewRedPocketHandler(redPocketSvc)
	walletHandler := handler.NewWalletHandler(walletSvc)
	campaignHandler := handler.NewCampaignHandler(campaignSvc)
	xcmHandler := handler.NewXCMHandler(xcmBridge)
	healthHandler := handler.NewHealthHandler(db, rdb)

	// Setup Gin
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS())
	r.Use(middleware.RateLimit(rdb, cfg.RateLimitRPS))

	// Routes
	r.GET("/health", healthHandler.Health)

	api := r.Group("/api/v1")
	{
		// RedPocket routes (public)
		rp := api.Group("/redpocket")
		{
			rp.POST("/create", redPocketHandler.Create)
			rp.POST("/claim", redPocketHandler.Claim)
			rp.GET("/:id", redPocketHandler.Get)
		}

		// Wallet routes (public)
		wallet := api.Group("/wallet")
		{
			wallet.GET("/:userId", walletHandler.GetOrCreate)
			wallet.POST("/withdraw", walletHandler.Withdraw)
		}

		// XCM Cross-chain routes (public)
		xcm := api.Group("/xcm")
		{
			xcm.GET("/chains", xcmHandler.GetSupportedChains)
			xcm.GET("/assets/:asset", xcmHandler.GetAssetInfo)
			xcm.GET("/optimal-chain", xcmHandler.GetOptimalChain)
			xcm.POST("/transfer", xcmHandler.InitiateTransfer)
			xcm.GET("/transfer/:bridgeId", xcmHandler.GetTransferStatus)
			xcm.GET("/balance", xcmHandler.GetBalance)
			xcm.GET("/estimate-fee", xcmHandler.EstimateFee)
			xcm.GET("/health/:chainId", xcmHandler.HealthCheck)
		}

		// Enterprise routes (requires auth)
		enterprise := api.Group("/enterprise")
		enterprise.Use(middleware.Auth(cfg.JWTSecret))
		{
			enterprise.GET("/campaigns", campaignHandler.List)
			enterprise.POST("/campaigns", campaignHandler.Create)
			enterprise.GET("/campaigns/:id", campaignHandler.Get)
			enterprise.PUT("/campaigns/:id/status", campaignHandler.UpdateStatus)
			enterprise.DELETE("/campaigns/:id", campaignHandler.Delete)
			enterprise.GET("/claims", campaignHandler.ListClaims)
			enterprise.GET("/analytics", campaignHandler.Analytics)
		}
	}

	// Server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exited")
}
