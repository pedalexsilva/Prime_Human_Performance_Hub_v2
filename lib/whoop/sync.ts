// lib/whoop/sync.ts
// v1.8 — FINAL: Recovery separado + Profile sempre + Body measurements com histórico + DEBUG MELHORADO

import { createServiceRoleClient } from "@/lib/supabase/service"
import { fetchAllData } from "./api"
import { saveMetrics } from "./normalizer"
import pLimit from "p-limit"
import { checkPatientMetrics } from "@/lib/alerts/checker"
import { generateDailySummaries } from "@/lib/jobs/aggregations"
import { autoAssignPatientToDoctor } from "@/lib/relationships/auto-assign"

const SYNC_WINDOW_DAYS = 7
const INITIAL_SYNC_WINDOW_DAYS = 15

export interface SyncResult {
  userId: string
  success: boolean
  error?: string
  cyclesCount?: number
  recoveryCount?: number
  sleepCount?: number
  workoutsCount?: number
  profileSaved?: boolean
  bodyMeasurementsSaved?: boolean
  validationErrors?: {
    cycles: number
    recovery: number
    sleep: number
    workouts: number
  }
}

async function getActiveWhoopUsers(): Promise<string[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("device_connections")
    .select("user_id")
    .eq("platform", "whoop")
    .eq("is_active", true)

  if (error) {
    console.error("[Whoop Sync] Erro ao buscar utilizadores ativos:", error)
    return []
  }

  return data.map((d) => d.user_id)
}

async function logSync(
  userId: string,
  success: boolean,
  recordsSynced: number,
  error?: string,
  validationErrors?: {
    cycles: number
    recovery: number
    sleep: number
    workouts: number
  },
): Promise<void> {
  const supabase = createServiceRoleClient()

  const payload = {
    user_id: userId,
    platform: "whoop",
    sync_started_at: new Date().toISOString(),
    sync_completed_at: new Date().toISOString(),
    status: success ? "completed" : "failed",
    records_synced: recordsSynced,
    error_message: error || null,
  }

  const { error: insertError } = await supabase.from("sync_logs").insert(payload)
  if (insertError) {
    console.error("[Whoop Sync] Erro ao registar sync_logs:", insertError.message)
  }

  if (validationErrors) {
    const totalErrors =
      validationErrors.cycles +
      validationErrors.recovery +
      validationErrors.sleep +
      validationErrors.workouts

    if (totalErrors > 0) {
      console.warn(`[Whoop Sync] ${totalErrors} validation errors detected for user ${userId}`, validationErrors)
    }
  }
}

/**
 * Save user profile
 */
async function saveUserProfile(profile: any, userId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  console.log("[Whoop Sync] Saving user profile...")

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
  const whoopUserId = profile.user_id?.toString()

  if (!fullName && !whoopUserId) {
    console.warn("[Whoop Sync] No profile data to save")
    return
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      whoop_user_id: whoopUserId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    console.error("[Whoop Sync] Error saving profile:", error)
    throw new Error(`Failed to save profile: ${error.message}`)
  }

  console.log("[Whoop Sync] Profile saved successfully")
}

/**
 * ⚠️ CORRIGIDO: Save body measurements com histórico + debug melhorado
 * 
 * Salva em 2 lugares COM verificação:
 * 1. body_measurements_history (histórico completo)
 * 2. profiles (último valor)
 */
