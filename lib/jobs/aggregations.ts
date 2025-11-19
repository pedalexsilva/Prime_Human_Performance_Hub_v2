import { createServiceRoleClient } from "@/lib/supabase/service"
import { subMonths, format } from "date-fns"

export interface DailySummary {
  user_id: string
  summary_date: string
  avg_recovery_score: number | null
  avg_hrv_rmssd: number | null
  avg_resting_hr: number | null
  total_strain: number | null
  total_sleep_minutes: number | null
  total_calories: number | null
  total_workouts: number | null
  data_completeness: number
  sources: string[]
}

export interface MonthlySummary {
  user_id: string
  summary_month: string
  avg_recovery_score: number | null
  avg_hrv_rmssd: number | null
  avg_resting_hr: number | null
  total_strain: number | null
  total_sleep_hours: number | null
  total_calories: number | null
  total_workouts: number | null
  recovery_trend: "improving" | "stable" | "declining" | null
  hrv_trend: "improving" | "stable" | "declining" | null
  recovery_change_pct: number | null
  hrv_change_pct: number | null
}

export async function generateDailySummaries(date: Date) {
  // Use service role client to bypass RLS
  const supabase = createServiceRoleClient()
  const summaryDate = format(date, "yyyy-MM-dd")

  // Get all active users
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "athlete")

  if (usersError) throw usersError
  if (!users || users.length === 0) return { processed: 0 }

  let processed = 0
  const errors: any[] = []

  for (const user of users) {
    try {
      // Fetch all metrics for the date
      const [recovery, sleep, workout] = await Promise.all([
        supabase
          .from("recovery_metrics")
          .select("*")
          .eq("user_id", user.id)
          .eq("metric_date", summaryDate)
          .maybeSingle(),
        supabase
          .from("sleep_metrics")
          .select("*")
          .eq("user_id", user.id)
          .eq("metric_date", summaryDate)
          .maybeSingle(),
        supabase
          .from("workout_metrics")
          .select("*")
          .eq("user_id", user.id)
          .eq("metric_date", summaryDate),
      ])

      if (recovery.error) throw recovery.error
      if (sleep.error) throw sleep.error
      if (workout.error) throw workout.error

      // Calculate data completeness
      const metricsPresent = [
        recovery.data?.recovery_score != null,
        sleep.data?.sleep_duration_minutes != null,
        workout.data && workout.data.length > 0,
      ].filter(Boolean).length

      const dataCompleteness = metricsPresent / 3

      // Aggregate workout data
      const totalCalories = workout.data?.reduce((sum, w) => sum + (w.calories_burned || 0), 0) || null
      const totalStrain = workout.data?.reduce((sum, w) => sum + (w.strain_score || 0), 0) || null
      const totalWorkouts = workout.data?.length || 0

      // Get unique sources
      const sources = Array.from(
        new Set(
          [
            recovery.data?.source_platform,
            sleep.data?.source_platform,
            ...(workout.data?.map((w) => w.source_platform) || []),
          ].filter(Boolean),
        ),
      ) as string[]

      const summary: Omit<DailySummary, "id" | "created_at"> = {
        user_id: user.id,
        summary_date: summaryDate,
        avg_recovery_score: recovery.data?.recovery_score || null,
        avg_hrv_rmssd: recovery.data?.hrv_rmssd || null,
        avg_resting_hr: recovery.data?.resting_heart_rate || null,
        total_strain: totalStrain,
        total_sleep_minutes: sleep.data?.sleep_duration_minutes || null,
        total_calories: totalCalories,
        total_workouts: totalWorkouts,
        data_completeness: dataCompleteness,
        sources,
      }

      // Upsert into daily_summaries
      const { error: upsertError } = await supabase
        .from("daily_summaries")
        .upsert(summary, {
          onConflict: "user_id,summary_date",
        })

      if (upsertError) throw upsertError
      processed++
    } catch (error) {
      console.error(`[v0] Failed to generate daily summary for user ${user.id}:`, error)
      errors.push({ user_id: user.id, error })
    }
  }

  return { processed, errors }
}

function calculateTrend(
  current: number | null,
  previous: number | null
): "improving" | "stable" | "declining" | null {
  if (current == null || previous == null) return null

  const changePct = ((current - previous) / previous) * 100

  if (changePct > 5) return "improving"
  if (changePct < -5) return "declining"
  return "stable"
}

