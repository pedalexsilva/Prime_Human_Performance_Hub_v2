-- =====================================================
-- HEALTH METRICS TABLES
-- Normalized structure for wearable data
-- =====================================================

-- =====================================================
-- SLEEP METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sleep_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source_platform platform_type NOT NULL,
  metric_date DATE NOT NULL,
  
  -- Sleep duration & quality
  sleep_duration_minutes INTEGER,
  sleep_quality_score INTEGER CHECK (sleep_quality_score >= 0 AND sleep_quality_score <= 100),
  
  -- Sleep stages (in minutes)
  sleep_stage_deep_minutes INTEGER,
  sleep_stage_light_minutes INTEGER,
  sleep_stage_rem_minutes INTEGER,
  sleep_stage_awake_minutes INTEGER,
  
  -- Sleep efficiency
  sleep_efficiency_percentage DECIMAL(5,2),
  sleep_onset_latency_minutes INTEGER,
  
  -- Disturbances
  disturbances_count INTEGER,
  
  -- Raw data for future analysis
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_platform, metric_date)
);

-- Enable RLS
ALTER TABLE public.sleep_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Athletes view own sleep metrics"
  ON public.sleep_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors view patient sleep metrics"
  ON public.sleep_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patient_relationships
      WHERE doctor_id = auth.uid()
      AND patient_id = sleep_metrics.user_id
      AND status = 'active'
    )
  );

-- Index for temporal queries
CREATE INDEX idx_sleep_metrics_user_date ON public.sleep_metrics(user_id, metric_date DESC);
CREATE INDEX idx_sleep_metrics_platform ON public.sleep_metrics(source_platform);

-- =====================================================
-- RECOVERY METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.recovery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source_platform platform_type NOT NULL,
  metric_date DATE NOT NULL,
  
  -- Recovery score (0-100)
  recovery_score INTEGER CHECK (recovery_score >= 0 AND recovery_score <= 100),
  
  -- Heart Rate Variability
  hrv_rmssd DECIMAL(10,2), -- milliseconds
  
  -- Resting heart rate
  resting_heart_rate INTEGER, -- bpm
  
  -- Additional metrics
  skin_temp_celsius DECIMAL(4,2),
  spo2_percentage DECIMAL(5,2),
  respiratory_rate DECIMAL(5,2), -- breaths per minute
  
  -- Raw data
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_platform, metric_date)
);

-- Enable RLS
ALTER TABLE public.recovery_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Athletes view own recovery metrics"
  ON public.recovery_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors view patient recovery metrics"
  ON public.recovery_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patient_relationships
      WHERE doctor_id = auth.uid()
      AND patient_id = recovery_metrics.user_id
      AND status = 'active'
    )
  );

-- Index
CREATE INDEX idx_recovery_metrics_user_date ON public.recovery_metrics(user_id, metric_date DESC);

-- =====================================================
-- WORKOUT METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workout_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  source_platform platform_type NOT NULL,
  metric_date DATE NOT NULL,
  workout_id TEXT, -- External platform workout ID
  
  -- Workout details
  strain_score DECIMAL(5,2) CHECK (strain_score >= 0 AND strain_score <= 21), -- Whoop scale
  calories_burned INTEGER,
  activity_duration_minutes INTEGER,
  
  -- Heart rate data
  avg_heart_rate INTEGER, -- bpm
  max_heart_rate INTEGER, -- bpm
  
  -- Activity type
  activity_type TEXT,
  
  -- Distance (stored in meters, normalized)
  distance_meters DECIMAL(10,2),
  
  -- Raw data
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_platform, workout_id)
);

-- Enable RLS
ALTER TABLE public.workout_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Athletes view own workout metrics"
  ON public.workout_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Doctors view patient workout metrics"
  ON public.workout_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.doctor_patient_relationships
      WHERE doctor_id = auth.uid()
      AND patient_id = workout_metrics.user_id
      AND status = 'active'
    )
  );

-- Index
CREATE INDEX idx_workout_metrics_user_date ON public.workout_metrics(user_id, metric_date DESC);
CREATE INDEX idx_workout_metrics_workout_id ON public.workout_metrics(workout_id);
