/**
 * Create platform_logos table via Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const BUCKET_NAME = 'platform-logos';

const LOGOS = [
    { platformName: 'whoop', displayName: 'Whoop', fileName: 'whoop.png' },
    { platformName: 'oura', displayName: 'Oura', fileName: 'oura.png' },
    { platformName: 'garmin', displayName: 'Garmin', fileName: 'garmin.png' },
    { platformName: 'strava', displayName: 'Strava', fileName: 'strava.png' },
];

async function createTable() {
    console.log('🗄️  Creating platform_logos table...\n');

    // Try to create the table using raw SQL
    // Note: Supabase client doesn't directly support DDL, so we'll use the REST API

    const createTableSQL = `
create table if not exists public.platform_logos (
  id uuid default gen_random_uuid() primary key,
  platform_name text unique not null,
  logo_url text not null,
  display_name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_logos enable row level security;

drop policy if exists "Allow public read access to platform logos" on public.platform_logos;
drop policy if exists "Allow authenticated users to manage platform logos" on public.platform_logos;

create policy "Allow public read access to platform logos"
  on public.platform_logos
  for select
  to public
  using (true);

create policy "Allow authenticated users to manage platform logos"
  on public.platform_logos
  for all
  to authenticated
  using (true)
  with check (true);

create index if not exists idx_platform_logos_platform_name on public.platform_logos(platform_name);
  `.trim();

    // Use Supabase Management API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/run_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ query: createTableSQL })
    });

    if (!response.ok) {
        // If that doesn't work, try creating via direct table operations
        console.log('ℹ️  Direct SQL execution not available, trying alternative method...\n');

        // We can't create tables via the JS client, but we can check if it exists
        const { error: checkError } = await supabase
            .from('platform_logos')
            .select('id')
            .limit(1);

        if (checkError && checkError.message.includes('does not exist')) {
            console.log('❌ Table does not exist and cannot be created via API.');
            console.log('📝 Please run the following SQL in Supabase Dashboard → SQL Editor:\n');
            console.log(createTableSQL);
            console.log('\nOnce created, run: npx tsx scripts/insert-logo-data.ts');
            return false;
        }
    }

    console.log('✅ Table created successfully (or already exists)');
    return true;
}

async function insertData() {
    console.log('\n💾 Inserting logo data...\n');

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
            console.log(`✅ Inserted/Updated ${logo.display_name} (${logo.platform_name})`);
        }
    }
}

async function verify() {
    console.log('\n🔍 Verifying setup...\n');

    const { data, error } = await supabase
        .from('platform_logos')
        .select('*')
        .order('platform_name');

    if (error) {
        console.error('❌ Error verifying:', error.message);
        return;
    }

    console.log('📊 Platform logos in database:');
    data?.forEach(logo => {
        console.log(`   ✓ ${logo.display_name} (${logo.platform_name})`);
        console.log(`     URL: ${logo.logo_url}`);
    });

    console.log('\n🎉 Setup complete!\n');
    console.log('Test the logos by opening the SetupModal in your app.');
}

async function main() {
    const tableCreated = await createTable();

    if (tableCreated !== false) {
        await insertData();
        await verify();
    }
}

main();
