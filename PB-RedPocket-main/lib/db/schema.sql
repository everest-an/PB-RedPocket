-- ============================================================================
-- RedPocket Database Schema
-- Description: PostgreSQL schema for cross-chain incentive distribution system
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Enum Types
-- ============================================================================

CREATE TYPE platform_type AS ENUM ('telegram', 'discord', 'whatsapp', 'github');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
CREATE TYPE redpocket_status AS ENUM ('pending', 'active', 'depleted', 'expired', 'cancelled');
CREATE TYPE claim_status AS ENUM ('pending', 'processing', 'success', 'failed', 'refunded');
CREATE TYPE wallet_type AS ENUM ('aa', 'eoa');
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'claim', 'refund', 'gas_sponsorship', 'bridge');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed');
CREATE TYPE entity_type AS ENUM ('user', 'enterprise', 'campaign', 'redpocket', 'claim', 'wallet', 'transaction');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'claim', 'withdraw', 'deposit', 'login', 'logout');
CREATE TYPE actor_type AS ENUM ('user', 'enterprise', 'system', 'admin');

-- ============================================================================
-- Users Table
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform platform_type NOT NULL,
    platform_id VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    display_name VARCHAR(100),
    avatar_url TEXT,
    total_claimed DECIMAL(36, 18) DEFAULT 0,
    total_withdrawn DECIMAL(36, 18) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(platform, platform_id)
);

CREATE INDEX idx_users_platform ON users(platform);
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- Enterprises Table
-- ============================================================================

CREATE TABLE enterprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    wallet_address VARCHAR(42) NOT NULL,
    api_key_hash VARCHAR(64),
    balance DECIMAL(36, 18) DEFAULT 0,
    total_deposited DECIMAL(36, 18) DEFAULT 0,
    total_spent DECIMAL(36, 18) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_enterprises_wallet ON enterprises(wallet_address);
CREATE INDEX idx_enterprises_email ON enterprises(email);


-- ============================================================================
-- Campaigns Table
-- ============================================================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_budget DECIMAL(36, 18) NOT NULL,
    spent_budget DECIMAL(36, 18) DEFAULT 0,
    token_symbol VARCHAR(20) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    platform platform_type NOT NULL,
    total_redpockets INTEGER DEFAULT 0,
    total_claims INTEGER DEFAULT 0,
    unique_claimers INTEGER DEFAULT 0,
    tag VARCHAR(50),
    status campaign_status DEFAULT 'draft',
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_enterprise ON campaigns(enterprise_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_dates ON campaigns(starts_at, ends_at);

-- ============================================================================
-- RedPockets Table
-- ============================================================================

CREATE TABLE redpockets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    sender_name VARCHAR(100) NOT NULL,
    sender_avatar TEXT,
    total_amount DECIMAL(36, 18) NOT NULL,
    remaining_amount DECIMAL(36, 18) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    platform platform_type NOT NULL,
    platform_channel_id VARCHAR(255),
    message TEXT,
    tag VARCHAR(50),
    total_count INTEGER NOT NULL,
    claimed_count INTEGER DEFAULT 0,
    is_lucky_draw BOOLEAN DEFAULT FALSE,
    min_amount DECIMAL(36, 18),
    max_amount DECIMAL(36, 18),
    contract_address VARCHAR(42),
    contract_id INTEGER,
    status redpocket_status DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_redpockets_campaign ON redpockets(campaign_id);
CREATE INDEX idx_redpockets_enterprise ON redpockets(enterprise_id);
CREATE INDEX idx_redpockets_status ON redpockets(status);
CREATE INDEX idx_redpockets_platform ON redpockets(platform);
CREATE INDEX idx_redpockets_expires ON redpockets(expires_at);
CREATE INDEX idx_redpockets_contract ON redpockets(contract_address, contract_id);

-- ============================================================================
-- Claims Table
-- ============================================================================

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    redpocket_id UUID NOT NULL REFERENCES redpockets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    platform_id VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    gas_used BIGINT,
    gas_sponsored BOOLEAN DEFAULT TRUE,
    status claim_status DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(redpocket_id, user_id)
);

CREATE INDEX idx_claims_redpocket ON claims(redpocket_id);
CREATE INDEX idx_claims_user ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_tx ON claims(tx_hash);
CREATE INDEX idx_claims_created ON claims(created_at);

-- ============================================================================
-- Wallets Table
-- ============================================================================

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    wallet_type wallet_type DEFAULT 'aa',
    is_deployed BOOLEAN DEFAULT FALSE,
    salt VARCHAR(66),
    init_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, chain_id)
);

CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_address ON wallets(address);
CREATE INDEX idx_wallets_chain ON wallets(chain_id);


-- ============================================================================
-- Transactions Table
-- ============================================================================

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    enterprise_id UUID REFERENCES enterprises(id) ON DELETE SET NULL,
    tx_hash VARCHAR(66) NOT NULL,
    chain_id INTEGER NOT NULL,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    value VARCHAR(78) NOT NULL,
    token_address VARCHAR(42),
    token_amount VARCHAR(78),
    tx_type transaction_type NOT NULL,
    status transaction_status DEFAULT 'pending',
    gas_used BIGINT,
    gas_price VARCHAR(78),
    block_number BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_enterprise ON transactions(enterprise_id);
CREATE INDEX idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_type ON transactions(tx_type);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ============================================================================
-- Audit Logs Table
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type entity_type NOT NULL,
    entity_id UUID NOT NULL,
    action audit_action NOT NULL,
    actor_type actor_type NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================================
-- Social Identity Links Table (for account merging)
-- ============================================================================

CREATE TABLE social_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    platform_id VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(platform, platform_id)
);

CREATE INDEX idx_social_links_user ON social_links(user_id);

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_enterprises_updated_at
    BEFORE UPDATE ON enterprises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_redpockets_updated_at
    BEFORE UPDATE ON redpockets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Views for Dashboard
-- ============================================================================

-- Enterprise dashboard view
CREATE VIEW enterprise_dashboard AS
SELECT 
    e.id AS enterprise_id,
    e.name,
    e.balance,
    COUNT(DISTINCT c.id) AS total_campaigns,
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) AS active_campaigns,
    COUNT(DISTINCT r.id) AS total_redpockets,
    COUNT(DISTINCT cl.id) AS total_claims,
    COALESCE(SUM(cl.amount), 0) AS total_distributed,
    COUNT(DISTINCT cl.user_id) AS unique_claimers
FROM enterprises e
LEFT JOIN campaigns c ON c.enterprise_id = e.id
LEFT JOIN redpockets r ON r.enterprise_id = e.id
LEFT JOIN claims cl ON cl.redpocket_id = r.id AND cl.status = 'success'
GROUP BY e.id, e.name, e.balance;

-- Daily claims aggregation view
CREATE VIEW daily_claims AS
SELECT 
    DATE(created_at) AS claim_date,
    platform,
    COUNT(*) AS claim_count,
    SUM(amount) AS total_amount,
    COUNT(DISTINCT user_id) AS unique_users
FROM claims
WHERE status = 'success'
GROUP BY DATE(created_at), platform
ORDER BY claim_date DESC;
