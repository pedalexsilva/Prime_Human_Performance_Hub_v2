-- Fix get_whoop_tokens to handle decryption errors properly
-- Instead of failing silently, we'll add exception handling

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_whoop_tokens(UUID, TEXT) CASCADE;

-- Recreate with proper error handling
CREATE OR REPLACE FUNCTION public.get_whoop_tokens(
  p_user_id UUID,
  p_encryption_key TEXT
)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_record RECORD;
  v_decrypted_access TEXT;
  v_decrypted_refresh TEXT;
BEGIN
  -- First check if tokens exist
  SELECT wt.access_token, wt.refresh_token, wt.expires_at
  INTO v_record
  FROM whoop_tokens wt
  WHERE wt.user_id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE '[get_whoop_tokens] No tokens found for user: %', p_user_id;
    RETURN;
  END IF;
  
  IF v_record.access_token IS NULL THEN
    RAISE NOTICE '[get_whoop_tokens] Access token is NULL for user: %', p_user_id;
    RETURN;
  END IF;
  
  -- Try to decrypt access token
  BEGIN
    v_decrypted_access := pgp_sym_decrypt(v_record.access_token, p_encryption_key);
    RAISE NOTICE '[get_whoop_tokens] Successfully decrypted access token for user: %', p_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[get_whoop_tokens] Failed to decrypt access token for user %. Error: %', p_user_id, SQLERRM;
    RETURN;
  END;
  
  -- Try to decrypt refresh token if it exists
  IF v_record.refresh_token IS NOT NULL THEN
    BEGIN
      v_decrypted_refresh := pgp_sym_decrypt(v_record.refresh_token, p_encryption_key);
      RAISE NOTICE '[get_whoop_tokens] Successfully decrypted refresh token for user: %', p_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[get_whoop_tokens] Failed to decrypt refresh token for user %. Error: %', p_user_id, SQLERRM;
      v_decrypted_refresh := NULL;
    END;
  ELSE
    v_decrypted_refresh := NULL;
  END IF;
  
  -- Return decrypted values
  RETURN QUERY SELECT v_decrypted_access, v_decrypted_refresh, v_record.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_whoop_tokens(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_whoop_tokens IS 'Retrieves and decrypts Whoop tokens with proper error handling';
