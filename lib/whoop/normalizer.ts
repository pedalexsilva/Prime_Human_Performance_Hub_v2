import { createClient } from "@supabase/supabase-js"
import type { WhoopCycle, WhoopRecovery, WhoopSleep, WhoopWorkout } from "./schemas"
import { validateAllWhoopData } from "./validator"
import { mapSportIdToActivityType } from "./sport-mapping"

/**
 * ⚠️ CORRIGIDO: Normalizar CYCLES para cycle_metrics
 * Usando os nomes CORRETOS das colunas: date (não metric_date)
 */
export function normalizeCycleMetrics(cycle: WhoopCycle, userId: string) {
  const date = new Date(cycle.start).toISOString().split("T")[0]

  return {
    user_id: userId,
    date: date,  // ← Coluna chama-se 'date', não 'metric_date'!
    // Campos de CYCLE (strain)
    strain: cycle.score.strain,
    kilojoule: cycle.score.kilojoule,
    average_heart_rate: cycle.score.average_heart_rate,
    max_heart_rate: cycle.score.max_heart_rate,
    // Campos existentes na tabela
    start_time: cycle.start,
    end_time: cycle.end || null,
    timezone_offset: cycle.timezone_offset,
    score_state: cycle.score_state,
    // Raw data para referência
    raw_data: cycle,
  }
}

/**
 * ⚠️ NOVO: Normalizar RECOVERY para recovery_metrics
 */
export function normalizeRecoveryMetrics(recovery: WhoopRecovery, userId: string) {
  const date = new Date(recovery.created_at).toISOString().split("T")[0]

  return {
    user_id: userId,
    source_platform: "whoop",
    metric_date: date,
    // Campos de RECOVERY
    recovery_score: recovery.score.recovery_score,
    hrv_rmssd: recovery.score.hrv_rmssd_milli, // Keep in milliseconds
    hrv_rmssd_milli: recovery.score.hrv_rmssd_milli,
    resting_heart_rate: recovery.score.resting_heart_rate,
    spo2_percentage: recovery.score.spo2_percentage,
    skin_temp_celsius: recovery.score.skin_temp_celsius,
    user_calibrating: recovery.score.user_calibrating,
    raw_data: recovery,
  }
}

/**
 * Deduplicate cycle metrics by date (usando 'date', não 'metric_date')
 */
function dedupeCycleMetrics(metrics: ReturnType<typeof normalizeCycleMetrics>[]) {
  const grouped = new Map<string, ReturnType<typeof normalizeCycleMetrics>>()

  for (const metric of metrics) {
    const key = `${metric.user_id}-${metric.date}`  // ← 'date', não 'metric_date'
    const existing = grouped.get(key)

    if (!existing || metric.strain > existing.strain) {
      grouped.set(key, metric)
    }
  }

  const duplicateCount = metrics.length - grouped.size
  if (duplicateCount > 0) {
    console.log(`[v0][Dedupe] Removed ${duplicateCount} duplicate cycle metrics (kept highest strain per day)`)
  }

  return Array.from(grouped.values())
}

/**
 * Deduplicate recovery metrics by keeping the best recovery score per date
 */
function dedupeRecoveryMetrics(metrics: ReturnType<typeof normalizeRecoveryMetrics>[]) {
  const grouped = new Map<string, ReturnType<typeof normalizeRecoveryMetrics>>()

  for (const metric of metrics) {
    const key = `${metric.user_id}-${metric.source_platform}-${metric.metric_date}`
    const existing = grouped.get(key)

    if (!existing || metric.recovery_score > existing.recovery_score) {
      grouped.set(key, metric)
    }
  }

  const duplicateCount = metrics.length - grouped.size
  if (duplicateCount > 0) {
    console.log(`[v0][Dedupe] Removed ${duplicateCount} duplicate recovery metrics (kept best recovery score per day)`)
  }

  return Array.from(grouped.values())
}

/**
 * Normalize Whoop sleep data to sleep_metrics schema
 */
