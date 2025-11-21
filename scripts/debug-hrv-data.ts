import { createServiceRoleClient } from "@/lib/supabase/service"

/**
 * Debug script to check HRV data in the database
 */
async function debugHRVData() {
  const supabase = createServiceRoleClient()

  console.log("=== Debugging HRV Data ===\n")

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("role", "athlete")

  if (usersError) {
    console.error("Error fetching users:", usersError)
    return
  }

  console.log(`Found ${users?.length || 0} athletes\n`)

  for (const user of users || []) {
    console.log(`\n--- User: ${user.full_name} (${user.id}) ---`)

    // Check recovery_metrics
    const { data: recoveryMetrics, error: recoveryError } = await supabase
      .from("recovery_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("metric_date", { ascending: false })
      .limit(5)

    if (recoveryError) {
      console.error("  Recovery metrics error:", recoveryError)
    } else {
      console.log(`  Recovery metrics (last 5):`)
      recoveryMetrics?.forEach((m) => {
        console.log(`    ${m.metric_date}: HRV=${m.hrv_rmssd}, Recovery=${m.recovery_score}, HR=${m.resting_heart_rate}`)
      })
    }

    // Check daily_summaries
    const { data: dailySummaries, error: summariesError } = await supabase
      .from("daily_summaries")
      .select("*")
      .eq("user_id", user.id)
      .order("summary_date", { ascending: false })
      .limit(5)

    if (summariesError) {
      console.error("  Daily summaries error:", summariesError)
    } else {
      console.log(`  Daily summaries (last 5):`)
      dailySummaries?.forEach((s) => {
        console.log(`    ${s.summary_date}: HRV=${s.avg_hrv_rmssd}, Recovery=${s.avg_recovery_score}, Sleep=${s.total_sleep_minutes}min`)
      })
    }

    // Check device connections
    const { data: connections, error: connectionsError } = await supabase
      .from("device_connections")
      .select("*")
      .eq("user_id", user.id)

    if (connectionsError) {
      console.error("  Device connections error:", connectionsError)
    } else {
      console.log(`  Device connections:`)
      connections?.forEach((c) => {
        console.log(`    ${c.platform}: last_sync=${c.last_sync_at}, status=${c.connection_status}`)
      })
    }
  }

  console.log("\n=== Debug Complete ===")
}

debugHRVData().catch(console.error)
