/**
 * Final Setup Script - Creates table and inserts data
 * This combines all steps into one
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'platform-logos';
const LOGOS = [
    { platformName: 'whoop', displayName: 'Whoop', fileName: 'whoop.png' },
    { platformName: 'oura', displayName: 'Oura', fileName: 'oura.png' },
    { platformName: 'garmin', displayName: 'Garmin', fileName: 'garmin.png' },
    { platformName: 'strava', displayName: 'Strava', fileName: 'strava.png' },
];

async function checkAndInsertData() {
    console.log('🔍 Checking Supabase setup...\n');

    // 1. Check bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.find(b => b.name === BUCKET_NAME);

    if (bucket) {
        console.log(`✅ Bucket "${BUCKET_NAME}" exists`);

        // List files
        const { data: files } = await supabase.storage.from(BUCKET_NAME).list();
        console.log(`   Files uploaded: ${files?.length || 0}/4`);
        files?.forEach(file => console.log(`   - ${file.name}`));
    } else {
        console.log(`❌ Bucket "${BUCKET_NAME}" NOT found`);
        console.log('   Run: npx tsx scripts/setup-platform-logos.ts');
        return;
    }

    // 2. Check if table exists by trying to select
    console.log('\n📊 Checking platform_logos table...');
    const { data: existingData, error: selectError } = await supabase
        .from('platform_logos')
        .select('*');

    if (selectError) {
        if (selectError.message.includes('does not exist')) {
            console.log('❌ Table does not exist');
            console.log('\n📝 MANUAL STEP REQUIRED:');
            console.log('   Go to Supabase Dashboard → SQL Editor');
            console.log('   Run this SQL:\n');

            const sql = `
-- Create table
CREATE TABLE IF NOT EXISTS public.platform_logos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name TEXT UNIQUE NOT NULL,
  logo_url TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_logos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to platform logos"
  ON public.platform_logos FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated users to manage platform logos"
  ON public.platform_logos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Create index
CREATE INDEX idx_platform_logos_platform_name ON public.platform_logos(platform_name);
      `.trim();

            console.log(sql);
            console.log('\n   Then run this script again to insert data.\n');
            return;
        } else {
            console.error('❌ Error checking table:', selectError.message);
            return;
        }
    }

    console.log(`✅ Table exists with ${existingData?.length || 0} rows`);

    // 3. Insert/update data
    console.log('\n💾 Inserting/updating logo data...');

    const logoData = LOGOS.map(logo => ({
        platform_name: logo.platformName,
        logo_url: `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${logo.fileName}`,
        display_name: logo.displayName
    }));

    for (const logo of logoData) {
        const { error } = await supabase
            .from('platform_logos')
            .upsert(logo, {
                onConflict: 'platform_name',
                ignoreDuplicates: false
            });

        if (error) {
            console.error(`❌ Error inserting ${logo.platform_name}:`, error.message);
        } else {
            console.log(`✅ ${logo.display_name}`);
        }
    }

    // 4. Final verification
    console.log('\n✅ Verifying final setup...');
    const { data: finalData } = await supabase
        .from('platform_logos')
        .select('*')
        .order('platform_name');

    console.log(`\n📊 Platform logos (${finalData?.length || 0}):`);
    finalData?.forEach(logo => {
        console.log(`   ✓ ${logo.display_name} (${logo.platform_name})`);
    });

    console.log('\n🎉 Setup complete! Open SetupModal in your app to see the logos.\n');
}

checkAndInsertData();
