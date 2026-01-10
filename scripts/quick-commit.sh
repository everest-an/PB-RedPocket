#!/bin/bash

# 快速提交脚本
# 用法: ./scripts/quick-commit.sh "提交信息"

if [ -z "$1" ]; then
    echo "❌ 请提供提交信息"
    echo "用法: ./scripts/quick-commit.sh '你的提交信息'"
    exit 1
fi

echo "🔍 检查文件状态..."
git status --short

echo ""
echo "📦 添加所有文件..."
git add .

echo ""
echo "💾 提交更改..."
git commit -m "$1"

echo ""
echo "🚀 推送到 GitHub..."
git push origin main

echo ""
echo "✅ 完成！代码已同步到 GitHub"
echo ""
echo "🔗 查看部署状态:"
echo "  GitHub Actions: https://github.com/YOUR_USERNAME/PB-RedPocket/actions"
echo "  Vercel: https://vercel.com/dashboard"
