/**
 * Upload Logo Images to Supabase Storage
 * Run this after creating the storage bucket
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET_NAME = 'platform-logos';

const imageFiles = [
    { source: 'uploaded_image_0_1763727032891.png', target: 'oura.png' },
    { source: 'uploaded_image_1_1763727032891.png', target: 'strava.png' },
    { source: 'uploaded_image_2_1763727032891.png', target: 'garmin.png' },
    { source: 'uploaded_image_3_1763727032891.png', target: 'whoop.png' },
];

async function uploadLogos() {
    console.log('📤 Uploading logo images to Supabase Storage...\n');

    const artifactsDir = path.join(__dirname, '..', '..', '.gemini', 'antigravity', 'brain', 'daafecde-75c3-46fd-9584-4ef93317f024');

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
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${target}`;
            console.log(`✅ Uploaded ${target}`);
            console.log(`   URL: ${publicUrl}`);
        }
    }

    console.log('\n✅ All logos uploaded successfully!\n');
    console.log('📝 Next step: Run the SQL migration in Supabase Dashboard → SQL Editor');
    console.log('   File: supabase/migrations/20250121_create_platform_logos.sql\n');
}

uploadLogos();
