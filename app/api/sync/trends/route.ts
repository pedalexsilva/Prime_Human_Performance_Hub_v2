import { NextRequest, NextResponse } from "next/server"
import { getSyncTrendData } from "@/lib/queries/sync-stats"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
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

    // Get days from query params
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    // Get trend data
    const trendData = await getSyncTrendData(days)

    return NextResponse.json({
      success: true,
      trendData,
    })
  } catch (error) {
    console.error("[API] Error fetching sync trend data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch trend data",
      },
      { status: 500 },
    )
  }
}
