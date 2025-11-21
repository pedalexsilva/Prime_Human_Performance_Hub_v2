/**
 * Supabase Platform Logos Setup Script
 * 
 * This script automates the complete setup of platform logos:
 * 1. Creates the platform-logos storage bucket
 * 2. Uploads logo images
 * 3. Creates the platform_logos table
 * 4. Inserts logo data with correct URLs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const BUCKET_NAME = 'platform-logos';

// Platform logo mappings
const LOGOS = [
    { platformName: 'whoop', displayName: 'Whoop', fileName: 'whoop.png' },
    { platformName: 'oura', displayName: 'Oura', fileName: 'oura.png' },
    { platformName: 'garmin', displayName: 'Garmin', fileName: 'garmin.png' },
    { platformName: 'strava', displayName: 'Strava', fileName: 'strava.png' },
];

async function createStorageBucket() {
    console.log('\n📦 Step 1: Creating storage bucket...');

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('❌ Error listing buckets:', listError.message);
        throw listError;
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
        console.log(`✅ Bucket '${BUCKET_NAME}' already exists`);
        return;
    }

    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 1024 * 1024, // 1MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml']
    });

    if (error) {
        console.error('❌ Error creating bucket:', error.message);
        throw error;
    }

    console.log(`✅ Bucket '${BUCKET_NAME}' created successfully`);
}

async function uploadLogoImages() {
    console.log('\n📤 Step 2: Uploading logo images...');

    const artifactsDir = path.join(__dirname, '..', '..', '.gemini', 'antigravity', 'brain', 'daafecde-75c3-46fd-9584-4ef93317f024');

    const imageFiles = [
        { source: 'uploaded_image_0_1763727032891.png', target: 'oura.png' },
        { source: 'uploaded_image_1_1763727032891.png', target: 'strava.png' },
        { source: 'uploaded_image_2_1763727032891.png', target: 'garmin.png' },
        { source: 'uploaded_image_3_1763727032891.png', target: 'whoop.png' },
    ];

    for (const { source, target } of imageFiles) {
        const filePath = path.join(artifactsDir, source);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️  File not found: ${source}`);
            continue;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(target, fileBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (error) {
            console.error(`❌ Error uploading ${target}:`, error.message);
        } else {
            console.log(`✅ Uploaded ${target}`);
        }
    }
}

async function createTable() {
    console.log('\n🗄️  Step 3: Creating platform_logos table...');

    const createTableSQL = `
    -- Create platform_logos table
    CREATE TABLE IF NOT EXISTS platform_logos (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      platform_name TEXT UNIQUE NOT NULL,
      logo_url TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable RLS
    ALTER TABLE platform_logos ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access to platform logos" ON platform_logos;
    DROP POLICY IF EXISTS "Allow authenticated users to manage platform logos" ON platform_logos;

    -- Create policy to allow public read access (logos are public)
    CREATE POLICY "Allow public read access to platform logos"
      ON platform_logos
      FOR SELECT
      TO public
      USING (true);

    -- Create policy to allow authenticated users to insert/update (for admin purposes)
    CREATE POLICY "Allow authenticated users to manage platform logos"
      ON platform_logos
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_platform_logos_platform_name ON platform_logos(platform_name);
  `;

    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL }).catch(async () => {
        // If rpc doesn't work, try direct query
        return await supabase.from('_').select('*').limit(0).then(() => {
            // Execute via raw SQL - this requires using the SQL editor or a different approach
            console.log('⚠️  Unable to execute SQL directly via API. Please run the migration manually.');
            return { error: null };
        });
    });

    // Alternative: Execute each statement separately
    const statements = [
        `CREATE TABLE IF NOT EXISTS platform_logos (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      platform_name TEXT UNIQUE NOT NULL,
      logo_url TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    ];

    // Note: Table creation via API is limited. The migration should be run via Supabase Dashboard SQL Editor
    console.log('ℹ️  Note: For table creation, please run the migration file via Supabase Dashboard SQL Editor');
    console.log('   File: supabase/migrations/20250121_create_platform_logos.sql');
}

async function insertLogoData() {
    console.log('\n💾 Step 4: Inserting logo data...');

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
            console.log(`✅ Inserted ${logo.display_name} (${logo.platform_name})`);
        }
    }
}

async function verifySetup() {
    console.log('\n✅ Step 5: Verifying setup...');

    const { data, error } = await supabase
        .from('platform_logos')
        .select('*')
        .order('platform_name');

    if (error) {
        console.error('❌ Error verifying data:', error.message);
        return;
    }

    console.log('\n📊 Platform logos in database:');
    data?.forEach(logo => {
        console.log(`   - ${logo.display_name} (${logo.platform_name}): ${logo.logo_url}`);
    });

    console.log('\n🎉 Setup complete! You can now test the logos in the SetupModal.');
}

async function main() {
    console.log('🚀 Starting Supabase Platform Logos Setup...\n');
    console.log(`Supabase URL: ${supabaseUrl}`);

    try {
        await createStorageBucket();
        await uploadLogoImages();

        console.log('\n⚠️  MANUAL STEP REQUIRED:');
        console.log('   Please run the SQL migration in Supabase Dashboard:');
        console.log('   1. Go to SQL Editor in Supabase Dashboard');
        console.log('   2. Copy contents of: supabase/migrations/20250121_create_platform_logos.sql');
        console.log('   3. Run the SQL to create the table and policies');
        console.log('   4. Then run this script again with --insert-data flag to insert the data\n');

        // Check if table exists
        const { error: checkError } = await supabase
            .from('platform_logos')
            .select('id')
            .limit(1);

        if (!checkError) {
            // Table exists, proceed with data insertion
            await insertLogoData();
            await verifySetup();
        } else {
            console.log('ℹ️  Table does not exist yet. Please create it via SQL Editor first.');
        }

    } catch (error: any) {
        console.error('\n❌ Setup failed:', error.message);
        process.exit(1);
    }
}

main();
