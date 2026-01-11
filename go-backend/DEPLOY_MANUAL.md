# Go Backend 手动部署指南

## 当前服务器信息
- IP: 52.91.244.89
- 端口: 8080
- 健康检查: http://52.91.244.89:8080/health

## 部署步骤

### 1. SSH 连接到服务器
```bash
ssh -i pb-redpocket-key.pem ubuntu@52.91.244.89
```

### 2. 拉取最新代码
```bash
cd /opt/redpocket
git pull origin main
```

### 3. 重新构建并启动
```bash
cd go-backend
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 4. 验证部署
```bash
# 检查健康状态
curl http://localhost:8080/health

# 检查新的 bridge API
curl "http://localhost:8080/api/v1/bridge/balances?account=0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91&asset=USDC"
```

## 新增 API 端点

### Hyperbridge 跨链桥接
```
GET  /api/v1/bridge/balances      - 并行查询多链余额
GET  /api/v1/bridge/quotes        - 获取所有协议报价
POST /api/v1/bridge/transfer      - 发起跨链转账
GET  /api/v1/bridge/status/:id    - 查询转账状态
POST /api/v1/bridge/auto          - 自动选择最优路径
GET  /api/v1/bridge/best-source   - 查找最佳源链
```

## 回滚
```bash
docker-compose down
git checkout <previous-commit>
docker-compose build
docker-compose up -d
```
