"use client"

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'

export default function DebugHRVPage() {
    const [output, setOutput] = useState<string[]>([])
    const [loading, setLoading] = useState(false)

    const addLog = (message: string) => {
        setOutput(prev => [...prev, message])
    }

    const checkHRVData = async () => {
        setOutput([])
        setLoading(true)

        try {
            const supabase = createBrowserClient()

            addLog('=== Checking HRV Data via Supabase API ===\n')

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser()

            if (userError || !user) {
                addLog('❌ Not authenticated: ' + JSON.stringify(userError))
                return
            }

            addLog('✅ Authenticated as: ' + user.email)
            addLog('User ID: ' + user.id + '\n')

            // 1. Check profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError) {
                addLog('❌ Profile error: ' + JSON.stringify(profileError))
            } else {
                addLog('👤 Profile: ' + JSON.stringify(profile, null, 2))
            }

            // 2. Check device connections
            const { data: connections, error: connectionsError } = await supabase
                .from('device_connections')
                .select('*')
                .eq('user_id', user.id)

            addLog('\n📱 Device Connections:')
            if (connectionsError) {
                addLog('❌ Error: ' + JSON.stringify(connectionsError))
            } else if (!connections || connections.length === 0) {
                addLog('⚠️  No device connections found')
            } else {
                connections.forEach(conn => {
                    addLog(`  - ${conn.platform}: ${JSON.stringify({
                        is_active: conn.is_active,
                        last_sync_at: conn.last_sync_at,
                        created_at: conn.created_at
                    }, null, 2)}`)
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

            addLog('\n💪 Recovery Metrics (last 7 days):')
            if (recoveryError) {
                addLog('❌ Error: ' + JSON.stringify(recoveryError))
            } else if (!recoveryMetrics || recoveryMetrics.length === 0) {
                addLog('⚠️  No recovery metrics found')
            } else {
                addLog(`Found ${recoveryMetrics.length} records:`)
                recoveryMetrics.forEach(m => {
                    addLog(`  ${m.metric_date}: ${JSON.stringify({
                        hrv_rmssd: m.hrv_rmssd,
                        recovery_score: m.recovery_score,
                        resting_heart_rate: m.resting_heart_rate,
                        source: m.source_platform
                    }, null, 2)}`)
                })
            }

            // 4. Check daily_summaries (last 7 days)
            const { data: dailySummaries, error: summariesError } = await supabase
                .from('daily_summaries')
                .select('*')
                .eq('user_id', user.id)
                .gte('summary_date', dateStr)
                .order('summary_date', { ascending: false })

            addLog('\n📊 Daily Summaries (last 7 days):')
            if (summariesError) {
                addLog('❌ Error: ' + JSON.stringify(summariesError))
            } else if (!dailySummaries || dailySummaries.length === 0) {
                addLog('⚠️  No daily summaries found')
            } else {
                addLog(`Found ${dailySummaries.length} records:`)
                dailySummaries.forEach(s => {
                    addLog(`  ${s.summary_date}: ${JSON.stringify({
                        avg_hrv_rmssd: s.avg_hrv_rmssd,
                        avg_recovery_score: s.avg_recovery_score,
                        avg_resting_hr: s.avg_resting_hr,
                        total_sleep_minutes: s.total_sleep_minutes,
                        total_strain: s.total_strain,
                        data_completeness: s.data_completeness,
                        sources: s.sources
                    }, null, 2)}`)
                })
            }

            // 5. Check what the dashboard API returns
            addLog('\n🎯 Dashboard API Response:')
            try {
                const response = await fetch('/api/athlete/dashboard')
                const result = await response.json()

                if (result.success) {
                    addLog('✅ Dashboard data: ' + JSON.stringify({
                        recovery_score: result.data.recovery_score,
                        hrv_rmssd: result.data.hrv_rmssd,
                        resting_heart_rate: result.data.resting_heart_rate,
                        sleep_duration_minutes: result.data.sleep_duration_minutes,
                        strain_score: result.data.strain_score,
                        has_data: result.data.has_data,
                        connected_services: result.data.connected_services,
                        last_sync: result.data.last_sync
                    }, null, 2))
                } else {
                    addLog('❌ Dashboard API error: ' + JSON.stringify(result.error))
                }
            } catch (error) {
                addLog('❌ Failed to fetch dashboard: ' + String(error))
            }

            addLog('\n=== Check Complete ===')
        } catch (error) {
            addLog('❌ Fatal error: ' + String(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6">Debug HRV Data</h1>

                <button
                    onClick={checkHRVData}
                    disabled={loading}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed mb-6"
                >
                    {loading ? 'Checking...' : 'Check HRV Data'}
                </button>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Output:</h2>
                    <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
                        {output.length === 0 ? 'Click "Check HRV Data" to start...' : output.join('\n')}
                    </pre>
                </div>
            </div>
        </div>
    )
}