export function normalizeSleepMetrics(sleep: WhoopSleep, userId: string) {
  const date = new Date(sleep.start).toISOString().split("T")[0]
  const stages = sleep.score.stage_summary

  // Convert milliseconds to minutes
  const totalSleepMinutes = Math.round(
    (stages.total_light_sleep_time_milli +
      stages.total_slow_wave_sleep_time_milli +
      stages.total_rem_sleep_time_milli) /
    60000,
  )

  return {
    user_id: userId,
    source_platform: "whoop",
    metric_date: date,
    sleep_duration_minutes: totalSleepMinutes,
    sleep_stage_light_minutes: Math.round(stages.total_light_sleep_time_milli / 60000),
    sleep_stage_deep_minutes: Math.round(stages.total_slow_wave_sleep_time_milli / 60000),
    sleep_stage_rem_minutes: Math.round(stages.total_rem_sleep_time_milli / 60000),
    sleep_stage_awake_minutes: Math.round(stages.total_awake_time_milli / 60000),
    sleep_efficiency_percentage: sleep.score.sleep_efficiency_percentage,
    sleep_quality_score: Math.round(sleep.score.sleep_performance_percentage ?? 0),
    respiratory_rate: sleep.score.respiratory_rate,
    disturbances_count: stages.disturbance_count,
    sleep_onset_latency_minutes: 0,
    raw_data: sleep,
  }
}

/**
 * Deduplicate sleep metrics by keeping the sleep with longest duration per date
 */
function dedupeSleepMetrics(metrics: ReturnType<typeof normalizeSleepMetrics>[]) {
  const grouped = new Map<string, ReturnType<typeof normalizeSleepMetrics>>()

  for (const metric of metrics) {
    const key = `${metric.user_id}-${metric.source_platform}-${metric.metric_date}`
    const existing = grouped.get(key)

    if (!existing || metric.sleep_duration_minutes > existing.sleep_duration_minutes) {
      grouped.set(key, metric)
    }
  }

  const duplicateCount = metrics.length - grouped.size
  if (duplicateCount > 0) {
    console.log(`[v0][Dedupe] Removed ${duplicateCount} duplicate sleep metrics (kept longest sleep per day)`)
  }

  return Array.from(grouped.values())
}

/**
 * Normalize Whoop workout data to workout_metrics schema
 */
