-- Remove the encryption_key column from whoop_tokens table
-- The encryption key should NEVER be stored in the database
-- It's passed as a parameter to the encryption/decryption functions

-- Drop the column from whoop_tokens if it exists
ALTER TABLE whoop_tokens 
DROP COLUMN IF EXISTS encryption_key;

-- Also check device_connections table (legacy table)
ALTER TABLE device_connections 
DROP COLUMN IF EXISTS encryption_key;

COMMENT ON TABLE whoop_tokens IS 'Stores encrypted Whoop OAuth tokens for users. Tokens are encrypted using pgcrypto with a key passed at runtime, NOT stored in the database.';
