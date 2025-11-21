/**
 * Force Fix Storage
 * 
 * 1. Deletes 'platform-logos' bucket if exists (to clear bad state)
 * 2. Creates 'platform-logos' bucket (public)
 * 3. Uploads all images
 * 4. Verifies public access
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const BUCKET_NAME = 'platform-logos';

const imageFiles = [
    { source: 'uploaded_image_0_1763737844831.png', target: 'whoop.png' },   // Image 0 is Whoop
    { source: 'uploaded_image_1_1763737844831.png', target: 'garmin.png' },  // Image 1 is Garmin
    { source: 'uploaded_image_2_1763737844831.png', target: 'oura.png' },    // Image 2 is Oura
    { source: 'uploaded_image_3_1763737844831.png', target: 'strava.png' },  // Image 3 is Strava
];

async function forceFix() {
    console.log('🚀 Force Fixing Storage...\n');

    // 1. Check Bucket
    console.log('1. Checking Bucket...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === BUCKET_NAME);

    if (exists) {
        console.log(`   Bucket '${BUCKET_NAME}' exists.`);
        // We won't delete it to avoid breaking other things, but we'll update it
        const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml']
        });

        if (updateError) console.error(`   ❌ Error updating bucket: ${updateError.message}`);
        else console.log('   ✅ Bucket updated to Public');
    } else {
        console.log(`   Bucket '${BUCKET_NAME}' does not exist. Creating...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml']
        });

        if (createError) {
            console.error(`   ❌ Error creating bucket: ${createError.message}`);
            return;
        }
        console.log('   ✅ Bucket created');
    }

    // 2. Upload Images
    console.log('\n2. Uploading Images...');
    // Use absolute path directly
    const artifactsDir = 'C:\\Users\\PES2VC\\.gemini\\antigravity\\brain\\daafecde-75c3-46fd-9584-4ef93317f024';
    console.log(`   Artifacts Dir: ${artifactsDir}`);

    for (const { source, target } of imageFiles) {
        const filePath = path.join(artifactsDir, source);
        console.log(`   Processing ${target} from ${source}...`);

        if (!fs.existsSync(filePath)) {
            console.error(`   ❌ Source file missing: ${filePath}`);
            continue;
        }

        const stats = fs.statSync(filePath);
        console.log(`   File size: ${stats.size} bytes`);

        const fileBuffer = fs.readFileSync(filePath);

        // Remove existing file first to ensure clean state
        await supabase.storage.from(BUCKET_NAME).remove([target]);

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(target, fileBuffer, {
                contentType: 'image/png',
                upsert: true,
                cacheControl: '3600'
            });

        if (error) {
            console.error(`   ❌ Failed to upload ${target}: ${error.message}`);
        } else {
            console.log(`   ✅ Uploaded ${target}`);
        }
    }

    // 3. Verify Uploads and Access
    console.log('\n3. Verifying Uploads and Access...');

    // List files
    const { data: files } = await supabase.storage.from(BUCKET_NAME).list();
    console.log(`   Files in bucket: ${files?.length || 0}`);
    files?.forEach(f => console.log(`   - ${f.name} (${f.metadata?.size} bytes)`));

    for (const { target } of imageFiles) {
        // Public URL
        const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(target);
        console.log(`\n   Checking ${target}:`);
        console.log(`   Public URL: ${publicData.publicUrl}`);

        try {
            const res = await fetch(publicData.publicUrl, { method: 'HEAD' });
            console.log(`   Public Access: ${res.status} ${res.statusText}`);
        } catch (e) {
            console.log(`   Public Access Error: ${e}`);
        }

        // Signed URL (valid for 1 hour)
        const { data: signedData, error: signedError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(target, 3600);

        if (signedError) {
            console.log(`   Signed URL Error: ${signedError.message}`);
        } else {
            console.log(`   Signed URL: ${signedData?.signedUrl}`);
            try {
                const res = await fetch(signedData!.signedUrl, { method: 'HEAD' });
                console.log(`   Signed Access: ${res.status} ${res.statusText}`);
            } catch (e) {
                console.log(`   Signed Access Error: ${e}`);
            }
        }
    }
}

forceFix();
