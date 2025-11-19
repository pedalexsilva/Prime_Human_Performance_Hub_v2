-- Fix ambiguous column reference in get_whoop_tokens function
-- The issue was that the RETURNS TABLE columns had the same names as the table columns

CREATE OR REPLACE FUNCTION public.get_whoop_tokens(
  p_user_id UUID,
  p_encryption_key TEXT
) 
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Added explicit column aliases to avoid ambiguity with RETURNS TABLE columns
    pgp_sym_decrypt(dc.access_token::bytea, p_encryption_key)::TEXT AS access_token,
    pgp_sym_decrypt(dc.refresh_token::bytea, p_encryption_key)::TEXT AS refresh_token,
    dc.token_expires_at AS expires_at
  FROM device_connections dc
  WHERE dc.user_id = p_user_id
    AND dc.platform = 'whoop'
    AND dc.is_active = true;
END;
$$;
