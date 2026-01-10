# Protocol Bank RedPocket - 部署指南

完整的前后端分离部署方案：前端部署到 Vercel，后端部署到 AWS，智能合约部署到多链。

## 架构概览

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Vercel     │─────▶│  AWS ECS     │─────▶│  RDS/Redis      │
│  (前端)      │      │  (后端API)    │      │  (数据库)        │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Blockchain  │
                     │  (合约)       │
                     └──────────────┘
```

## 前置要求

### 开发工具
- Node.js 20+
- Docker & Docker Compose
- AWS CLI
- Terraform (可选)
- Vercel CLI

### 云服务账号
- AWS 账号 (后端基础设施)
- Vercel 账号 (前端托管)
- Infura/Alchemy (区块链节点)

## 一键部署

### 完整自动化部署

```bash
# 给脚本执行权限
chmod +x scripts/deploy-all.sh

# 运行部署
./scripts/deploy-all.sh
```

选择部署选项：
1. 完整部署 (前端 + 后端 + 合约)
2. 仅前端
3. 仅后端
4. 仅智能合约
5. 运行数据库迁移
6. 健康检查

## 分步部署指南

### 1. 前端部署到 Vercel

#### 方法 A: 通过 Git (推荐)

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `NEXT_PUBLIC_API_URL`: https://api.protocolbanks.com
   - `NEXT_PUBLIC_CHAIN_ID`: 137
   - `NEXT_PUBLIC_APP_URL`: https://protocolbanks.com
4. 自动部署完成

#### 方法 B: 通过 CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 2. 后端部署到 AWS

#### 步骤 1: 设置 AWS 基础设施

```bash
# 配置 AWS 凭证
aws configure

# 初始化基础设施
./scripts/setup-aws.sh
```

或使用 Terraform (推荐生产环境):

```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

#### 步骤 2: 部署后端服务

**方法 A: 通过 GitHub Actions (推荐)**

1. 在 GitHub 设置 Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

2. 推送代码触发自动部署:
```bash
git push origin main
```

**方法 B: 手动部署**

```bash
# 登录 ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com

# 构建并推送镜像
cd backend
docker build -t redpocket-backend .
docker tag redpocket-backend:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/redpocket-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/redpocket-backend:latest

# 更新 ECS 服务
aws ecs update-service \
  --cluster redpocket-cluster \
  --service redpocket-service \
  --force-new-deployment
```

### 3. 智能合约部署

#### 步骤 1: 配置环境变量

```bash
cd contracts
cp .env.example .env
```

编辑 `.env`:
```env
PRIVATE_KEY=你的部署私钥
INFURA_API_KEY=你的Infura密钥
ETHERSCAN_API_KEY=用于验证合约
```

#### 步骤 2: 编译和测试

```bash
npm install
npm run compile
npm run test
```

#### 步骤 3: 部署到各链

```bash
# 部署到 Polygon
npm run deploy:polygon

# 部署到 Arbitrum
npm run deploy:arbitrum

# 部署到 Optimism
npm run deploy:optimism

# 验证合约
npm run verify
```

或通过 GitHub Actions 自动部署:
```bash
git push origin main
# Actions 会自动编译、测试和部署
```

### 4. 数据库迁移

```bash
cd backend
npm run migrate:latest
```

## 本地开发环境

### 使用 Docker Compose

```bash
cd backend
docker-compose up -d
```

这会启动：
- API 服务 (端口 8080)
- PostgreSQL (端口 5432)
- Redis (端口 6379)
- Prometheus (端口 9090)
- Grafana (端口 3001)

### 前端开发

```bash
npm run dev
# 访问 http://localhost:3000
```

## 环境变量配置

### 前端 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_CHAIN_ID=137
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 后端 (.env)

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/redpocket
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# 区块链
CHAIN_ID=137
RPC_URL=https://polygon-rpc.com
PAYMASTER_ADDRESS=0x...
BUNDLER_URL=https://bundler.example.com

# 社交平台 API
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=
GITHUB_APP_ID=
WHATSAPP_API_KEY=

# AWS (生产环境)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

## 监控和健康检查

### 健康检查端点

```bash
# 前端
curl https://protocolbanks.com

# 后端
curl https://api.protocolbanks.com/health

# 响应示例
{
  "status": "healthy",
  "timestamp": "2026-01-10T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "blockchain": "synced"
  }
}
```

### 监控面板

访问 Grafana: http://localhost:3001
- 默认用户名: admin
- 默认密码: admin

## 故障排查

### 前端无法连接后端

1. 检查 `NEXT_PUBLIC_API_URL` 环境变量
2. 确认后端健康检查通过
3. 检查 CORS 配置

### 后端服务异常

```bash
# 查看日志
aws logs tail /ecs/redpocket-backend --follow

# 检查 ECS 服务状态
aws ecs describe-services \
  --cluster redpocket-cluster \
  --services redpocket-service
```

### 数据库连接失败

1. 检查 Security Group 规则
2. 确认 RDS 实例状态
3. 验证连接字符串

### 智能合约交互失败

1. 检查合约地址是否正确
2. 确认网络 ID 匹配
3. 验证 RPC 节点可用性

## 回滚策略

### 前端回滚

```bash
# Vercel 控制台选择之前的部署
# 或通过 CLI
vercel rollback <deployment-url>
```

### 后端回滚

```bash
# 回滚到上一个 ECS 任务定义
aws ecs update-service \
  --cluster redpocket-cluster \
  --service redpocket-service \
  --task-definition redpocket-backend:<previous-revision>
```

## 安全最佳实践

1. **密钥管理**: 使用 AWS Secrets Manager 存储敏感信息
2. **网络隔离**: RDS 和 Redis 部署在私有子网
3. **加密传输**: 全站 HTTPS，API 使用 TLS 1.3
4. **访问控制**: 使用 IAM 角色，最小权限原则
5. **审计日志**: 启用 CloudTrail 和 CloudWatch Logs

## 成本优化

- 使用 Fargate Spot 降低 ECS 成本
- RDS 使用预留实例
- 配置 S3 生命周期策略
- 启用 CloudFront CDN

## CI/CD 流程

```mermaid
graph LR
    A[Push Code] --> B[GitHub Actions]
    B --> C{Tests Pass?}
    C -->|Yes| D[Build Docker]
    D --> E[Push to ECR]
    E --> F[Deploy to ECS]
    C -->|No| G[Notify Team]
    F --> H[Health Check]
    H -->|Fail| I[Auto Rollback]
```

## 支持

- 文档: https://docs.protocolbanks.com
- GitHub Issues: https://github.com/your-org/redpocket/issues
- Discord: https://discord.gg/protocolbanks

---

**上次更新**: 2026-01-10
**维护者**: Protocol Banks Team
