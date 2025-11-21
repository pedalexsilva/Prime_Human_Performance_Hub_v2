/**
 * Fix Broken Images
 * 1. Re-uploads all images
 * 2. Updates bucket to be public
 * 3. Prints the correct URLs
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

async function fixImages() {
    console.log('🔧 Fixing Platform Logos...\n');

    // 1. Update Bucket to be Public
    console.log('1. Updating bucket configuration...');
    const { data: bucket, error: bucketError } = await supabase.storage.updateBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 2097152, // 2MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml']
    });

    if (bucketError) {
        console.log(`   ⚠️ Error updating bucket: ${bucketError.message}`);
        // Try creating if it doesn't exist
        if (bucketError.message.includes('not found')) {
            console.log('   Creating bucket...');
            await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        }
    } else {
        console.log('   ✅ Bucket updated to Public');
    }

    // 2. Re-upload Images
    console.log('\n2. Re-uploading images...');
    const artifactsDir = path.join(__dirname, '..', '..', '.gemini', 'antigravity', 'brain', 'daafecde-75c3-46fd-9584-4ef93317f024');

    for (const { source, target } of imageFiles) {
        const filePath = path.join(artifactsDir, source);

        if (!fs.existsSync(filePath)) {
            console.warn(`   ⚠️ File not found: ${source}`);
            continue;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(target, fileBuffer, {
                contentType: 'image/png',
                upsert: true,
                cacheControl: '3600'
            });

        if (error) {
            console.error(`   ❌ Error uploading ${target}:`, error.message);
        } else {
            console.log(`   ✅ Uploaded ${target}`);
        }
    }

    // 3. Verify URLs
    console.log('\n3. Verifying URLs...');
    for (const { target } of imageFiles) {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(target);
        console.log(`   - ${target}: ${data.publicUrl}`);

        // Verify if accessible
        try {
            const res = await fetch(data.publicUrl, { method: 'HEAD' });
            console.log(`     Status: ${res.status} ${res.statusText}`);
        } catch (e) {
            console.log(`     ❌ Check failed: ${e}`);
        }
    }
}

fixImages();
