#!/bin/bash
set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="redpocket-api"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"

echo "🚀 Deploying RedPocket Go Backend"
echo "Region: $AWS_REGION"
echo "Image: $ECR_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"

# 1. Login to ECR
echo "📦 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

# 2. Build Docker image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:$IMAGE_TAG ..

# 3. Tag and push to ECR
echo "📤 Pushing to ECR..."
docker tag $IMAGE_NAME:$IMAGE_TAG $ECR_REGISTRY/$IMAGE_NAME:$IMAGE_TAG
docker tag $IMAGE_NAME:$IMAGE_TAG $ECR_REGISTRY/$IMAGE_NAME:latest
docker push $ECR_REGISTRY/$IMAGE_NAME:$IMAGE_TAG
docker push $ECR_REGISTRY/$IMAGE_NAME:latest

# 4. Update ECS service (if using ECS)
if [ -n "$ECS_CLUSTER" ] && [ -n "$ECS_SERVICE" ]; then
    echo "🔄 Updating ECS service..."
    aws ecs update-service \
        --cluster $ECS_CLUSTER \
        --service $ECS_SERVICE \
        --force-new-deployment \
        --region $AWS_REGION
fi

# 5. Or deploy to EC2 via SSH
if [ -n "$EC2_HOST" ]; then
    echo "🖥️ Deploying to EC2..."
    ssh -i "$SSH_KEY" ec2-user@$EC2_HOST << EOF
        cd /opt/redpocket
        export ECR_REGISTRY=$ECR_REGISTRY
        export IMAGE_TAG=$IMAGE_TAG
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
        docker-compose -f docker-compose.prod.yml pull
        docker-compose -f docker-compose.prod.yml up -d
        docker system prune -f
EOF
fi

echo "✅ Deployment complete!"
