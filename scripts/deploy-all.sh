#!/bin/bash

set -e

echo "🚀 RedPocket 完整部署脚本"
echo "================================"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查必需工具
check_requirements() {
    echo -e "${YELLOW}检查部署环境...${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}❌ AWS CLI 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        echo -e "${YELLOW}⚠️  Terraform 未安装 (可选)${NC}"
    fi
    
    echo -e "${GREEN}✅ 环境检查通过${NC}\n"
}

# 部署前端到 Vercel
deploy_frontend() {
    echo -e "${YELLOW}📦 部署前端到 Vercel...${NC}"
    
    if command -v vercel &> /dev/null; then
        vercel --prod
        echo -e "${GREEN}✅ 前端部署成功${NC}\n"
    else
        echo -e "${YELLOW}⚠️  Vercel CLI 未安装，请手动部署或安装: npm i -g vercel${NC}\n"
    fi
}

# 部署后端到 AWS
deploy_backend() {
    echo -e "${YELLOW}🔧 部署后端到 AWS ECS...${NC}"
    
    # 获取 AWS 账户 ID
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION="us-east-1"
    REPOSITORY="redpocket-backend"
    
    # 登录 ECR
    echo "登录 ECR..."
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
    
    # 构建并推送 Docker 镜像
    echo "构建 Docker 镜像..."
    cd backend
    docker build -t $REPOSITORY:latest .
    
    docker tag $REPOSITORY:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY:latest
    
    echo "推送镜像到 ECR..."
    docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY:latest
    
    # 更新 ECS 服务
    echo "更新 ECS 服务..."
    aws ecs update-service \
        --cluster redpocket-cluster \
        --service redpocket-service \
        --force-new-deployment \
        --region $REGION
    
    cd ..
    echo -e "${GREEN}✅ 后端部署成功${NC}\n"
}

# 部署智能合约
deploy_contracts() {
    echo -e "${YELLOW}📜 部署智能合约...${NC}"
    
    cd contracts
    
    # 编译合约
    echo "编译合约..."
    npm run compile
    
    # 运行测试
    echo "运行测试..."
    npm run test
    
    # 部署到主网
    read -p "是否部署到主网? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "部署到 Polygon..."
        npm run deploy:polygon
        
        echo "部署到 Arbitrum..."
        npm run deploy:arbitrum
        
        echo "部署到 Optimism..."
        npm run deploy:optimism
        
        echo "验证合约..."
        npm run verify
    else
        echo "跳过主网部署"
    fi
    
    cd ..
    echo -e "${GREEN}✅ 合约部署完成${NC}\n"
}

# 运行数据库迁移
run_migrations() {
    echo -e "${YELLOW}💾 运行数据库迁移...${NC}"
    
    cd backend
    npm run migrate:latest
    
    echo -e "${GREEN}✅ 数据库迁移完成${NC}\n"
    cd ..
}

# 健康检查
health_check() {
    echo -e "${YELLOW}🏥 运行健康检查...${NC}"
    
    # 检查前端
    if curl -f https://protocolbanks.com > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端健康${NC}"
    else
        echo -e "${RED}❌ 前端无响应${NC}"
    fi
    
    # 检查后端
    if curl -f https://api.protocolbanks.com/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端健康${NC}"
    else
        echo -e "${RED}❌ 后端无响应${NC}"
    fi
    
    echo
}

# 主菜单
main() {
    check_requirements
    
    echo "请选择部署选项:"
    echo "1. 完整部署 (前端 + 后端 + 合约)"
    echo "2. 仅前端"
    echo "3. 仅后端"
    echo "4. 仅智能合约"
    echo "5. 运行数据库迁移"
    echo "6. 健康检查"
    echo "0. 退出"
    echo
    read -p "选择 (0-6): " choice
    
    case $choice in
        1)
            deploy_frontend
            deploy_backend
            deploy_contracts
            run_migrations
            health_check
            ;;
        2)
            deploy_frontend
            ;;
        3)
            deploy_backend
            run_migrations
            health_check
            ;;
        4)
            deploy_contracts
            ;;
        5)
            run_migrations
            ;;
        6)
            health_check
            ;;
        0)
            echo "退出"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            exit 1
            ;;
    esac
    
    echo -e "\n${GREEN}🎉 部署完成！${NC}"
}

main
