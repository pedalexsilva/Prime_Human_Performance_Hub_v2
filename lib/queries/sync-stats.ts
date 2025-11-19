import { createServerClient } from "@/lib/supabase/server"

export interface SyncStats {
  successRate: number
  totalSyncs: number
  avgDuration: number
  byPlatform: Record<string, number>
  recentErrors: Array<{
    id: string
    userId: string
    userName: string
    platform: string
    errorMessage: string
    createdAt: string
  }>
}

export interface AthleteSyncStatus {
  id: string
  fullName: string
  email: string
  lastSyncAt: string | null
  syncStatus: "success" | "failed" | "never"
  cyclesCount: number
  sleepCount: number
  workoutsCount: number
  platform: string
}

export interface SyncTrendData {
  date: string
  success: number
  failed: number
}

/**
 * Get aggregated sync statistics for a given period
 */
export async function getSyncStatsByPeriod(days = 7): Promise<SyncStats> {
  const supabase = await createServerClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get total syncs and success rate
  const { data: syncs, error: syncsError } = await supabase
    .from("sync_logs")
    .select("id, status, sync_started_at, sync_completed_at, platform")
    .gte("created_at", startDate.toISOString())

  if (syncsError || !syncs) {
    return {
      successRate: 0,
      totalSyncs: 0,
      avgDuration: 0,
      byPlatform: {},
      recentErrors: [],
    }
  }

  const totalSyncs = syncs.length
  const successfulSyncs = syncs.filter((s) => s.status === "completed").length
  const successRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 0

  // Calculate average duration
  const durations = syncs
    .filter((s) => s.sync_started_at && s.sync_completed_at)
    .map((s) => {
      const start = new Date(s.sync_started_at!).getTime()
      const end = new Date(s.sync_completed_at!).getTime()
      return (end - start) / 1000 // seconds
    })

  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

  // Count by platform
  const byPlatform: Record<string, number> = {}
  syncs.forEach((s) => {
    byPlatform[s.platform] = (byPlatform[s.platform] || 0) + 1
  })

  // Get recent errors
  const { data: errors } = await supabase
    .from("sync_logs")
    .select(
      `
      id,
      user_id,
      platform,
      error_message,
      created_at,
      profiles!inner(full_name)
    `,
    )
    .eq("status", "failed")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(10)

  const recentErrors =
    errors?.map((e: any) => ({
      id: e.id,
      userId: e.user_id,
      userName: e.profiles?.full_name || "Unknown",
      platform: e.platform,
      errorMessage: e.error_message || "No error message",
      createdAt: e.created_at,
    })) || []

  return {
    successRate: Math.round(successRate * 10) / 10,
    totalSyncs,
    avgDuration: Math.round(avgDuration * 10) / 10,
    byPlatform,
    recentErrors,
  }
}

/**
 * Get sync status for all athletes assigned to a doctor
 */
export async function getAthleteSyncStatus(doctorId: string): Promise<AthleteSyncStatus[]> {
  const supabase = await createServerClient()

  // Get athletes for this doctor
  const { data: relationships } = await supabase
    .from("doctor_patient_relationships")
    .select("patient_id")
    .eq("doctor_id", doctorId)

  if (!relationships || relationships.length === 0) {
    return []
  }

  const patientIds = relationships.map((r) => r.patient_id)

  // Get athlete profiles
  const { data: athletes } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", patientIds)
    .eq("role", "athlete")

  if (!athletes) return []

  // Get sync status for each athlete
  const athletesWithStatus = await Promise.all(
    athletes.map(async (athlete) => {
      // Get last sync log
      const { data: lastSync } = await supabase
        .from("sync_logs")
        .select("sync_completed_at, status, platform")
        .eq("user_id", athlete.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      // Count records synced in last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [{ count: cyclesCount }, { count: sleepCount }, { count: workoutsCount }] = await Promise.all([
        supabase
          .from("recovery_metrics")
          .select("*", { count: "exact", head: true })
          .eq("user_id", athlete.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("sleep_metrics")
          .select("*", { count: "exact", head: true })
          .eq("user_id", athlete.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("workout_metrics")
          .select("*", { count: "exact", head: true })
          .eq("user_id", athlete.id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ])

      return {
        id: athlete.id,
        fullName: athlete.full_name || "Unknown",
        email: athlete.email || "",
        lastSyncAt: lastSync?.sync_completed_at || null,
        syncStatus: lastSync ? (lastSync.status as "success" | "failed") : "never",
        cyclesCount: cyclesCount || 0,
        sleepCount: sleepCount || 0,
        workoutsCount: workoutsCount || 0,
        platform: lastSync?.platform || "whoop",
      }
    }),
  )

  return athletesWithStatus
}

/**
 * Get sync trend data for charts (success vs failed over time)
 */
export async function getSyncTrendData(days = 30): Promise<SyncTrendData[]> {
  const supabase = await createServerClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data: syncs } = await supabase
    .from("sync_logs")
    .select("created_at, status")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true })

  if (!syncs) return []

  // Group by date
  const groupedByDate: Record<string, { success: number; failed: number }> = {}

  syncs.forEach((sync) => {
    const date = new Date(sync.created_at).toISOString().split("T")[0]
    if (!groupedByDate[date]) {
      groupedByDate[date] = { success: 0, failed: 0 }
    }
    if (sync.status === "completed") {
      groupedByDate[date].success++
    } else {
      groupedByDate[date].failed++
    }
  })

  // Convert to array and fill missing dates
  const result: SyncTrendData[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    result.push({
      date: dateStr,
      success: groupedByDate[dateStr]?.success || 0,
      failed: groupedByDate[dateStr]?.failed || 0,
    })
  }

  return result
}

/**
 * Get recent sync errors with details
 */
export async function getRecentSyncErrors(limit = 20) {
  const supabase = await createServerClient()

  const { data: errors } = await supabase
    .from("sync_logs")
    .select(
      `
      id,
      user_id,
      platform,
      error_message,
      sync_started_at,
      created_at,
      profiles!inner(full_name, email)
    `,
    )
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(limit)

  return (
    errors?.map((e: any) => ({
      id: e.id,
      userId: e.user_id,
      userName: e.profiles?.full_name || "Unknown",
      userEmail: e.profiles?.email || "",
      platform: e.platform,
      errorMessage: e.error_message || "No error message",
      syncStartedAt: e.sync_started_at,
      createdAt: e.created_at,
    })) || []
  )
}
