/**
 * Verify Supabase Platform Logos Setup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function verify() {
    console.log('🔍 Verifying Supabase Setup...\n');

    // Check bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.find(b => b.name === 'platform-logos');

    if (bucket) {
        console.log('✅ Bucket "platform-logos" exists');

        // List files in bucket
        const { data: files } = await supabase.storage
            .from('platform-logos')
            .list();

        console.log(`   Files: ${files?.length || 0}`);
        files?.forEach(file => console.log(`   - ${file.name}`));
    } else {
        console.log('❌ Bucket "platform-logos" NOT found');
    }

    // Check table
    const { data: tableData, error: tableError } = await supabase
        .from('platform_logos')
        .select('*');

    if (!tableError) {
        console.log(`\n✅ Table "platform_logos" exists with ${tableData?.length || 0} rows`);
        tableData?.forEach(row => console.log(`   - ${row.display_name}: ${row.platform_name}`));
    } else {
        console.log(`\n❌ Table "platform_logos" NOT found: ${tableError.message}`);
    }
}

verify();
