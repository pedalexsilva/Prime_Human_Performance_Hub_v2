-- Complete Platform Logos Setup SQL
-- Execute this in Supabase Dashboard → SQL Editor

-- 1. Create the platform_logos table
CREATE TABLE IF NOT EXISTS public.platform_logos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name TEXT UNIQUE NOT NULL,
  logo_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.platform_logos ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to platform logos" ON public.platform_logos;
DROP POLICY IF EXISTS "Allow authenticated users to manage platform logos" ON public.platform_logos;

-- 4. Create RLS policies
CREATE POLICY "Allow public read access to platform logos"
  ON public.platform_logos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to manage platform logos"
  ON public.platform_logos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_platform_logos_platform_name 
  ON public.platform_logos(platform_name);

-- 6. Insert platform logo data
-- Note: Update these URLs after uploading images to Storage
INSERT INTO public.platform_logos (platform_name, logo_url, display_name) VALUES
  ('whoop', 'https://yokqfifizcdtrzqprjow.supabase.co/storage/v1/object/public/platform-logos/whoop.png', 'Whoop'),
  ('oura', 'https://yokqfifizcdtrzqprjow.supabase.co/storage/v1/object/public/platform-logos/oura.png', 'Oura'),
  ('garmin', 'https://yokqfifizcdtrzqprjow.supabase.co/storage/v1/object/public/platform-logos/garmin.png', 'Garmin'),
  ('strava', 'https://yokqfifizcdtrzqprjow.supabase.co/storage/v1/object/public/platform-logos/strava.png', 'Strava')
ON CONFLICT (platform_name) 
DO UPDATE SET 
  logo_url = EXCLUDED.logo_url,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- 7. Verify the data
SELECT * FROM public.platform_logos ORDER BY platform_name;
