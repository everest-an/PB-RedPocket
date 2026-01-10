# Protocol Bank RedPocket - Deployment Guide

## Quick Start

### Option 1: AWS EC2 (Recommended)

1. **Configure AWS CLI** on your local machine:
   ```bash
   aws configure
   ```

2. **Run the AWS setup script**:
   ```bash
   chmod +x deploy/aws-cli-setup.sh
   ./deploy/aws-cli-setup.sh
   ```

3. **SSH into the instance** and complete setup:
   ```bash
   ssh -i redpocket-key.pem ec2-user@<PUBLIC_IP>
   cd PB-RedPocket/PB-RedPocket-main
   chmod +x deploy/ec2-setup.sh
   ./deploy/ec2-setup.sh
   ```

### Option 2: Manual Docker Deployment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/everest-an/PB-RedPocket.git
   cd PB-RedPocket/PB-RedPocket-main
   ```

2. **Create environment file**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services**:
   ```bash
   docker-compose up -d --build
   ```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | JWT signing secret |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `ETH_RPC_URL` | Ethereum RPC endpoint |

### SSL Certificate Setup

For production, use Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --webroot -w /var/www/certbot -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem deploy/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem deploy/ssl/

# Restart nginx
docker-compose restart nginx
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx (Port 80/443)                       │
│                    - SSL Termination                         │
│                    - Rate Limiting                           │
│                    - Load Balancing                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Next.js App (Port 3000)                     │
│                    - API Routes                              │
│                    - Frontend                                │
│                    - Webhook Handlers                        │
└─────────────────────────────────────────────────────────────┘
                    │                   │
                    ▼                   ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│   PostgreSQL (5432)     │   │     Redis (6379)        │
│   - User Data           │   │   - Session Cache       │
│   - RedPockets          │   │   - Rate Limiting       │
│   - Claims              │   │   - Real-time Data      │
└─────────────────────────┘   └─────────────────────────┘
```

## Useful Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app

# Stop all services
docker-compose down

# Update and rebuild
git pull origin main
docker-compose up -d --build

# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d redpocket

# Access Redis
docker-compose exec redis redis-cli

# Run database migrations
docker-compose exec app npx prisma migrate deploy
```

## Monitoring

### Health Check Endpoint
```
GET /api/health
```

### Metrics Endpoint
```
GET /api/metrics
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs app

# Check if ports are in use
sudo lsof -i :3000
sudo lsof -i :5432
sudo lsof -i :6379
```

### Database connection issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres pg_isready
```

### SSL certificate issues
```bash
# Check certificate validity
openssl x509 -in deploy/ssl/fullchain.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew
```

## Security Checklist

- [ ] Change default database password
- [ ] Set strong JWT secret
- [ ] Configure firewall (only ports 80, 443, 22)
- [ ] Enable SSL/TLS
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Enable fail2ban for SSH
- [ ] Regular security updates
