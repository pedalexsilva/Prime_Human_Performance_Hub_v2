import { createServerClient } from '@/lib/supabase/server';

export interface SleepMetrics {
    sleep_duration_minutes: number | null;
    sleep_stage_light_minutes: number | null;
    sleep_stage_deep_minutes: number | null;
    sleep_stage_rem_minutes: number | null;
    sleep_stage_awake_minutes: number | null;
    sleep_efficiency_percentage: number | null;
    respiratory_rate: number | null;
    disturbances_count: number | null;
    sleep_onset_latency_minutes: number | null;
}

export interface DashboardMetrics {
    // Latest values
    recovery_score: number | null;
    hrv_rmssd: number | null;
    resting_heart_rate: number | null;
    sleep_duration_minutes: number | null;
    sleep_quality_score: number | null;
    strain_score: number | null;

    // Trends (7-day comparison)
    hrv_trend: number | null; // % change
    recovery_trend: number | null;
    sleep_trend: number | null;

    // Chart data (last 7 days)
    chartData: Array<{
        date: string;
        performance: number; // recovery_score
        stress: number; // strain_score
    }>;

    // Metadata
    last_sync: string | null;
    has_data: boolean;
    connected_services: string[];

    // Detailed Sleep Data
    latestSleepMetrics?: SleepMetrics | null;
}

/**
 * Get comprehensive dashboard data for an athlete
 */
export async function getAthleteDashboardData(userId: string): Promise<DashboardMetrics> {
    const supabase = await createServerClient();

    // Get latest metrics from daily_summaries (most recent 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: summaries, error } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('user_id', userId)
        .gte('summary_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('summary_date', { ascending: false })
        .limit(7);

    if (error) {
        console.error('[Dashboard] Error fetching summaries:', error);
        return getEmptyMetrics();
    }

    if (!summaries || summaries.length === 0) {
        return getEmptyMetrics();
    }

    // Latest (most recent day)
    const latest = summaries[0];

    // Find latest valid sleep data
    const latestSleep = summaries.find(s => s.total_sleep_minutes !== null && s.total_sleep_minutes > 0) || latest;

    // Find latest valid HRV data
    const latestHRV = summaries.find(s => s.avg_hrv_rmssd !== null && s.avg_hrv_rmssd > 0) || latest;

    // Calculate trends (compare latest vs 7-day average)
    const avgRecovery = calculateAverage(summaries.map(s => s.avg_recovery_score));
    const avgHRV = calculateAverage(summaries.map(s => s.avg_hrv_rmssd));
    const avgSleep = calculateAverage(summaries.map(s => s.total_sleep_minutes));

    const recovery_trend = latest.avg_recovery_score && avgRecovery
        ? ((latest.avg_recovery_score - avgRecovery) / avgRecovery) * 100
        : null;

    const hrv_trend = latestHRV.avg_hrv_rmssd && avgHRV
        ? ((latestHRV.avg_hrv_rmssd - avgHRV) / avgHRV) * 100
        : null;

    const sleep_trend = latestSleep.total_sleep_minutes && avgSleep
        ? ((latestSleep.total_sleep_minutes - avgSleep) / avgSleep) * 100
        : null;

    // Chart data (reverse to show oldest first)
    const chartData = [...summaries].reverse().map(s => ({
        date: s.summary_date,
        performance: s.avg_recovery_score || 0,
        stress: s.total_strain || 0,
    }));

    // Get all device connections
    const { data: connections } = await supabase
        .from('device_connections')
        .select('platform, last_sync_at')
        .eq('user_id', userId);

    // Get detailed sleep metrics (latest)
    const { data: sleepMetrics } = await supabase
        .from('sleep_metrics')
        .select('*')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    const connected_services = connections?.map(c => c.platform) || [];
    const whoopConnection = connections?.find(c => c.platform === 'whoop');

    return {
        recovery_score: latest.avg_recovery_score,
        hrv_rmssd: latestHRV.avg_hrv_rmssd,
        resting_heart_rate: latestHRV.avg_resting_hr,
        sleep_duration_minutes: latestSleep.total_sleep_minutes,
        sleep_quality_score: latestSleep.avg_sleep_quality_score,
        strain_score: latest.total_strain,

        hrv_trend,
        recovery_trend,
        sleep_trend,

        chartData,

        last_sync: whoopConnection?.last_sync_at || null,
        has_data: true,
        connected_services,
        latestSleepMetrics: sleepMetrics,
    };
}

/**
 * Calculate average of non-null values
 */
function calculateAverage(values: (number | null)[]): number | null {
    const validValues = values.filter((v): v is number => v !== null);
    if (validValues.length === 0) return null;
    return validValues.reduce((a, b) => a + b, 0) / validValues.length;
}

/**
 * Return empty metrics when no data available
 */
function getEmptyMetrics(): DashboardMetrics {
    return {
        recovery_score: null,
        hrv_rmssd: null,
        resting_heart_rate: null,
        sleep_duration_minutes: null,
        sleep_quality_score: null,
        strain_score: null,
        hrv_trend: null,
        recovery_trend: null,
        sleep_trend: null,
        chartData: [],
        last_sync: null,
        has_data: false,
        connected_services: [],
        latestSleepMetrics: null,
    };
}
