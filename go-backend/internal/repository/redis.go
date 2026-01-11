package repository

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
)

type RedisClient struct {
	Client *redis.Client
}

func NewRedisClient(redisURL string) (*RedisClient, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, err
	}

	// Pool settings for high concurrency
	opt.PoolSize = 100
	opt.MinIdleConns = 10
	opt.MaxRetries = 3
	opt.DialTimeout = 5 * time.Second
	opt.ReadTimeout = 3 * time.Second
	opt.WriteTimeout = 3 * time.Second

	client := redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &RedisClient{Client: client}, nil
}

func (r *RedisClient) Close() error {
	return r.Client.Close()
}

func (r *RedisClient) Ping(ctx context.Context) error {
	return r.Client.Ping(ctx).Err()
}

// Distributed lock for claim operations
func (r *RedisClient) AcquireLock(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	return r.Client.SetNX(ctx, "lock:"+key, "1", ttl).Result()
}

func (r *RedisClient) ReleaseLock(ctx context.Context, key string) error {
	return r.Client.Del(ctx, "lock:"+key).Err()
}

// Rate limiting
func (r *RedisClient) IncrementRateLimit(ctx context.Context, key string, window time.Duration) (int64, error) {
	pipe := r.Client.Pipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, window)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return 0, err
	}
	return incr.Val(), nil
}