async function saveBodyMeasurements(measurements: any, userId: string): Promise<void> {
  const supabase = createServiceRoleClient()

  console.log("[🔍 Measurements] Starting save for user:", userId)
  console.log("[🔍 Measurements] Raw data received:", JSON.stringify(measurements, null, 2))

  const height_cm = measurements.height_meter
    ? Math.round(measurements.height_meter * 100)
    : null

  const weight_kg = measurements.weight_kilogram || null
  const max_heart_rate = measurements.max_heart_rate || null

  console.log("[🔍 Measurements] Converted values:", {
    height_cm,
    weight_kg,
    max_heart_rate,
  })

  // Se não tem nenhum dado, não faz nada
  if (!height_cm && !weight_kg && !max_heart_rate) {
    console.warn("[⚠️ Measurements] No measurements data to save - all values null")
    return
  }

  const today = new Date().toISOString().split('T')[0]
  console.log("[🔍 Measurements] Measured date:", today)

  // ============================================
  // 1. SALVAR NO HISTÓRICO (body_measurements_history)
  // ============================================
  console.log("[🔍 Measurements] Step 1: Saving to history table...")

  const historyData = {
    user_id: userId,
    height_cm,
    weight_kg,
    max_heart_rate,
    measured_at: today,
    source: 'whoop',
  }

  console.log("[🔍 Measurements] History data to insert:", historyData)

  const { data: historyResult, error: historyError } = await supabase
    .from("body_measurements_history")
    .upsert(historyData, {
      onConflict: 'user_id,measured_at',
    })
    .select()

  if (historyError) {
    console.error("[❌ Measurements] Error saving to history:", {
      error: historyError,
      errorMessage: historyError.message,
      errorCode: historyError.code,
      errorDetails: historyError.details,
      errorHint: historyError.hint,
    })
    throw new Error(`Failed to save measurements history: ${historyError.message}`)
  }

  console.log("[✅ Measurements] Saved to history successfully:", {
    rowsAffected: historyResult?.length || 0,
    data: historyResult,
  })

  // ============================================
  // 2. ATUALIZAR PROFILES (último valor)
  // ============================================
  console.log("[🔍 Measurements] Step 2: Updating profiles table...")

  const profileUpdate: any = {
    updated_at: new Date().toISOString(),
  }

  if (height_cm !== null) profileUpdate.height_cm = height_cm
  if (weight_kg !== null) profileUpdate.weight_kg = weight_kg
  if (max_heart_rate !== null) profileUpdate.max_heart_rate = max_heart_rate

  console.log("[🔍 Measurements] Profile update data:", profileUpdate)
  console.log("[🔍 Measurements] Updating profile for user_id:", userId)

  const { data: profileResult, error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId)
    .select()

  if (profileError) {
    console.error("[❌ Measurements] Error updating profiles:", {
      error: profileError,
      errorMessage: profileError.message,
      errorCode: profileError.code,
      errorDetails: profileError.details,
      errorHint: profileError.hint,
    })
    // Não fazer throw aqui - histórico já foi salvo com sucesso
    console.warn("[⚠️ Measurements] History saved but profile update failed")
  } else if (!profileResult || profileResult.length === 0) {
    console.error("[❌ Measurements] Profile update returned no rows!")
    console.error("[❌ Measurements] This means the user_id doesn't exist in profiles table")
    console.warn("[⚠️ Measurements] History saved but profile not found")
  } else {
    console.log("[✅ Measurements] Profile updated successfully:", {
      rowsAffected: profileResult.length,
      updatedFields: Object.keys(profileUpdate),
      data: profileResult[0],
    })
  }

  // ============================================
  // 3. VERIFICAÇÃO FINAL
  // ============================================
  console.log("[🔍 Measurements] Verification: Checking if data was saved...")

  // Verificar histórico
  const { data: historyCheck } = await supabase
    .from("body_measurements_history")
    .select("*")
    .eq("user_id", userId)
    .eq("measured_at", today)
    .single()

  if (historyCheck) {
    console.log("[✅ Measurements] History verification PASSED:", historyCheck)
  } else {
    console.error("[❌ Measurements] History verification FAILED - data not found!")
  }

  // Verificar profiles
  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("height_cm, weight_kg, max_heart_rate, updated_at")
    .eq("id", userId)
    .single()

  if (profileCheck) {
    console.log("[✅ Measurements] Profile verification:", profileCheck)

    // Verificar se os valores foram realmente atualizados
    const allMatch = (
      (height_cm === null || profileCheck.height_cm === height_cm) &&
      (weight_kg === null || profileCheck.weight_kg === weight_kg) &&
      (max_heart_rate === null || profileCheck.max_heart_rate === max_heart_rate)
    )

    if (allMatch) {
      console.log("[✅ Measurements] Profile values match - update successful!")
    } else {
      console.error("[❌ Measurements] Profile values don't match - update may have failed!")
      console.error("[❌ Measurements] Expected:", { height_cm, weight_kg, max_heart_rate })
      console.error("[❌ Measurements] Got:", profileCheck)
    }
  } else {
    console.error("[❌ Measurements] Profile verification FAILED - profile not found!")
  }

  console.log("[✅ Measurements] Save process complete")
}

/**
 * Sincronizar dados para um utilizador específico
 */
