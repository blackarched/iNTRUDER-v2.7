-- NEXUS SECURITY GRID DATABASE SCHEMA V2.1
-- Production-ready with idempotency checks

-- Enable required extensions if they don't already exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Security Nodes Table: Core infrastructure registry
CREATE TABLE IF NOT EXISTS security_nodes (
    node_id SERIAL PRIMARY KEY,
    node_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    designation VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    port INTEGER DEFAULT 8080,
    stream_path VARCHAR(200) DEFAULT '/video',
    node_type VARCHAR(50) DEFAULT 'generic',
    status VARCHAR(20) DEFAULT 'offline',
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Users Table: Authentication and authorization
CREATE TABLE IF NOT EXISTS system_users (
    user_id SERIAL PRIMARY KEY,
    user_uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Surveillance Events Table: Motion detection and threat assessment
CREATE TABLE IF NOT EXISTS surveillance_events (
    event_id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES security_nodes(node_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    threat_level INTEGER DEFAULT 1,
    confidence_score FLOAT DEFAULT 0.0,
    event_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recording Sessions Table: Video storage management
CREATE TABLE IF NOT EXISTS recording_sessions (
    session_id SERIAL PRIMARY KEY,
    node_id INTEGER REFERENCES security_nodes(node_id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'active'
);

-- Create indexes only if they do not exist
CREATE INDEX IF NOT EXISTS idx_security_nodes_status ON security_nodes(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON system_users(username);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON surveillance_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_node_id_type ON surveillance_events(node_id, event_type);

-- Insert default admin user if one doesn't exist
INSERT INTO system_users (username, email, password_hash, role)
SELECT 'admin', 'admin@nexus.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewweFdNWAd8aBi8q', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'admin');