-- =====================================================
-- ALERTS & NOTIFICATIONS SYSTEM
-- =====================================================

-- =====================================================
-- ALERT THRESHOLDS (configurable by doctor)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  metric_name TEXT NOT NULL, -- 'hrv_rmssd', 'recovery_score', 'sleep_duration_minutes', etc.
  threshold_value DECIMAL(10,2) NOT NULL,
  comparison_operator TEXT NOT NULL CHECK (comparison_operator IN ('<', '>', '<=', '>=')),
  priority alert_priority NOT NULL,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (doctor_id != patient_id)
);

-- Enable RLS
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Doctors manage their thresholds"
  ON public.alert_thresholds FOR ALL
  USING (auth.uid() = doctor_id);

CREATE POLICY "Patients view thresholds set for them"
  ON public.alert_thresholds FOR SELECT
  USING (auth.uid() = patient_id);

-- Index
CREATE INDEX idx_alert_thresholds_patient_active ON public.alert_thresholds(patient_id, is_active);

-- =====================================================
-- ALERTS (generated automatically)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  threshold_value DECIMAL(10,2) NOT NULL,
  priority alert_priority NOT NULL,
  
  message TEXT NOT NULL,
  metric_date DATE NOT NULL,
  
  status alert_status DEFAULT 'unread',
  read_at TIMESTAMPTZ,
  
  -- Notification tracking
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  in_app_notified BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Patients view own alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors view patient alerts"
  ON public.alerts FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors update alert status"
  ON public.alerts FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Indexes
CREATE INDEX idx_alerts_patient_status ON public.alerts(patient_id, status, created_at DESC);
CREATE INDEX idx_alerts_doctor_unread ON public.alerts(doctor_id, status) WHERE status = 'unread';
CREATE INDEX idx_alerts_priority ON public.alerts(priority, created_at DESC);

-- =====================================================
-- NOTIFICATIONS (in-app)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  type TEXT NOT NULL CHECK (type IN ('alert', 'message', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority alert_priority NOT NULL,
  
  -- Link/action
  action_url TEXT,
  related_alert_id UUID REFERENCES public.alerts(id) ON DELETE SET NULL,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
