const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
let envContent = '';

try {
    const buffer = fs.readFileSync(envPath);
    // Remove null bytes and other non-printable chars (keep newlines)
    let cleanContent = '';
    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        if (byte >= 32 && byte <= 126) {
            cleanContent += String.fromCharCode(byte);
        } else if (byte === 10 || byte === 13) {
            cleanContent += String.fromCharCode(byte);
        }
    }
    console.log('Cleaned content:');
    console.log(cleanContent);

    // Parse cleaned content
    envContent = cleanContent;
} catch (e) {
    console.error('Could not read .env.local:', e.message);
    process.exit(1);
}

const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes
        envVars[key] = value;
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('Checking data...');

    const { data: summaries, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .order('summary_date', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching summaries:', error);
        return;
    }

    if (!summaries || summaries.length === 0) {
        console.log('No daily summaries found in the table.');
        return;
    }

    console.log(`Found ${summaries.length} recent summaries.`);
    summaries.forEach(s => {
        console.log(`\nDate: ${s.summary_date}, User: ${s.user_id}`);
        console.log(`Recovery: ${s.avg_recovery_score}`);
        console.log(`HRV: ${s.avg_hrv_rmssd}`);
        console.log(`Sleep: ${s.total_sleep_minutes}`);
        console.log(`Strain: ${s.total_strain}`);
    });
}

checkData();
