-- Create table for tracking data validation errors
-- This helps identify data quality issues from external APIs

CREATE TABLE IF NOT EXISTS data_validation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('whoop', 'strava', 'garmin')),
  data_type TEXT NOT NULL CHECK (data_type IN ('cycle', 'sleep', 'workout', 'activity')),
  error_message TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_validation_errors_user_platform 
  ON data_validation_errors(user_id, platform, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_validation_errors_created_at 
  ON data_validation_errors(created_at DESC);

-- Enable Row Level Security
ALTER TABLE data_validation_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Doctors can view validation errors for their patients
CREATE POLICY "Doctors can view validation errors for their patients"
  ON data_validation_errors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_relationships dpr
      WHERE dpr.patient_id = data_validation_errors.user_id
      AND dpr.doctor_id = auth.uid()
      AND dpr.status = 'active'
    )
  );

-- Policy: Users can view their own validation errors
CREATE POLICY "Users can view their own validation errors"
  ON data_validation_errors
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: System can insert validation errors (service role only)
CREATE POLICY "System can insert validation errors"
  ON data_validation_errors
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE data_validation_errors IS 
  'Stores validation errors from external API data to track data quality issues and help with debugging';

COMMENT ON COLUMN data_validation_errors.raw_data IS 
  'Original JSON data that failed validation - useful for debugging and improving validation rules';
