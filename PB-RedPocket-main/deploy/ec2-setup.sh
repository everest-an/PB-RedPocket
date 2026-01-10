#!/bin/bash
# =============================================================================
# Protocol Bank RedPocket - EC2 Setup Script
# Run this script on a fresh Amazon Linux 2023 or Ubuntu 22.04 EC2 instance
# =============================================================================

set -e

echo "=========================================="
echo "Protocol Bank RedPocket - EC2 Setup"
echo "=========================================="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS"
    exit 1
fi

echo "Detected OS: $OS"

# =============================================================================
# Install Docker
# =============================================================================
echo ""
echo "Installing Docker..."

if [ "$OS" = "amzn" ]; then
    # Amazon Linux 2023
    sudo dnf update -y
    sudo dnf install -y docker git
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
elif [ "$OS" = "ubuntu" ]; then
    # Ubuntu
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker ubuntu
fi

# =============================================================================
# Install Docker Compose
# =============================================================================
echo ""
echo "Installing Docker Compose..."

DOCKER_COMPOSE_VERSION="v2.24.0"
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# =============================================================================
# Clone Repository
# =============================================================================
echo ""
echo "Cloning repository..."

cd /home/$(whoami)
if [ -d "PB-RedPocket" ]; then
    cd PB-RedPocket
    git pull origin main
else
    git clone https://github.com/everest-an/PB-RedPocket.git
    cd PB-RedPocket
fi

cd PB-RedPocket-main

# =============================================================================
# Create SSL Directory
# =============================================================================
echo ""
echo "Setting up SSL directory..."

mkdir -p deploy/ssl

# Generate self-signed certificate for initial setup
# Replace with Let's Encrypt in production
if [ ! -f deploy/ssl/fullchain.pem ]; then
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout deploy/ssl/privkey.pem \
        -out deploy/ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# =============================================================================
# Create Environment File
# =============================================================================
echo ""
echo "Creating environment file..."

if [ ! -f .env ]; then
    cp .env.example .env
    
    # Generate random passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
    
    # Update .env with generated values
    sed -i "s/DATABASE_PASSWORD=.*/DATABASE_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    sed -i "s/NODE_ENV=.*/NODE_ENV=production/" .env
    
    echo "Generated new .env file with secure passwords"
    echo "Please update the remaining configuration values!"
fi

# =============================================================================
# Start Services
# =============================================================================
echo ""
echo "Starting services with Docker Compose..."

docker-compose up -d --build

# =============================================================================
# Setup Firewall
# =============================================================================
echo ""
echo "Configuring firewall..."

if [ "$OS" = "amzn" ]; then
    # Amazon Linux uses firewalld
    sudo systemctl start firewalld 2>/dev/null || true
    sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
    sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
elif [ "$OS" = "ubuntu" ]; then
    # Ubuntu uses ufw
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
fi

# =============================================================================
# Print Status
# =============================================================================
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Services Status:"
docker-compose ps
echo ""
echo "Next Steps:"
echo "1. Update .env file with your API keys and secrets"
echo "2. Configure your domain DNS to point to this server"
echo "3. Set up Let's Encrypt SSL certificate:"
echo "   sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com"
echo "4. Restart nginx: docker-compose restart nginx"
echo ""
echo "Useful Commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Restart:       docker-compose restart"
echo "  Stop:          docker-compose down"
echo "  Update:        git pull && docker-compose up -d --build"
echo ""
