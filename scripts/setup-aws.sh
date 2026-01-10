#!/bin/bash

# AWS 基础设施快速设置脚本

set -e

echo "🛠️  RedPocket AWS 基础设施设置"
echo "================================"

REGION="us-east-1"
CLUSTER_NAME="redpocket-cluster"
SERVICE_NAME="redpocket-service"
REPOSITORY_NAME="redpocket-backend"

# 创建 ECR 仓库
echo "创建 ECR 仓库..."
aws ecr create-repository \
    --repository-name $REPOSITORY_NAME \
    --region $REGION \
    --image-scanning-configuration scanOnPush=true \
    || echo "仓库已存在"

# 创建 ECS 集群
echo "创建 ECS 集群..."
aws ecs create-cluster \
    --cluster-name $CLUSTER_NAME \
    --region $REGION \
    || echo "集群已存在"

# 创建日志组
echo "创建 CloudWatch 日志组..."
aws logs create-log-group \
    --log-group-name /ecs/$SERVICE_NAME \
    --region $REGION \
    || echo "日志组已存在"

echo "✅ AWS 基础设施设置完成"
echo ""
echo "下一步:"
echo "1. 创建 RDS 数据库实例"
echo "2. 创建 ElastiCache Redis 集群"
echo "3. 配置 Security Groups"
echo "4. 部署应用: ./scripts/deploy-all.sh"
