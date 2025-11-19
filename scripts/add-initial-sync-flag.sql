-- Add initial_sync_completed flag to device_connections table
-- This flag tracks whether the initial 15-day historical sync has been completed

ALTER TABLE device_connections 
ADD COLUMN IF NOT EXISTS initial_sync_completed BOOLEAN DEFAULT false;

-- Add comment to document the field
COMMENT ON COLUMN device_connections.initial_sync_completed IS 
'Indicates if the initial 15-day historical sync has been completed. First sync fetches 15 days, subsequent syncs fetch 7 days.';
