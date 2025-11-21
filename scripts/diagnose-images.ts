/**
 * Diagnose Broken Images
 * Lists current URLs and checks if they are accessible
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
    console.log('🔍 Diagnosing Broken Images...\n');
    console.log(`Project URL: ${supabaseUrl}`);

    // 1. Get URLs from DB
    const { data: logos } = await supabase
        .from('platform_logos')
        .select('*');

    console.log('\n📊 Stored URLs in Database:');
    logos?.forEach(logo => {
        console.log(`   - ${logo.platform_name}: ${logo.logo_url}`);
    });

    // 2. Check Storage Bucket Public URL format
    const { data: publicUrlData } = supabase.storage
        .from('platform-logos')
        .getPublicUrl('test.png');

    console.log(`\nExpected Public URL format: ${publicUrlData.publicUrl}`);

    // 3. List files in bucket
    const { data: files } = await supabase.storage
        .from('platform-logos')
        .list();

    console.log('\n📂 Files in Bucket:');
    files?.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.mimetype}) - Size: ${file.metadata?.size}`);
    });
}

diagnose();
