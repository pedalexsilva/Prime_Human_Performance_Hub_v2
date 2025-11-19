/**
 * Zod schemas for Whoop API data validation
 * ⚠️ UPDATED: Separated Cycles and Recovery schemas
 */

import { z } from "zod"

// ============================================
// CYCLE SCHEMA (Strain diário)
// ============================================
// Cycles contêm: strain, kilojoule, average_heart_rate, max_heart_rate

export const WhoopCycleScoreSchema = z.object({
  strain: z.number().min(0).max(21),
  kilojoule: z.number().min(0),
  average_heart_rate: z.number().int().min(30).max(220),
  max_heart_rate: z.number().int().min(30).max(220),
})

export const WhoopCycleSchema = z.object({
  id: z.union([z.number(), z.string()]), // Can be number or UUID string
  user_id: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  start: z.string().datetime(),
  end: z.string().datetime().nullable(),
  timezone_offset: z.string(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]),
  score: WhoopCycleScoreSchema,
})

export type WhoopCycle = z.infer<typeof WhoopCycleSchema>
export type WhoopCycleScore = z.infer<typeof WhoopCycleScoreSchema>

// ============================================
// RECOVERY SCHEMA (Recovery score, HRV, RHR)
// ⚠️ NOVO: Separado de Cycles!
// ============================================
// Recovery contém: recovery_score, HRV, RHR, SpO2, skin temp

export const WhoopRecoveryScoreSchema = z.object({
  user_calibrating: z.boolean(),
  recovery_score: z.number().min(0).max(100),
  resting_heart_rate: z.number().int().min(30).max(200),
  hrv_rmssd_milli: z.number().min(0),
  spo2_percentage: z.number().min(0).max(100).optional().nullable(),
  skin_temp_celsius: z.number().min(-10).max(50).optional().nullable(),
})

export const WhoopRecoverySchema = z.object({
  cycle_id: z.number().int().positive(),
  sleep_id: z.string().uuid(),
  user_id: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]),
  score: WhoopRecoveryScoreSchema,
})

export type WhoopRecovery = z.infer<typeof WhoopRecoverySchema>
export type WhoopRecoveryScore = z.infer<typeof WhoopRecoveryScoreSchema>

// ============================================
// SLEEP SCHEMA
// ============================================

export const WhoopSleepStageSummarySchema = z.object({
  total_in_bed_time_milli: z.number().int().min(0),
  total_awake_time_milli: z.number().int().min(0),
  total_no_data_time_milli: z.number().int().min(0),
  total_light_sleep_time_milli: z.number().int().min(0),
  total_slow_wave_sleep_time_milli: z.number().int().min(0),
  total_rem_sleep_time_milli: z.number().int().min(0),
  sleep_cycle_count: z.number().int().min(0),
  disturbance_count: z.number().int().min(0),
})

export const WhoopSleepNeededSchema = z.object({
  baseline_milli: z.number().int().min(0),
  need_from_sleep_debt_milli: z.number().int(),
  need_from_recent_strain_milli: z.number().int(),
  need_from_recent_nap_milli: z.number().int(),
})

export const WhoopSleepScoreSchema = z.object({
  stage_summary: WhoopSleepStageSummarySchema,
  sleep_needed: WhoopSleepNeededSchema,
  respiratory_rate: z.number().min(5).max(40).optional().nullable(),
  sleep_performance_percentage: z.number().min(0).max(200).optional().nullable(),
  sleep_consistency_percentage: z.number().min(0).max(100).optional().nullable(),
  sleep_efficiency_percentage: z.number().min(0).max(100).optional().nullable(),
})

export const WhoopSleepSchema = z.object({
  id: z.union([z.number(), z.string()]), // Can be number or UUID string
  user_id: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timezone_offset: z.string(),
  nap: z.boolean(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]),
  score: WhoopSleepScoreSchema,
})

export type WhoopSleep = z.infer<typeof WhoopSleepSchema>
export type WhoopSleepScore = z.infer<typeof WhoopSleepScoreSchema>
export type WhoopSleepStageSummary = z.infer<typeof WhoopSleepStageSummarySchema>
export type WhoopSleepNeeded = z.infer<typeof WhoopSleepNeededSchema>

// ============================================
// WORKOUT SCHEMA
// ============================================

export const WhoopWorkoutZoneDurationSchema = z.object({
  zone_zero_milli: z.number().int().min(0).optional().nullable(),
  zone_one_milli: z.number().int().min(0).optional().nullable(),
  zone_two_milli: z.number().int().min(0).optional().nullable(),
  zone_three_milli: z.number().int().min(0).optional().nullable(),
  zone_four_milli: z.number().int().min(0).optional().nullable(),
  zone_five_milli: z.number().int().min(0).optional().nullable(),
})

export const WhoopWorkoutScoreSchema = z.object({
  strain: z.number().min(0).max(21).nullable(),
  average_heart_rate: z.number().int().min(30).max(220).nullable(),
  max_heart_rate: z.number().int().min(30).max(220).nullable(),
  kilojoule: z.number().min(0).nullable(),
  percent_recorded: z.number().min(0).max(100).optional().nullable(),
  distance_meter: z.number().min(0).nullable(),
  altitude_gain_meter: z.number().nullable(),
  altitude_change_meter: z.number().nullable(),
  zone_durations: WhoopWorkoutZoneDurationSchema.optional().nullable(),
})

export const WhoopWorkoutSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  timezone_offset: z.string().optional(),
  sport_id: z.number().int().nullable(),
  sport_name: z.string().optional().nullable(),
  score_state: z.enum(["SCORED", "PENDING_SCORE", "UNSCORABLE"]).optional(),
  score: WhoopWorkoutScoreSchema,
  source: z.string().default("whoop"),
})

export type WhoopWorkout = z.infer<typeof WhoopWorkoutSchema>
export type WhoopWorkoutScore = z.infer<typeof WhoopWorkoutScoreSchema>
export type WhoopWorkoutZoneDuration = z.infer<typeof WhoopWorkoutZoneDurationSchema>

// ============================================
// ARRAY SCHEMAS (bulk validation)
// ============================================

export const WhoopCyclesArraySchema = z.array(WhoopCycleSchema)
export const WhoopRecoveryArraySchema = z.array(WhoopRecoverySchema)  // ← NOVO!
export const WhoopSleepArraySchema = z.array(WhoopSleepSchema)
export const WhoopWorkoutsArraySchema = z.array(WhoopWorkoutSchema)

// ============================================
// HELPER: Type guards para verificar qual tipo de dado
// ============================================

export function isWhoopCycle(data: any): data is WhoopCycle {
  return data?.score?.strain !== undefined && data?.score?.kilojoule !== undefined
}

export function isWhoopRecovery(data: any): data is WhoopRecovery {
  return data?.score?.recovery_score !== undefined && data?.score?.hrv_rmssd_milli !== undefined
}

export function isWhoopSleep(data: any): data is WhoopSleep {
  return data?.nap !== undefined && data?.score?.stage_summary !== undefined
}

export function isWhoopWorkout(data: any): data is WhoopWorkout {
  return data?.sport_id !== undefined
}