export async function generateMonthlySummaries(month: Date) {
  // Use service role client to bypass RLS
  const supabase = createServiceRoleClient()
  const summaryMonth = format(month, "yyyy-MM-dd") // First day of month
  const previousMonth = format(subMonths(month, 1), "yyyy-MM-dd")

  // Get all active users
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "athlete")

  if (usersError) throw usersError
  if (!users || users.length === 0) return { processed: 0 }

  let processed = 0
  const errors: any[] = []

  for (const user of users) {
    try {
      // Get daily summaries for the month
      const { data: dailySummaries, error: dailyError } = await supabase
        .from("daily_summaries")
        .select("*")
        .eq("user_id", user.id)
        .gte("summary_date", summaryMonth)
        .lt("summary_date", format(subMonths(month, -1), "yyyy-MM-dd"))

      if (dailyError) throw dailyError
      if (!dailySummaries || dailySummaries.length === 0) continue

      // Calculate averages
      const avgRecovery =
        dailySummaries
          .filter((d) => d.avg_recovery_score != null)
          .reduce((sum, d, _, arr) => sum + (d.avg_recovery_score || 0) / arr.length, 0) || null

      const avgHrv =
        dailySummaries
          .filter((d) => d.avg_hrv_rmssd != null)
          .reduce((sum, d, _, arr) => sum + (d.avg_hrv_rmssd || 0) / arr.length, 0) || null

      const avgRestingHr =
        dailySummaries
          .filter((d) => d.avg_resting_hr != null)
          .reduce((sum, d, _, arr) => sum + (d.avg_resting_hr || 0) / arr.length, 0) || null

      const totalStrain = dailySummaries.reduce((sum, d) => sum + (d.total_strain || 0), 0) || null
      const totalSleepMinutes = dailySummaries.reduce((sum, d) => sum + (d.total_sleep_minutes || 0), 0) || null
      const totalSleepHours = totalSleepMinutes ? totalSleepMinutes / 60 : null
      const totalCalories = dailySummaries.reduce((sum, d) => sum + (d.total_calories || 0), 0) || null
      const totalWorkouts = dailySummaries.reduce((sum, d) => sum + (d.total_workouts || 0), 0) || null

      // Get previous month summary for comparison
      const { data: prevSummary } = await supabase
        .from("monthly_summaries")
        .select("avg_recovery_score, avg_hrv_rmssd")
        .eq("user_id", user.id)
        .eq("summary_month", previousMonth)
        .maybeSingle()

      // Calculate trends
      const recoveryTrend = calculateTrend(avgRecovery, prevSummary?.avg_recovery_score || null)
      const hrvTrend = calculateTrend(avgHrv, prevSummary?.avg_hrv_rmssd || null)

      const recoveryChangePct =
        prevSummary?.avg_recovery_score && avgRecovery
          ? ((avgRecovery - prevSummary.avg_recovery_score) / prevSummary.avg_recovery_score) * 100
          : null

      const hrvChangePct =
        prevSummary?.avg_hrv_rmssd && avgHrv
          ? ((avgHrv - prevSummary.avg_hrv_rmssd) / prevSummary.avg_hrv_rmssd) * 100
          : null

      const summary: Omit<MonthlySummary, "id" | "created_at"> = {
        user_id: user.id,
        summary_month: summaryMonth,
        avg_recovery_score: avgRecovery,
        avg_hrv_rmssd: avgHrv,
        avg_resting_hr: avgRestingHr,
        total_strain: totalStrain,
        total_sleep_hours: totalSleepHours,
        total_calories: totalCalories,
        total_workouts: totalWorkouts,
        recovery_trend: recoveryTrend,
        hrv_trend: hrvTrend,
        recovery_change_pct: recoveryChangePct,
        hrv_change_pct: hrvChangePct,
      }

      // Upsert into monthly_summaries
      const { error: upsertError } = await supabase
        .from("monthly_summaries")
        .upsert(summary, {
          onConflict: "user_id,summary_month",
        })

      if (upsertError) throw upsertError
      processed++
    } catch (error) {
      console.error(`[v0] Failed to generate monthly summary for user ${user.id}:`, error)
      errors.push({ user_id: user.id, error })
    }
  }

  return { processed, errors }
}
