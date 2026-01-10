-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    social_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    wallet_address VARCHAR(42),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(social_id, platform)
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    address VARCHAR(42) NOT NULL UNIQUE,
    chain_id INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL, -- 'aa' or 'eoa'
    is_deployed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enterprises table
CREATE TABLE IF NOT EXISTS enterprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    balance DECIMAL(20, 6) DEFAULT 0,
    total_spent DECIMAL(20, 6) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID REFERENCES enterprises(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_budget DECIMAL(20, 6) NOT NULL,
    spent_budget DECIMAL(20, 6) DEFAULT 0,
    token VARCHAR(10) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    total_red_pockets INTEGER DEFAULT 0,
    total_claims INTEGER DEFAULT 0,
    tag VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RedPockets table
CREATE TABLE IF NOT EXISTS red_pockets (
    id VARCHAR(100) PRIMARY KEY,
    campaign_id UUID REFERENCES campaigns(id),
    sender_name VARCHAR(255),
    sender_avatar VARCHAR(500),
    amount DECIMAL(20, 6) NOT NULL,
    remaining_amount DECIMAL(20, 6) NOT NULL,
    token VARCHAR(10) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    platform VARCHAR(50) NOT NULL,
    platform_channel_id VARCHAR(255),
    message TEXT,
    tag VARCHAR(100),
    total_count INTEGER NOT NULL,
    claimed_count INTEGER DEFAULT 0,
    is_lucky_draw BOOLEAN DEFAULT FALSE,
    min_amount DECIMAL(20, 6),
    max_amount DECIMAL(20, 6),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Claim records table
CREATE TABLE IF NOT EXISTS claim_records (
    id VARCHAR(100) PRIMARY KEY,
    red_pocket_id VARCHAR(100) REFERENCES red_pockets(id),
    claimer_id UUID REFERENCES users(id),
    claimer_platform_id VARCHAR(255) NOT NULL,
    claimer_platform VARCHAR(50) NOT NULL,
    claimer_wallet_address VARCHAR(42) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_social ON users(social_id, platform);
CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_campaigns_enterprise ON campaigns(enterprise_id);
CREATE INDEX idx_red_pockets_campaign ON red_pockets(campaign_id);
CREATE INDEX idx_claims_red_pocket ON claim_records(red_pocket_id);
CREATE INDEX idx_claims_claimer ON claim_records(claimer_id);
