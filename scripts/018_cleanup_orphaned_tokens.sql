-- Cleanup script for orphaned or invalid token records
-- Run this after the schema migration

-- Remove any tokens without a valid user reference
DELETE FROM whoop_tokens 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove any device connections without valid user reference
DELETE FROM device_connections
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Log cleanup results
DO $$
DECLARE
  orphaned_tokens_count INTEGER;
  orphaned_connections_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_tokens_count 
  FROM whoop_tokens 
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  
  SELECT COUNT(*) INTO orphaned_connections_count 
  FROM device_connections 
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  
  RAISE NOTICE 'Cleanup complete. Removed % orphaned token records and % orphaned connection records',
    orphaned_tokens_count, orphaned_connections_count;
END $$;
