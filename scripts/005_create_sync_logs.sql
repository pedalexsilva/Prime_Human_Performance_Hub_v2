-- =====================================================
-- SYNC LOGS (observability)
-- Tracks synchronization executions for debugging
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own sync logs"
  ON public.sync_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_sync_logs_user_platform ON public.sync_logs(user_id, platform, created_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status, created_at DESC);
