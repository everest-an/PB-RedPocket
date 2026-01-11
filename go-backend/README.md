# RedPocket Go Backend

高并发红包后端服务，使用 Go + PostgreSQL + Redis 构建。

## 架构特点

- **高并发**: Goroutine 并发处理，支持 10000+ QPS
- **分布式锁**: Redis 防止红包超领
- **原子操作**: PostgreSQL 行级锁保证数据一致性
- **AA 钱包**: ERC-4337 账户抽象，用户无需 Gas

## 快速启动

### 开发环境

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 启动依赖服务
docker-compose up -d postgres redis

# 3. 运行服务
go run ./cmd/server
```

### Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d --build
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /api/v1/redpocket/create | 创建红包 |
| POST | /api/v1/redpocket/claim | 领取红包 |
| GET | /api/v1/redpocket/:id | 获取红包详情 |
| GET | /api/v1/wallet/:userId | 获取/创建钱包 |
| POST | /api/v1/wallet/withdraw | 提现 |

### 企业端点 (需要 JWT)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/enterprise/campaigns | 获取活动列表 |
| POST | /api/v1/enterprise/campaigns | 创建活动 |
| GET | /api/v1/enterprise/claims | 获取领取记录 |
| GET | /api/v1/enterprise/analytics | 数据分析 |

## 环境变量

```env
# 服务器
PORT=8080
ENV=production

# 数据库
DATABASE_URL=postgres://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# 区块链
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
BUNDLER_URL=https://api.pimlico.io/v2/8453/rpc?apikey=YOUR_KEY
PAYMASTER_URL=https://api.pimlico.io/v2/8453/rpc?apikey=YOUR_KEY

# 安全
JWT_SECRET=your-secret
RATE_LIMIT_RPS=1000
```

## 待完成功能

- [ ] 完整 AA 钱包集成 (Pimlico/ZeroDev)
- [ ] WebSocket 实时推送
- [ ] Telegram Bot 集成
- [ ] Discord Bot 集成
- [ ] 批量转账优化
