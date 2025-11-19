/**
 * Data validation utilities for Whoop API responses
 */

import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import {
  WhoopCycleSchema,
  WhoopRecoverySchema,  // ← NOVO!
  WhoopSleepSchema,
  WhoopWorkoutSchema,
  type WhoopCycle,
  type WhoopRecovery,  // ← NOVO!
  type WhoopSleep,
  type WhoopWorkout,
} from "./schemas"

interface ValidationResult<T> {
  valid: T[]
  invalid: Array<{
    data: any
    error: string
  }>
  stats: {
    total: number
    validCount: number
    invalidCount: number
  }
}

/**
 * Logs validation errors to database for analysis
 */
async function logValidationError(
  userId: string,
  platform: string,
  dataType: string,
  errorMessage: string,
  rawData: any,
): Promise<void> {
  try {
    const supabase = await createServerClient()

    await supabase.from("data_validation_errors").insert({
      user_id: userId,
      platform,
      data_type: dataType,
      error_message: errorMessage,
      raw_data: rawData,
    })
  } catch (error) {
    console.error("[v0] Failed to log validation error:", error)
  }
}

/**
 * Validates and filters data array with a Zod schema
 */
async function validateAndFilter<T>(
  data: any[],
  schema: z.ZodType<T>,
  userId: string,
  platform: string,
  dataType: string,
): Promise<ValidationResult<T>> {
  const valid: T[] = []
  const invalid: Array<{ data: any; error: string }> = []

  for (const item of data) {
    try {
      const validated = schema.parse(item)
      valid.push(validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")

        invalid.push({
          data: item,
          error: errorMessage,
        })

        // Log to database for analysis
        await logValidationError(userId, platform, dataType, errorMessage, item)
      } else {
        invalid.push({
          data: item,
          error: "Unknown validation error",
        })
      }
    }
  }

  return {
    valid,
    invalid,
    stats: {
      total: data.length,
      validCount: valid.length,
      invalidCount: invalid.length,
    },
  }
}

/**
 * Validates Whoop cycle data (strain, kilojoule)
 */
export async function validateCycles(cycles: any[], userId: string): Promise<ValidationResult<WhoopCycle>> {
  console.log(`[v0] Validating ${cycles.length} cycles for user ${userId}`)

  const result = await validateAndFilter(cycles, WhoopCycleSchema, userId, "whoop", "cycle")

  if (result.invalid.length > 0) {
    console.warn(
      `[v0] ${result.invalid.length} invalid cycles rejected:`,
      result.invalid.map((i) => i.error),
    )
  }

  return result
}

/**
 * ⚠️ NOVO: Validates Whoop recovery data (recovery_score, HRV, RHR)
 */
export async function validateRecovery(recovery: any[], userId: string): Promise<ValidationResult<WhoopRecovery>> {
  console.log(`[v0] Validating ${recovery.length} recovery records for user ${userId}`)

  const result = await validateAndFilter(recovery, WhoopRecoverySchema, userId, "whoop", "recovery")

  if (result.invalid.length > 0) {
    console.warn(
      `[v0] ${result.invalid.length} invalid recovery records rejected:`,
      result.invalid.map((i) => i.error),
    )
  }

  return result
}

/**
 * Validates Whoop sleep data
 */
export async function validateSleep(sleep: any[], userId: string): Promise<ValidationResult<WhoopSleep>> {
  console.log(`[v0] Validating ${sleep.length} sleep records for user ${userId}`)

  const result = await validateAndFilter(sleep, WhoopSleepSchema, userId, "whoop", "sleep")

  if (result.invalid.length > 0) {
    console.warn(
      `[v0] ${result.invalid.length} invalid sleep records rejected:`,
      result.invalid.map((i) => i.error),
    )
  }

  return result
}

/**
 * Validates Whoop workout data
 */
export async function validateWorkouts(workouts: any[], userId: string): Promise<ValidationResult<WhoopWorkout>> {
  console.log(`[v0] Validating ${workouts.length} workouts for user ${userId}`)

  const result = await validateAndFilter(workouts, WhoopWorkoutSchema, userId, "whoop", "workout")

  if (result.invalid.length > 0) {
    console.warn(
      `[v0] ${result.invalid.length} invalid workouts rejected:`,
      result.invalid.map((i) => i.error),
    )
  }

  return result
}

/**
 * ⚠️ ATUALIZADO: Validates all Whoop data types in parallel
 * Agora inclui RECOVERY separado!
 */
export async function validateAllWhoopData(
  data: {
    cycles: any[]
    recovery: any[]  // ← NOVO!
    sleep: any[]
    workouts: any[]
  },
  userId: string,
): Promise<{
  cycles: ValidationResult<WhoopCycle>
  recovery: ValidationResult<WhoopRecovery>  // ← NOVO!
  sleep: ValidationResult<WhoopSleep>
  workouts: ValidationResult<WhoopWorkout>
}> {
  const [cycles, recovery, sleep, workouts] = await Promise.all([
    validateCycles(data.cycles, userId),
    validateRecovery(data.recovery, userId),  // ← NOVO!
    validateSleep(data.sleep, userId),
    validateWorkouts(data.workouts, userId),
  ])

  const totalInvalid = cycles.invalid.length + recovery.invalid.length + sleep.invalid.length + workouts.invalid.length

  if (totalInvalid > 0) {
    console.warn(`[v0] Total validation errors: ${totalInvalid}`)
  }

  return { cycles, recovery, sleep, workouts }
}