export async function syncUserData(userId: string): Promise<SyncResult> {
  const supabase = createServiceRoleClient()

  try {
    console.log("[v0][Whoop Sync] Starting sync for user:", userId)
    console.log("[v0][Whoop Sync] Environment check:", {
      hasWhoopClientId: !!process.env.WHOOP_CLIENT_ID,
      hasWhoopClientSecret: !!process.env.WHOOP_CLIENT_SECRET,
      hasWhoopEncryptionKey: !!process.env.WHOOP_ENCRYPTION_KEY,
      encryptionKeyLength: process.env.WHOOP_ENCRYPTION_KEY?.length,
    })

    console.log("[Whoop Sync] Início da sincronização para utilizador:", userId)

    const { data: connection } = await supabase
      .from("device_connections")
      .select("initial_sync_completed")
      .eq("user_id", userId)
      .eq("platform", "whoop")
      .single()

    const isFirstSync = connection?.initial_sync_completed !== true
    const daysToSync = isFirstSync ? INITIAL_SYNC_WINDOW_DAYS : SYNC_WINDOW_DAYS

    console.log(`[Whoop Sync] ${isFirstSync ? "Primeira" : "Regular"} sync — ${daysToSync} dias de dados`)

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysToSync)

    // Fetch all data
    let data
    try {
      console.log("[v0][Whoop Sync] About to call fetchAllData")
      data = await fetchAllData(userId, startDate, endDate)
      console.log("[v0][Whoop Sync] fetchAllData succeeded")
    } catch (fetchError) {
      console.error("[v0][Whoop Sync] fetchAllData failed:", {
        error: fetchError,
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
      })
      throw fetchError
    }

    console.log("[Whoop Sync] Dados fetched:", {
      cycles: data.cycles.length,
      recovery: data.recovery.length,
      sleep: data.sleep.length,
      workouts: data.workouts.length,
      hasProfile: !!data.profile,
      hasBodyMeasurements: !!data.bodyMeasurements,
    })

    // Save metrics
    const saveResult = await saveMetrics(
      data.cycles,
      data.recovery,
      data.sleep,
      data.workouts,
      userId
    )

    console.log("[Whoop Sync] Métricas guardadas no Supabase:", {
      cycles: saveResult.savedCounts.cycles,
      recovery: saveResult.savedCounts.recovery,
      sleep: saveResult.savedCounts.sleep,
      workouts: saveResult.savedCounts.workouts,
    })

    // ⚠️ CORRIGIDO: Save profile SEMPRE (não só na primeira sync)
    let profileSaved = false
    if (data.profile) {
      try {
        await saveUserProfile(data.profile, userId)
        profileSaved = true
      } catch (error) {
        console.warn("[Whoop Sync] Failed to save profile:", error)
      }
    }

    // ⚠️ ATUALIZADO: Save body measurements com histórico e debug melhorado
    let bodyMeasurementsSaved = false
    if (data.bodyMeasurements) {
      try {
        await saveBodyMeasurements(data.bodyMeasurements, userId)
        bodyMeasurementsSaved = true
      } catch (error) {
        console.warn("[Whoop Sync] Failed to save body measurements:", error)
      }
    }

    if (saveResult.validationErrors) {
      console.log("[Whoop Sync] Validation errors:", saveResult.validationErrors)
    }

    // Generate summaries
    const uniqueDates = new Set<string>()
    data.cycles.forEach((c) => uniqueDates.add(new Date(c.start).toISOString().split("T")[0]))
    data.recovery.forEach((r) => uniqueDates.add(new Date(r.created_at).toISOString().split("T")[0]))
    data.sleep.forEach((s) => uniqueDates.add(new Date(s.start).toISOString().split("T")[0]))
    data.workouts.forEach((w) => uniqueDates.add(new Date(w.start).toISOString().split("T")[0]))

    for (const dateStr of uniqueDates) {
      await generateDailySummaries(new Date(dateStr))
    }

    console.log("[Whoop Sync] Summaries gerados para", uniqueDates.size, "datas.")

    // Check alerts
    const today = new Date().toISOString().split("T")[0]
    await checkPatientMetrics(userId, today)

    // Update connection
    const updates: { last_sync_at: string; initial_sync_completed?: boolean } = {
      last_sync_at: new Date().toISOString(),
    }

    if (isFirstSync) {
      updates.initial_sync_completed = true
      console.log("[Whoop Sync] Primeira sync marcada como completa.")
    }

    await supabase
      .from("device_connections")
      .update(updates)
      .eq("user_id", userId)
      .eq("platform", "whoop")

    // Auto-assign on first sync
    if (isFirstSync) {
      console.log("[Whoop Sync] Primeira sync — tentar auto-atribuição a médico.")
      const assignResult = await autoAssignPatientToDoctor(userId)

      if (assignResult.success && assignResult.relationshipCreated) {
        console.log("[Whoop Sync] Paciente auto-atribuído ao médico:", assignResult.doctorId)
      } else {
        console.warn("[Whoop Sync] Auto-assign falhou ou não criou relação:", assignResult.error)
      }
    }

    const validationErrors = saveResult.validationErrors || {
      cycles: 0,
      recovery: 0,
      sleep: 0,
      workouts: 0,
    }

    const totalRecords =
      (saveResult.savedCounts?.cycles || 0) +
      (saveResult.savedCounts?.recovery || 0) +
      (saveResult.savedCounts?.sleep || 0) +
      (saveResult.savedCounts?.workouts || 0)

    await logSync(userId, true, totalRecords, undefined, validationErrors)

    console.log("[Whoop Sync] Sincronização concluída com sucesso:", {
      userId,
      profileSaved,
      bodyMeasurementsSaved,
    })

    return {
      userId,
      success: true,
      cyclesCount: saveResult.savedCounts?.cycles || 0,
      recoveryCount: saveResult.savedCounts?.recovery || 0,
      sleepCount: saveResult.savedCounts?.sleep || 0,
      workoutsCount: saveResult.savedCounts?.workouts || 0,
      profileSaved,
      bodyMeasurementsSaved,
      validationErrors,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[v0][Whoop Sync] Sync failed with detailed error:", {
      userId,
      errorMessage: message,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    })

    let userFriendlyError = message
    let shouldDeleteConnection = false

    if (message.includes("No Whoop tokens stored for user")) {
      userFriendlyError = "Nenhum token Whoop encontrado. Por favor, reconecte sua conta."
      shouldDeleteConnection = true
    } else if (message.includes("401") || message.includes("Unauthorized")) {
      userFriendlyError = "Acesso não autorizado. Por favor, reconecte sua conta Whoop."
      shouldDeleteConnection = true
    } else if (message.includes("429")) {
      userFriendlyError = "Limite de requisições atingido. Tente novamente mais tarde."
    } else if (message.includes("network") || message.includes("fetch")) {
      userFriendlyError = "Erro de conexão com Whoop API. Tente novamente mais tarde."
    }

    if (shouldDeleteConnection) {
      console.warn("[v0][Whoop Sync] Deactivating connection due to:", userFriendlyError)
      await supabase
        .from("device_connections")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("platform", "whoop")
    } else {
      console.log("[v0][Whoop Sync] Connection kept active despite error - error may be temporary")
    }

    await logSync(userId, false, 0, userFriendlyError)

    return {
      userId,
      success: false,
      error: userFriendlyError,
    }
  }
}

