-- =====================================================
-- PORTAL INTEGRADO - CORE SCHEMA
-- Fase 1: Estrutura base de dados
-- =====================================================

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('athlete', 'doctor', 'admin');
CREATE TYPE connection_status AS ENUM ('pending', 'active', 'inactive');
CREATE TYPE platform_type AS ENUM ('whoop', 'strava', 'garmin');
CREATE TYPE alert_priority AS ENUM ('critical', 'warning', 'info');
CREATE TYPE alert_status AS ENUM ('unread', 'read', 'dismissed');

-- =====================================================
-- PROFILES TABLE
-- Extends auth.users with application-specific data
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  preferred_language TEXT DEFAULT 'pt' CHECK (preferred_language IN ('pt', 'en')),
  preferred_unit_system TEXT DEFAULT 'metric' CHECK (preferred_unit_system IN ('metric', 'imperial')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- DOCTOR-PATIENT RELATIONSHIPS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.doctor_patient_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status connection_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, patient_id),
  CHECK (doctor_id != patient_id)
);

-- Enable RLS
ALTER TABLE public.doctor_patient_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Doctors can view their relationships"
  ON public.doctor_patient_relationships FOR SELECT
  USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

CREATE POLICY "Doctors can insert relationships"
  ON public.doctor_patient_relationships FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Both parties can update relationship status"
  ON public.doctor_patient_relationships FOR UPDATE
  USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

-- Index for performance
CREATE INDEX idx_doctor_patient_doctor ON public.doctor_patient_relationships(doctor_id, status);
CREATE INDEX idx_doctor_patient_patient ON public.doctor_patient_relationships(patient_id, status);

-- =====================================================
-- DEVICE CONNECTIONS (OAuth2 credentials)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.device_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  -- Tokens stored encrypted (will use pgcrypto in future)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.device_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own connections"
  ON public.device_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON public.device_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON public.device_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON public.device_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_device_connections_user_active ON public.device_connections(user_id, platform, is_active);
