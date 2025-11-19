-- Enable pgcrypto extension for token encryption
-- This must be run before the token functions can work
-- Run this migration FIRST before any other migrations that use encryption

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify the extension is enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension failed to install';
  END IF;
END $$;

-- Add comment
COMMENT ON EXTENSION pgcrypto IS 'Cryptographic functions for Whoop token encryption';
