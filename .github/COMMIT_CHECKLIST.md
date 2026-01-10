# 提交前检查清单

在推送到 GitHub 之前，请确认以下内容：

## 代码质量
- [ ] `npm run build` 构建成功
- [ ] `npm run lint` 无错误
- [ ] 所有 TypeScript 类型检查通过
- [ ] 没有 console.log 调试语句（除非必要）

## 功能测试
- [ ] 首页加载正常，主题切换工作
- [ ] 红包领取流程完整（打开→领取→动画→声音）
- [ ] Dashboard 所有页面可访问
- [ ] 用户门户功能正常
- [ ] API 路由响应正确

## 配置文件
- [ ] `.env.example` 包含所有必需变量
- [ ] `package.json` 依赖版本正确
- [ ] `vercel.json` 配置完整
- [ ] GitHub Actions workflows 正确

## 安全检查
- [ ] 没有硬编码的密钥或 token
- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 敏感信息使用环境变量

## 文档
- [ ] README.md 更新
- [ ] DEPLOYMENT.md 准确
- [ ] 注释清晰易懂

## 提交命令
```bash
# 检查状态
./scripts/check-sync.sh

# 添加文件
git add .

# 提交（使用描述性信息）
git commit -m "feat: 完整的前端组件和部署配置

- 添加双主题红包组件（Fire/Ocean）
- 完善 Dashboard 所有页面
- 集成音效系统
- 添加完整部署配置"

# 推送到 GitHub
git push origin main
```

## 推送后验证
- [ ] GitHub 代码库更新
- [ ] GitHub Actions 自动运行
- [ ] Vercel 自动部署触发
