-- Fix device_connections RLS to allow service role operations
-- This is needed for admin operations and cron jobs

-- Allow service role to manage all connections
CREATE POLICY "Service role can manage all device connections"
  ON public.device_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
