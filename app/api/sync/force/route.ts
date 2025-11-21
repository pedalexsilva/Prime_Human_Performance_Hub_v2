import { type NextRequest, NextResponse } from "next/server"
import { syncUserData } from "@/lib/whoop/sync"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    // Athletes can sync their own data, doctors can sync any user's data
    if (profile?.role === "athlete" && userId !== user.id) {
      return NextResponse.json({ error: "Athletes can only sync their own data" }, { status: 403 })
    }

    if (!profile || (profile.role !== "doctor" && profile.role !== "athlete")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const result = await syncUserData(userId)

    return NextResponse.json({
      success: result.success,
      data: result,
      // Include helpful info for UI
      needsReconnection: result.error?.includes("reconecte") || false,
    })
  } catch (error) {
    console.error("[v0] Error forcing sync:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to force sync",
      },
      { status: 500 },
    )
  }
}
