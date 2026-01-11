# 跨链桥接功能需求规格

## 概述
实现基于 Polkadot 生态的跨链资产桥接功能，允许用户在不同链上的资产自动转移到目标链以创建红包。

## 用户故事

### US-1: 多链余额查询
**作为** 红包创建者
**我想要** 同时查看我在所有支持链上的代币余额
**以便** 快速了解我的资产分布并选择最优源链

**验收标准:**
- [ ] 并行查询 Base、Polygon、Ethereum、Moonbeam、Astar 链上的余额
- [ ] 响应时间 < 3秒
- [ ] 显示每条链的余额和链名称
- [ ] 余额不足的链显示为禁用状态

### US-2: 自动协议选择
**作为** 红包创建者
**我想要** 系统自动选择最优的跨链协议
**以便** 获得最快速度和最低费用

**验收标准:**
- [ ] Polkadot 内部转账自动选择 XCM (~30秒, ~$0.01)
- [ ] EVM 到 Polkadot 转账自动选择 Hyperbridge (~2分钟, ~$0.10)
- [ ] Ethereum 主网到 Polkadot 自动选择 Snowbridge (~15分钟, ~$1.00)
- [ ] 用户可手动覆盖协议选择

### US-3: 跨链转账执行
**作为** 红包创建者
**我想要** 一键完成跨链转账
**以便** 无需手动操作多个桥接界面

**验收标准:**
- [ ] 显示转账摘要（金额、协议、费用、预计时间）
- [ ] 转账状态实时更新 (pending → confirming → relaying → completed)
- [ ] 失败时显示错误信息并允许重试
- [ ] 成功后自动继续红包创建流程

### US-4: 自动桥接
**作为** 红包创建者
**我想要** 系统自动找到余额最多的链并桥接
**以便** 简化操作流程

**验收标准:**
- [ ] 自动扫描所有链找到足够余额的源链
- [ ] 如果目标链已有足够余额，跳过桥接
- [ ] 优先选择余额最高的链作为源

## 技术架构

### 支持的协议

| 协议 | 适用场景 | 预计时间 | 费用 |
|------|----------|----------|------|
| XCM | Polkadot 平行链之间 | ~30秒 | ~$0.01 |
| Hyperbridge | EVM ↔ Polkadot | ~2分钟 | ~$0.10 |
| Snowbridge | Ethereum ↔ Polkadot | ~15分钟 | ~$1.00 |

### 支持的链

| 链 | Chain ID | 类型 |
|----|----------|------|
| Base | 8453 | EVM |
| Polygon | 137 | EVM |
| Ethereum | 1 | EVM |
| Moonbeam | 1284 | EVM + Polkadot |
| Astar | 592 | EVM + Polkadot |

### API 端点

```
GET  /api/v1/bridge/balances      - 并行查询多链余额
GET  /api/v1/bridge/quotes        - 获取所有协议报价
POST /api/v1/bridge/transfer      - 发起跨链转账
GET  /api/v1/bridge/status/:id    - 查询转账状态
POST /api/v1/bridge/auto          - 自动选择最优路径
GET  /api/v1/bridge/best-source   - 查找最佳源链
```

## 实现文件

### Go 后端 (高性能并行处理)
- `go-backend/internal/service/hyperbridge.go` - Hyperbridge 服务
- `go-backend/internal/handler/hyperbridge.go` - API 处理器
- `go-backend/internal/service/xcm_bridge.go` - XCM 桥接服务

### 前端组件
- `components/dashboard/cross-chain-bridge.tsx` - 跨链桥接 UI 组件
- `lib/web3-config.ts` - Web3 配置和链信息

## 依赖

- Go 1.22+
- gin-gonic/gin (HTTP 框架)
- wagmi/viem (前端 Web3)
- Polkadot.js API (XCM 消息构建)
