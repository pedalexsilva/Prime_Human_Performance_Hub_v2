-- Add helper function to validate token encryption
-- This helps identify if tokens are properly encrypted and can be decrypted

CREATE OR REPLACE FUNCTION public.validate_whoop_token_encryption(
  p_user_id UUID,
  p_encryption_key TEXT
) 
RETURNS BOOLEAN
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Try to decrypt tokens to check if they're valid
  BEGIN
    PERFORM 
      pgp_sym_decrypt(dc.access_token::bytea, p_encryption_key)
    FROM device_connections dc
    WHERE dc.user_id = p_user_id
      AND dc.platform = 'whoop'
      AND dc.is_active = true;
    
    v_result := FOUND;
  EXCEPTION 
    WHEN OTHERS THEN
      v_result := FALSE;
  END;
  
  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_whoop_token_encryption TO authenticated;

-- Add function to clean up corrupted tokens
CREATE OR REPLACE FUNCTION public.delete_corrupted_whoop_tokens(
  p_user_id UUID
) 
RETURNS VOID
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM device_connections
  WHERE user_id = p_user_id
    AND platform = 'whoop'
    AND is_active = true;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_corrupted_whoop_tokens TO authenticated;
