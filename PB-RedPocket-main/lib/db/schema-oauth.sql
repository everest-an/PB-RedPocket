-- ============================================================================
-- OAuth and Webhook Schema Extension
-- Description: Additional tables for OAuth2 tokens and webhook event tracking
-- ============================================================================

-- ============================================================================
-- OAuth Tokens Table
-- ============================================================================

CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    scope TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, platform)
);

CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_platform ON oauth_tokens(platform);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- Apply update trigger
CREATE TRIGGER update_oauth_tokens_updated_at
    BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Webhook Events Table
-- ============================================================================

CREATE TYPE webhook_status AS ENUM ('pending', 'processing', 'success', 'failed', 'skipped');

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform platform_type NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255),
    payload JSONB NOT NULL,
    signature VARCHAR(255),
    status webhook_status DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(platform, event_id)
);

CREATE INDEX idx_webhook_events_platform ON webhook_events(platform);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_created ON webhook_events(created_at);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);

-- ============================================================================
-- Identity Merge Requests Table
-- ============================================================================

CREATE TYPE merge_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');

CREATE TABLE identity_merge_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_platform platform_type NOT NULL,
    target_platform platform_type NOT NULL,
    status merge_status DEFAULT 'pending',
    verification_code VARCHAR(10),
    verification_expires_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT different_users CHECK (source_user_id != target_user_id)
);

CREATE INDEX idx_merge_requests_source ON identity_merge_requests(source_user_id);
CREATE INDEX idx_merge_requests_target ON identity_merge_requests(target_user_id);
CREATE INDEX idx_merge_requests_status ON identity_merge_requests(status);

-- ============================================================================
-- Bot Sessions Table (for conversation state)
-- ============================================================================

CREATE TABLE bot_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform platform_type NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    chat_id VARCHAR(255) NOT NULL,
    state VARCHAR(50) DEFAULT 'idle',
    context JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(platform, platform_user_id, chat_id)
);

CREATE INDEX idx_bot_sessions_platform ON bot_sessions(platform, platform_user_id);
CREATE INDEX idx_bot_sessions_expires ON bot_sessions(expires_at);

-- Apply update trigger
CREATE TRIGGER update_bot_sessions_updated_at
    BEFORE UPDATE ON bot_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Platform Channels Table (for RedPocket distribution)
-- ============================================================================

CREATE TABLE platform_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enterprise_id UUID NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    channel_id VARCHAR(255) NOT NULL,
    channel_name VARCHAR(255),
    channel_type VARCHAR(50),
    member_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    bot_added_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(platform, channel_id)
);

CREATE INDEX idx_platform_channels_enterprise ON platform_channels(enterprise_id);
CREATE INDEX idx_platform_channels_platform ON platform_channels(platform);

-- Apply update trigger
CREATE TRIGGER update_platform_channels_updated_at
    BEFORE UPDATE ON platform_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Withdrawal Requests Table
-- ============================================================================

CREATE TYPE withdrawal_type AS ENUM ('web3', 'fiat');
CREATE TYPE withdrawal_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    withdrawal_type withdrawal_type NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    token_symbol VARCHAR(20) NOT NULL,
    token_address VARCHAR(42),
    source_chain_id INTEGER NOT NULL,
    
    -- Web3 withdrawal fields
    destination_address VARCHAR(42),
    destination_chain_id INTEGER,
    tx_hash VARCHAR(66),
    
    -- Fiat withdrawal fields
    fiat_provider VARCHAR(50),
    fiat_currency VARCHAR(10),
    fiat_amount DECIMAL(18, 2),
    provider_reference VARCHAR(255),
    
    status withdrawal_status DEFAULT 'pending',
    gas_sponsored BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created ON withdrawal_requests(created_at);

-- ============================================================================
-- Views
-- ============================================================================

-- User rewards summary view
CREATE VIEW user_rewards_summary AS
SELECT 
    u.id AS user_id,
    u.display_name,
    u.wallet_address,
    COUNT(DISTINCT sl.platform) AS linked_platforms,
    COUNT(DISTINCT c.id) AS total_claims,
    COALESCE(SUM(c.amount), 0) AS total_claimed,
    u.total_withdrawn,
    COALESCE(SUM(c.amount), 0) - u.total_withdrawn AS available_balance
FROM users u
LEFT JOIN social_links sl ON sl.user_id = u.id
LEFT JOIN claims c ON c.user_id = u.id AND c.status = 'success'
GROUP BY u.id, u.display_name, u.wallet_address, u.total_withdrawn;

-- Platform activity summary view
CREATE VIEW platform_activity_summary AS
SELECT 
    platform,
    DATE(created_at) AS activity_date,
    COUNT(DISTINCT user_id) AS active_users,
    COUNT(*) AS total_claims,
    SUM(amount) AS total_distributed
FROM claims
WHERE status = 'success'
GROUP BY platform, DATE(created_at)
ORDER BY activity_date DESC, platform;
