-- Remove legacy token columns from device_connections
-- Tokens are now stored ONLY in whoop_tokens table
-- device_connections is used ONLY for connection status tracking

-- Drop the unused token columns from device_connections
ALTER TABLE device_connections
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

-- Add comment to clarify table purpose
COMMENT ON TABLE device_connections IS 'Tracks device connection status. Tokens are stored in whoop_tokens table.';

-- Verify the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Successfully removed token columns from device_connections';
  RAISE NOTICE 'Tokens are now stored exclusively in whoop_tokens table';
END $$;
