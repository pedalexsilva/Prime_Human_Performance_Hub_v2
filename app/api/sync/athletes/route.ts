import { NextResponse } from "next/server"
import { getAthleteSyncStatus } from "@/lib/queries/sync-stats"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is a doctor
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "doctor") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }

    // Get athlete sync status
    const athletes = await getAthleteSyncStatus(user.id)

    return NextResponse.json({
      success: true,
      athletes,
    })
  } catch (error) {
    console.error("[API] Error fetching athlete sync status:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch athlete data",
      },
      { status: 500 },
    )
  }
}
