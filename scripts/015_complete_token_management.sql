-- Complete token management functions with proper error handling
-- Ensures all functions used by the application are available

-- Function to delete corrupted tokens (if not exists from script 013)
CREATE OR REPLACE FUNCTION public.delete_corrupted_whoop_tokens(
  p_user_id UUID
) 
RETURNS VOID
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Mark connection as inactive and clear tokens
  UPDATE device_connections
  SET 
    is_active = false,
    access_token = NULL,
    refresh_token = NULL,
    token_expires_at = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND platform = 'whoop';
    
  -- Log the cleanup action
  INSERT INTO sync_logs (
    user_id,
    platform,
    sync_started_at,
    sync_completed_at,
    status,
    error_message
  ) VALUES (
    p_user_id,
    'whoop',
    NOW(),
    NOW(),
    'failed',
    'Tokens corrompidos removidos. Re-autenticação necessária.'
  );
END;
$$;

-- Function to validate token encryption (if not exists from script 013)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_corrupted_whoop_tokens TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_whoop_token_encryption TO authenticated, service_role;
