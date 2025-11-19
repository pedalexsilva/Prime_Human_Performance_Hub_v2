-- Drop all versions of functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS public.save_whoop_tokens CASCADE;
DROP FUNCTION IF EXISTS public.get_whoop_tokens CASCADE;

-- Note: Actual functions are created in scripts/017_update_token_functions_for_bytea.sql
-- which properly targets the whoop_tokens table
