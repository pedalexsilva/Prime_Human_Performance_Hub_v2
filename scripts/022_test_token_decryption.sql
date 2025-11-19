-- Test script to manually verify encryption/decryption works
-- This helps diagnose if the issue is with the key or the data

DO $$
DECLARE
  v_test_user_id UUID := 'f1895867-35e2-46cb-aa7b-9c4cabcb2973';
  v_encryption_key TEXT := current_setting('app.whoop_encryption_key', true);
  v_test_access TEXT := 'test_access_token_12345';
  v_test_refresh TEXT := 'test_refresh_token_67890';
  v_encrypted_access BYTEA;
  v_encrypted_refresh BYTEA;
  v_decrypted_access TEXT;
  v_decrypted_refresh TEXT;
BEGIN
  -- Get encryption key from environment or use placeholder
  IF v_encryption_key IS NULL OR v_encryption_key = '' THEN
    RAISE NOTICE 'No encryption key found in settings, using placeholder for test';
    v_encryption_key := 'test_key_replace_with_real_whoop_encryption_key_64_chars_long';
  END IF;

  RAISE NOTICE 'Testing encryption/decryption with key length: %', length(v_encryption_key);
  
  -- Test 1: Encrypt test data
  BEGIN
    v_encrypted_access := pgp_sym_encrypt(v_test_access, v_encryption_key);
    v_encrypted_refresh := pgp_sym_encrypt(v_test_refresh, v_encryption_key);
    RAISE NOTICE '[TEST 1] ✓ Successfully encrypted test tokens';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[TEST 1] ✗ Failed to encrypt test tokens: %', SQLERRM;
    RETURN;
  END;
  
  -- Test 2: Decrypt test data
  BEGIN
    v_decrypted_access := pgp_sym_decrypt(v_encrypted_access, v_encryption_key);
    v_decrypted_refresh := pgp_sym_decrypt(v_encrypted_refresh, v_encryption_key);
    
    IF v_decrypted_access = v_test_access AND v_decrypted_refresh = v_test_refresh THEN
      RAISE NOTICE '[TEST 2] ✓ Successfully decrypted test tokens - encryption/decryption working!';
    ELSE
      RAISE WARNING '[TEST 2] ✗ Decrypted values do not match originals';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[TEST 2] ✗ Failed to decrypt test tokens: %', SQLERRM;
    RETURN;
  END;
  
  -- Test 3: Try to decrypt actual stored tokens for the user
  BEGIN
    DECLARE
      v_stored_access BYTEA;
      v_stored_refresh BYTEA;
    BEGIN
      SELECT access_token, refresh_token
      INTO v_stored_access, v_stored_refresh
      FROM whoop_tokens
      WHERE user_id = v_test_user_id;
      
      IF FOUND THEN
        RAISE NOTICE '[TEST 3] Found stored tokens for user %', v_test_user_id;
        
        IF v_stored_access IS NOT NULL THEN
          BEGIN
            v_decrypted_access := pgp_sym_decrypt(v_stored_access, v_encryption_key);
            RAISE NOTICE '[TEST 3] ✓ Successfully decrypted stored access token (length: %)', length(v_decrypted_access);
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[TEST 3] ✗ Failed to decrypt stored access token: %', SQLERRM;
            RAISE NOTICE '[TEST 3] This suggests the stored token was encrypted with a different key';
          END;
        ELSE
          RAISE WARNING '[TEST 3] ✗ Stored access token is NULL';
        END IF;
        
        IF v_stored_refresh IS NOT NULL THEN
          BEGIN
            v_decrypted_refresh := pgp_sym_decrypt(v_stored_refresh, v_encryption_key);
            RAISE NOTICE '[TEST 3] ✓ Successfully decrypted stored refresh token (length: %)', length(v_decrypted_refresh);
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[TEST 3] ✗ Failed to decrypt stored refresh token: %', SQLERRM;
          END;
        END IF;
      ELSE
        RAISE WARNING '[TEST 3] ✗ No tokens found for user %', v_test_user_id;
      END IF;
    END;
  END;
  
  RAISE NOTICE 'Test complete. Review messages above for diagnostic information.';
END $$;
