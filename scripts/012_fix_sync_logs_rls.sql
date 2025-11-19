-- Add INSERT policy to sync_logs so system can insert logs
-- The issue was that only SELECT policy existed, preventing inserts

-- Policy for authenticated users to insert their own sync logs
CREATE POLICY "Users insert own sync logs"
  ON public.sync_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for service role to insert any sync logs (for cron jobs)
CREATE POLICY "Service role can insert all sync logs"
  ON public.sync_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
