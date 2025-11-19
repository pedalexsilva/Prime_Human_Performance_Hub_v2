-- Fix token encryption: Change columns from TEXT to BYTEA for proper encryption
-- This script addresses the "Wrong key or corrupt data" error

-- Step 1: Remove NOT NULL constraints first (before any data operations)
ALTER TABLE whoop_tokens 
ALTER COLUMN access_token DROP NOT NULL,
ALTER COLUMN refresh_token DROP NOT NULL;

ALTER TABLE device_connections
ALTER COLUMN access_token DROP NOT NULL,
ALTER COLUMN refresh_token DROP NOT NULL;

-- Step 2: Delete all existing token data (it's corrupted from TEXT/BYTEA mismatch)
DELETE FROM whoop_tokens WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL;
DELETE FROM device_connections WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL;

-- Step 3: Change column types from TEXT to BYTEA
ALTER TABLE whoop_tokens 
ALTER COLUMN access_token TYPE BYTEA USING NULL,
ALTER COLUMN refresh_token TYPE BYTEA USING NULL;

ALTER TABLE device_connections
ALTER COLUMN access_token TYPE BYTEA USING NULL,
ALTER COLUMN refresh_token TYPE BYTEA USING NULL;

-- Step 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_whoop_tokens_user_id ON whoop_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_connections_user_id ON device_connections(user_id);

-- Add comments
COMMENT ON COLUMN whoop_tokens.access_token IS 'Encrypted access token (BYTEA) using pgcrypto';
COMMENT ON COLUMN whoop_tokens.refresh_token IS 'Encrypted refresh token (BYTEA) using pgcrypto';
COMMENT ON COLUMN device_connections.access_token IS 'Encrypted access token (BYTEA) using pgcrypto';
COMMENT ON COLUMN device_connections.refresh_token IS 'Encrypted refresh token (BYTEA) using pgcrypto';
