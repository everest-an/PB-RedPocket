#!/bin/bash

echo "🔍 检查 Git 同步状态..."
echo ""

# 检查是否在 Git 仓库中
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ 当前目录不是 Git 仓库"
    exit 1
fi

# 检查未跟踪的文件
echo "📋 未跟踪的文件:"
git ls-files --others --exclude-standard
echo ""

# 检查已修改但未暂存的文件
echo "📝 已修改但未暂存:"
git diff --name-only
echo ""

# 检查已暂存但未提交的文件
echo "✅ 已暂存待提交:"
git diff --cached --name-only
echo ""

# 检查与远程的差异
echo "🌐 与远程分支的差异:"
git status -sb
echo ""

# 统计
UNTRACKED=$(git ls-files --others --exclude-standard | wc -l)
MODIFIED=$(git diff --name-only | wc -l)
STAGED=$(git diff --cached --name-only | wc -l)

echo "📊 统计:"
echo "  未跟踪: $UNTRACKED 个文件"
echo "  已修改: $MODIFIED 个文件"
echo "  已暂存: $STAGED 个文件"
echo ""

if [ $UNTRACKED -eq 0 ] && [ $MODIFIED -eq 0 ] && [ $STAGED -eq 0 ]; then
    echo "✅ 所有文件已同步到 Git"
else
    echo "⚠️  有文件尚未提交到 Git"
    echo ""
    echo "建议执行:"
    echo "  git add ."
    echo "  git commit -m 'Update deployment configs and components'"
    echo "  git push origin main"
fi
