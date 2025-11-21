import { createBrowserClient } from '@/lib/supabase/client'

/**
 * Script to check HRV data via Supabase API
 * Run this in the browser console or as a Next.js API route
 */
async function checkHRVData() {
    const supabase = createBrowserClient()

    console.log('=== Checking HRV Data via Supabase API ===\n')

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        console.error('❌ Not authenticated:', userError)
        return
    }

    console.log('✅ Authenticated as:', user.email)
    console.log('User ID:', user.id, '\n')

    // 1. Check profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error('❌ Profile error:', profileError)
    } else {
        console.log('👤 Profile:', profile)
    }

    // 2. Check device connections
    const { data: connections, error: connectionsError } = await supabase
        .from('device_connections')
        .select('*')
        .eq('user_id', user.id)

    console.log('\n📱 Device Connections:')
    if (connectionsError) {
        console.error('❌ Error:', connectionsError)
    } else if (!connections || connections.length === 0) {
        console.log('⚠️  No device connections found')
    } else {
        connections.forEach(conn => {
            console.log(`  - ${conn.platform}:`, {
                is_active: conn.is_active,
                last_sync_at: conn.last_sync_at,
                created_at: conn.created_at
            })
        })
    }

    // 3. Check recovery_metrics (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const dateStr = sevenDaysAgo.toISOString().split('T')[0]

    const { data: recoveryMetrics, error: recoveryError } = await supabase
        .from('recovery_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('metric_date', dateStr)
        .order('metric_date', { ascending: false })

    console.log('\n💪 Recovery Metrics (last 7 days):')
    if (recoveryError) {
        console.error('❌ Error:', recoveryError)
    } else if (!recoveryMetrics || recoveryMetrics.length === 0) {
        console.log('⚠️  No recovery metrics found')
    } else {
        console.log(`Found ${recoveryMetrics.length} records:`)
        recoveryMetrics.forEach(m => {
            console.log(`  ${m.metric_date}:`, {
                hrv_rmssd: m.hrv_rmssd,
                recovery_score: m.recovery_score,
                resting_heart_rate: m.resting_heart_rate,
                source: m.source_platform
            })
        })
    }

    // 4. Check daily_summaries (last 7 days)
    const { data: dailySummaries, error: summariesError } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', user.id)
        .gte('summary_date', dateStr)
        .order('summary_date', { ascending: false })

    console.log('\n📊 Daily Summaries (last 7 days):')
    if (summariesError) {
        console.error('❌ Error:', summariesError)
    } else if (!dailySummaries || dailySummaries.length === 0) {
        console.log('⚠️  No daily summaries found')
    } else {
        console.log(`Found ${dailySummaries.length} records:`)
        dailySummaries.forEach(s => {
            console.log(`  ${s.summary_date}:`, {
                avg_hrv_rmssd: s.avg_hrv_rmssd,
                avg_recovery_score: s.avg_recovery_score,
                avg_resting_hr: s.avg_resting_hr,
                total_sleep_minutes: s.total_sleep_minutes,
                total_strain: s.total_strain,
                data_completeness: s.data_completeness,
                sources: s.sources
            })
        })
    }

    // 5. Check what the dashboard API returns
    console.log('\n🎯 Dashboard API Response:')
    try {
        const response = await fetch('/api/athlete/dashboard')
        const result = await response.json()

        if (result.success) {
            console.log('✅ Dashboard data:', {
                recovery_score: result.data.recovery_score,
                hrv_rmssd: result.data.hrv_rmssd,
                resting_heart_rate: result.data.resting_heart_rate,
                sleep_duration_minutes: result.data.sleep_duration_minutes,
                strain_score: result.data.strain_score,
                has_data: result.data.has_data,
                connected_services: result.data.connected_services,
                last_sync: result.data.last_sync
            })
        } else {
            console.error('❌ Dashboard API error:', result.error)
        }
    } catch (error) {
        console.error('❌ Failed to fetch dashboard:', error)
    }

    console.log('\n=== Check Complete ===')
}

// Export for use in browser console or API route
if (typeof window !== 'undefined') {
    // Browser environment - attach to window
    (window as any).checkHRVData = checkHRVData
    console.log('✅ Run checkHRVData() in console to check data')
} else {
    // Node environment - run directly
    checkHRVData().catch(console.error)
}

export { checkHRVData }
