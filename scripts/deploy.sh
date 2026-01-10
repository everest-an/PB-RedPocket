#!/bin/bash

echo "🚀 Starting Protocol Bank deployment..."

# Load environment variables
set -a
source .env
set +a

# Build and start services
echo "📦 Building Docker images..."
docker-compose build

echo "🔧 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec app npm run db:migrate

echo "✅ Deployment complete!"
echo "🌐 Application available at http://localhost:3000"
echo "📊 Dashboard available at http://localhost:3000/dashboard"
