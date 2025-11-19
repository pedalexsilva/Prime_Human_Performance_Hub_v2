import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get authenticated user (must be a doctor)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is a doctor
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "doctor") {
      return NextResponse.json({ error: "Only doctors can configure thresholds" }, { status: 403 })
    }

    const body = await request.json()
    const { patientId, metricName, thresholdValue, comparisonOperator, priority } = body

    // Validate input
    if (!patientId || !metricName || !thresholdValue || !comparisonOperator || !priority) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Insert or update threshold
    const { error } = await supabase.from("alert_thresholds").upsert({
      doctor_id: user.id,
      patient_id: patientId,
      metric_name: metricName,
      threshold_value: thresholdValue,
      comparison_operator: comparisonOperator,
      priority,
      is_active: true,
    })

    if (error) {
      console.error("[v0] Error configuring threshold:", error)
      return NextResponse.json({ error: "Failed to configure threshold" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Threshold configured successfully" })
  } catch (error) {
    console.error("[v0] Error in configure alerts:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