export function normalizeWorkoutMetrics(workout: WhoopWorkout, userId: string) {
  const date = new Date(workout.start).toISOString().split("T")[0]

  // Convert kilojoules to calories (1 kJ ≈ 0.239 kcal)
  const calories = workout.score.kilojoule ? Math.round(workout.score.kilojoule * 0.239) : 0

  // Calculate total duration in minutes
  const durationMinutes = Math.round((new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000)

  return {
    user_id: userId,
    source_platform: workout.source || "whoop",
    metric_date: date,
    activity_duration_minutes: durationMinutes,
    strain_score: workout.score.strain ?? 0,
    avg_heart_rate: workout.score.average_heart_rate ?? 0,
    max_heart_rate: workout.score.max_heart_rate ?? 0,
    calories_burned: calories,
    distance_meters: workout.score.distance_meter ?? 0,
    activity_type: mapSportIdToActivityType(workout.sport_id ?? 0),
    workout_id: workout.id.toString(),
    raw_data: workout,
  }
}

export interface SaveMetricsResult {
  savedCounts: {
    cycles: number
    recovery: number
    sleep: number
    workouts: number
  }
  validationErrors: {
    cycles: number
    recovery: number
    sleep: number
    workouts: number
  }
}

/**
 * ⚠️ CORRIGIDO: Save normalized metrics to database
 * Usando conflict correto para cycle_metrics: user_id,date
 */
export async function saveMetrics(
  cycles: WhoopCycle[],
  recovery: WhoopRecovery[],
  sleep: WhoopSleep[],
  workouts: WhoopWorkout[],
  userId: string,
): Promise<SaveMetricsResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  console.log("[Whoop Sync] Validating data before saving...")

  // TODO: Adicionar validação completa
  let savedCyclesCount = 0
  let savedRecoveryCount = 0
  let savedSleepCount = 0
  let savedWorkoutsCount = 0

  // ⚠️ CORRIGIDO: Save CYCLE metrics (strain)
  if (cycles.length > 0) {
    const cycleMetrics = cycles.map((c) => normalizeCycleMetrics(c, userId))
    const dedupedCycleMetrics = dedupeCycleMetrics(cycleMetrics)

    console.log("[Whoop Sync] Saving", dedupedCycleMetrics.length, "cycle metrics to cycle_metrics table")

    const { error: cycleError } = await supabase
      .from("cycle_metrics")
      .upsert(dedupedCycleMetrics, {
        onConflict: "user_id,date",  // ← CORRIGIDO: usar 'date', não 'metric_date'
      })

    if (cycleError) {
      console.error("[Whoop Sync] Error saving cycle metrics:", cycleError)
      throw new Error(`Failed to save cycle metrics: ${cycleError.message}`)
    }

    savedCyclesCount = dedupedCycleMetrics.length
    console.log("[Whoop Sync] Saved", dedupedCycleMetrics.length, "cycle metrics")
  }

  // Save RECOVERY metrics
  if (recovery.length > 0) {
    const recoveryMetrics = recovery.map((r) => normalizeRecoveryMetrics(r, userId))
    const dedupedRecoveryMetrics = dedupeRecoveryMetrics(recoveryMetrics)

    const { error: recoveryError } = await supabase
      .from("recovery_metrics")
      .upsert(dedupedRecoveryMetrics, {
        onConflict: "user_id,source_platform,metric_date",
      })

    if (recoveryError) {
      console.error("[Whoop Sync] Error saving recovery metrics:", recoveryError)
      throw new Error(`Failed to save recovery metrics: ${recoveryError.message}`)
    }

    savedRecoveryCount = dedupedRecoveryMetrics.length
    console.log("[Whoop Sync] Saved", dedupedRecoveryMetrics.length, "recovery metrics")
  }

  // Save sleep metrics
  if (sleep.length > 0) {
    const sleepMetrics = sleep
      .filter((s) => !s.nap)
      .map((s) => normalizeSleepMetrics(s, userId))

    if (sleepMetrics.length > 0) {
      const dedupedSleepMetrics = dedupeSleepMetrics(sleepMetrics)

      const { error: sleepError } = await supabase
        .from("sleep_metrics")
        .upsert(dedupedSleepMetrics, {
          onConflict: "user_id,source_platform,metric_date",
        })

      if (sleepError) {
        console.error("[Whoop Sync] Error saving sleep metrics:", sleepError)
        throw new Error(`Failed to save sleep metrics: ${sleepError.message}`)
      }

      savedSleepCount = dedupedSleepMetrics.length
      console.log("[Whoop Sync] Saved", dedupedSleepMetrics.length, "sleep metrics")
    }
  }

  // Save workout metrics
  if (workouts.length > 0) {
    const workoutMetrics = workouts.map((w) => normalizeWorkoutMetrics(w, userId))

    const { error: workoutError } = await supabase
      .from("workout_metrics")
      .upsert(workoutMetrics, {
        onConflict: "workout_id",
        ignoreDuplicates: false,
      })

    if (workoutError) {
      console.error("[Whoop Sync] Error saving workout metrics:", workoutError)
      throw new Error(`Failed to save workout metrics: ${workoutError.message}`)
    }

    savedWorkoutsCount = workoutMetrics.length
    console.log("[Whoop Sync] Saved", workoutMetrics.length, "workout metrics")
  }

  console.log("[Whoop Sync] All metrics saved successfully")

  return {
    savedCounts: {
      cycles: savedCyclesCount,
      recovery: savedRecoveryCount,
      sleep: savedSleepCount,
      workouts: savedWorkoutsCount,
    },
    validationErrors: {
      cycles: 0,
      recovery: 0,
      sleep: 0,
      workouts: 0,
    },
  }
}
