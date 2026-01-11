-- Enterprises table
CREATE TABLE IF NOT EXISTS enterprises (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default enterprise for development
INSERT INTO enterprises (id, name, email, api_key, status) 
VALUES ('enterprise_default', 'Default Enterprise', 'admin@protocolbanks.com', 'dev_api_key_change_in_production', 'active')
ON CONFLICT (id) DO NOTHING;

-- Red Pockets table
CREATE TABLE IF NOT EXISTS red_pockets (
    id VARCHAR(32) PRIMARY KEY,
    campaign_id VARCHAR(32) NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    sender_avatar VARCHAR(512),
    amount DECIMAL(20, 8) NOT NULL,
    remaining_amount DECIMAL(20, 8) NOT NULL,
    token VARCHAR(32) NOT NULL,
    token_address VARCHAR(66),
    chain_id BIGINT NOT NULL DEFAULT 8453,
    platform VARCHAR(32) NOT NULL,
    channel_id VARCHAR(255),
    message TEXT,
    tag VARCHAR(64),
    total_count INT NOT NULL,
    claimed_count INT NOT NULL DEFAULT 0,
    is_lucky_draw BOOLEAN NOT NULL DEFAULT FALSE,
    min_amount DECIMAL(20, 8),
    max_amount DECIMAL(20, 8),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    
    CONSTRAINT chk_status CHECK (status IN ('active', 'depleted', 'expired', 'cancelled'))
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
    id VARCHAR(32) PRIMARY KEY,
    red_pocket_id VARCHAR(32) NOT NULL REFERENCES red_pockets(id),
    claimer_id VARCHAR(255) NOT NULL,
    platform_id VARCHAR(255) NOT NULL,
    platform VARCHAR(32) NOT NULL,
    wallet_address VARCHAR(66) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    tx_hash VARCHAR(66),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT chk_claim_status CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    CONSTRAINT uq_claim_user UNIQUE (red_pocket_id, platform_id, platform)
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id VARCHAR(32) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    address VARCHAR(66) NOT NULL UNIQUE,
    chain_id BIGINT NOT NULL,
    type VARCHAR(16) NOT NULL DEFAULT 'aa',
    is_deployed BOOLEAN NOT NULL DEFAULT FALSE,
    private_key TEXT NOT NULL, -- Encrypted
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_chain UNIQUE (user_id, chain_id)
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id VARCHAR(32) PRIMARY KEY,
    enterprise_id VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_budget DECIMAL(20, 8) NOT NULL,
    spent_budget DECIMAL(20, 8) NOT NULL DEFAULT 0,
    token VARCHAR(32) NOT NULL,
    token_address VARCHAR(66),
    chain_id BIGINT NOT NULL DEFAULT 8453,
    platform VARCHAR(32) NOT NULL,
    total_pockets INT NOT NULL DEFAULT 0,
    total_claims INT NOT NULL DEFAULT 0,
    tag VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_red_pockets_campaign ON red_pockets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_red_pockets_status ON red_pockets(status);
CREATE INDEX IF NOT EXISTS idx_red_pockets_expires ON red_pockets(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_claims_red_pocket ON claims(red_pocket_id);
CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(platform_id, platform);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_enterprise ON campaigns(enterprise_id);
