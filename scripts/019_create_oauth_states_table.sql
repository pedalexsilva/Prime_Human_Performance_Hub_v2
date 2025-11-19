-- Create oauth_states table for secure OAuth flow
-- This table stores temporary state tokens to prevent CSRF attacks

CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for fast state lookup
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state) WHERE NOT used;

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at) WHERE NOT used;

-- Enable RLS
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own states
CREATE POLICY "Users can read own oauth states"
  ON public.oauth_states
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all states (for callback validation)
CREATE POLICY "Service role can manage oauth states"
  ON public.oauth_states
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to cleanup expired states (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.oauth_states
  WHERE expires_at < NOW() OR used = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_oauth_states() TO authenticated;

COMMENT ON TABLE public.oauth_states IS 'Stores OAuth state tokens for CSRF protection during Whoop authorization flow';
COMMENT ON COLUMN public.oauth_states.state IS 'Random state token sent to OAuth provider';
COMMENT ON COLUMN public.oauth_states.user_id IS 'User initiating the OAuth flow';
COMMENT ON COLUMN public.oauth_states.expires_at IS 'When this state expires (10 minutes from creation)';
COMMENT ON COLUMN public.oauth_states.used IS 'Whether this state has been consumed in a callback';
