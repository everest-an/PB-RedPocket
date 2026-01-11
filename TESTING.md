# RedPocket 测试流程

## 快速开始

### 前端启动
```bash
npm install
npm run dev
# 访问 http://localhost:3000/dashboard
```

### 后端启动
```bash
cd go-backend
cp .env.example .env
# 编辑 .env 配置数据库和 Redis
docker-compose up -d  # 启动 PostgreSQL 和 Redis
go run cmd/server/main.go
```

## 核心功能测试

### 1. 连接钱包
- 访问 `/dashboard`
- 侧边栏有 "Connect Wallet" 按钮
- 如果未连接，主页会显示引导卡片
- 选择钱包（MetaMask, OKX等）
- 确保钱包连接到 **Base 网络**
- 确保钱包有 **USDC** 余额

### 2. 创建红包
- 在 Dashboard 点击 **"Create Red Pocket"** 按钮
- 填写表单：
  - **Campaign Name**: 红包名称（如：社区空投）
  - **Platform**: 选择分发平台 (Telegram/Discord/WhatsApp/GitHub)
  - **Total Budget**: 总金额 (USDC)
  - **Token**: USDC 或 USDT
  - **Number of Red Pockets**: 红包数量
  - **Distribution Type**: 
    - Fixed Amount: 每个红包金额相同
    - Lucky Draw: 随机金额
  - **Message**: 可选的祝福语
- 点击 **"Create Campaign"**
- 如果需要，批准 Token 授权（Approve）
- 确认转账交易（Transfer）
- 等待创建完成

### 3. 获取分享链接
创建成功后会显示：
- **Claim Link**: 领取链接
- **平台分享按钮**:
  - Telegram: 直接跳转分享
  - WhatsApp: 直接跳转分享  
  - Discord: 复制格式化文本
  - GitHub: 复制Markdown格式
- **Copy Link**: 复制链接

### 4. 领取红包
- 用户访问分享链接 `/claim/[id]`
- 显示红包信息（发送者、金额、剩余数量）
- 点击 **"Claim Reward"** 按钮
- 系统自动创建 AA 钱包（无需用户有钱包）
- 领取成功后显示：
  - 领取金额
  - AA钱包地址
  - 提现入口

### 5. 查看数据
- **Dashboard**: 总览统计
- **Campaigns**: 所有红包活动列表
- **Claims**: 所有领取记录（可导出CSV）
- **Wallet**: 查看钱包余额

## 页面路由

| 路由 | 说明 |
|------|------|
| `/` | 首页（Demo展示） |
| `/dashboard` | 仪表盘 |
| `/dashboard/campaigns` | 活动管理 |
| `/dashboard/claims` | 领取记录 |
| `/dashboard/wallet` | 钱包管理 |
| `/dashboard/settings` | 设置 |
| `/claim/[id]` | 红包领取页 |
| `/portal` | 用户门户（领取者查看余额） |

## 环境变量

### 前端 `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
```

### 后端 `.env`
```env
DATABASE_URL=postgres://user:pass@localhost:5432/redpocket
REDIS_URL=redis://localhost:6379
PORT=8080
CHAIN_ID=8453
JWT_SECRET=your_jwt_secret
PRIVATE_KEY=your_wallet_private_key
```

## API 端点

### 红包相关
- `POST /api/v1/redpocket/create` - 创建红包
- `POST /api/v1/redpocket/claim` - 领取红包
- `GET /api/v1/redpocket/:id` - 获取红包信息

### 企业端
- `GET /api/v1/enterprise/campaigns` - 获取活动列表
- `POST /api/v1/enterprise/campaigns` - 创建活动
- `GET /api/v1/enterprise/claims` - 获取领取记录

### 钱包
- `GET /api/v1/wallet/:userId` - 获取/创建钱包
- `POST /api/v1/wallet/withdraw` - 提现

## 注意事项

1. **网络**: 默认使用 Base 网络 (Chain ID: 8453)
2. **Token**: 支持 USDC 和 USDT
3. **Gas**: 领取红包时 Gas 由平台赞助（AA钱包）
4. **Vault地址**: 创建红包时资金转入 Vault 合约

## 常见问题

**Q: 钱包连接失败？**
A: 确保安装了 MetaMask 或其他支持的钱包，并切换到 Base 网络

**Q: 创建红包失败？**
A: 检查 USDC 余额是否充足，确保已批准 Token 授权

**Q: 领取失败？**
A: 检查红包是否已被领完或过期
