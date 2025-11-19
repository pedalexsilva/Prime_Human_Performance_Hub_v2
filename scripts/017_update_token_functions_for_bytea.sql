-- Update token functions to work correctly with BYTEA encryption
-- Requires pgcrypto extension

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop all possible function signatures more aggressively
-- Drop by schema and name without specifying parameters to catch all overloads
DROP FUNCTION IF EXISTS public.save_whoop_tokens(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.save_whoop_tokens(UUID, TEXT, TEXT, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.save_whoop_tokens CASCADE;
DROP FUNCTION IF EXISTS save_whoop_tokens CASCADE;

DROP FUNCTION IF EXISTS public.get_whoop_tokens(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_whoop_tokens(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_whoop_tokens CASCADE;
DROP FUNCTION IF EXISTS get_whoop_tokens CASCADE;

-- Create function with explicit signature matching lib/whoop/tokens.ts
CREATE OR REPLACE FUNCTION public.save_whoop_tokens(
  p_user_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_expires_at TIMESTAMPTZ,
  p_encryption_key TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Explicit BYTEA casting for encrypted values
  INSERT INTO whoop_tokens (
    user_id,
    access_token,
    refresh_token,
    expires_at,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    pgp_sym_encrypt(p_access_token, p_encryption_key)::BYTEA,
    CASE WHEN p_refresh_token IS NOT NULL AND p_refresh_token != ''
         THEN pgp_sym_encrypt(p_refresh_token, p_encryption_key)::BYTEA
         ELSE NULL 
    END,
    p_expires_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    access_token = pgp_sym_encrypt(p_access_token, p_encryption_key)::BYTEA,
    refresh_token = CASE WHEN p_refresh_token IS NOT NULL AND p_refresh_token != ''
                         THEN pgp_sym_encrypt(p_refresh_token, p_encryption_key)::BYTEA
                         ELSE whoop_tokens.refresh_token
                    END,
    expires_at = p_expires_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get function matching the expected signature
CREATE OR REPLACE FUNCTION public.get_whoop_tokens(
  p_user_id UUID,
  p_encryption_key TEXT
)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pgp_sym_decrypt(wt.access_token, p_encryption_key)::TEXT,
    CASE WHEN wt.refresh_token IS NOT NULL 
         THEN pgp_sym_decrypt(wt.refresh_token, p_encryption_key)::TEXT
         ELSE NULL 
    END,
    wt.expires_at
  FROM whoop_tokens wt
  WHERE wt.user_id = p_user_id
    AND wt.access_token IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.save_whoop_tokens(UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_whoop_tokens(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.save_whoop_tokens IS 'Saves encrypted Whoop tokens (access and optional refresh) for a user';
COMMENT ON FUNCTION public.get_whoop_tokens IS 'Retrieves and decrypts Whoop tokens for a user';
