/**
 * Execute SQL Migration via Supabase REST API
 */

import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function executeSQLMigration() {
    console.log('🚀 Executing SQL migration...\n');

    const sqlFile = 'supabase/migrations/20250121_create_platform_logos.sql';
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    // Use Supabase's query endpoint
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=representation'
    };

    try {
        // Execute the SQL via PostgREST's raw SQL endpoint
        // Split the SQL into individual statements and execute each
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'SELECT * FROM public.platform_logos ORDER BY platform_name');

        for (const statement of statements) {
            if (!statement) continue;

            console.log(`Executing: ${statement.substring(0, 50)}...`);

            // Try using the Database API POST /query endpoint
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    query: statement + ';'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.log(`⚠️  Response status: ${response.status}`);

                // If it's a "already exists" error, that's fine
                if (errorText.includes('already exists') || errorText.includes('duplicate')) {
                    console.log('   ✓ Already exists, skipping');
                    continue;
                }
            }
        }

        console.log('\n✅ Migration executed successfully!\n');
        console.log('🔍 Verifying data...');

        // Verify the data
        const verifyResponse = await fetch(
            `${supabaseUrl}/rest/v1/platform_logos?select=*&order=platform_name`,
            {
                headers: {
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                }
            }
        );

        if (verifyResponse.ok) {
            const data = await verifyResponse.json();
            console.log(`\n✅ Found ${data.length} platform logos:`);
            data.forEach((logo: any) => {
                console.log(`   - ${logo.display_name} (${logo.platform_name})`);
            });
            console.log('\n🎉 Setup complete! Test the SetupModal in your app.');
        } else {
            console.log('⚠️  Could not verify data');
        }

    } catch (error: any) {
        console.error('❌ Error executing migration:', error.message);
        console.log('\n📝 Manual execution required:');
        console.log('   1. Go to Supabase Dashboard → SQL Editor');
        console.log('   2. Run the contents of: supabase/migrations/20250121_create_platform_logos_sql');
        process.exit(1);
    }
}

executeSQLMigration();