export async function syncAllUsers(): Promise<{
  total: number
  successful: number
  failed: number
  results: SyncResult[]
}> {
  console.log("[Whoop Sync] Início do batch global...")
  const userIds = await getActiveWhoopUsers()
  console.log("[Whoop Sync] Encontrados", userIds.length, "utilizadores Whoop ativos.")

  if (userIds.length === 0) {
    return { total: 0, successful: 0, failed: 0, results: [] }
  }

  const limit = pLimit(5)
  const results = await Promise.all(userIds.map((id) => limit(() => syncUserData(id))))

  const successful = results.filter((r) => r.success).length
  const failed = results.length - successful

  console.log("[Whoop Sync] Batch concluído.", { total: userIds.length, successful, failed })

  const totalCycles = results.reduce((sum, r) => sum + (r.cyclesCount || 0), 0)
  const totalRecovery = results.reduce((sum, r) => sum + (r.recoveryCount || 0), 0)
  const totalSleep = results.reduce((sum, r) => sum + (r.sleepCount || 0), 0)
  const totalWorkouts = results.reduce((sum, r) => sum + (r.workoutsCount || 0), 0)

  console.log("[Whoop Sync] Estatísticas do batch:", {
    totalCycles,
    totalRecovery,
    totalSleep,
    totalWorkouts,
    totalRecords: totalCycles + totalRecovery + totalSleep + totalWorkouts,
  })

  return { total: userIds.length, successful, failed, results }
}

export async function syncUser(userId: string): Promise<SyncResult> {
  console.log("[Whoop Sync] Sincronização manual iniciada para:", userId)
  return syncUserData(userId)
}
