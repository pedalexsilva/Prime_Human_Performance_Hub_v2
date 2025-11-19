// app/api/sync/whoop/route.ts

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { syncUser } from "@/lib/whoop/sync"

// Admin client to bypass RLS during background sync
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export async function POST(request: Request) {
  try {
    let userId: string | null = null

    // 1) Prefer explicit body user_id (doctor manual trigger)
    try {
      const body = await request.json().catch(() => null)
      if (body && typeof body.user_id === "string") {
        userId = body.user_id
      }
    } catch {
      // ignore JSON parse errors
    }

    // 2) If not in body, try authenticated user session
    if (!userId) {
      const authHeader = request.headers.get("authorization")
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "missing_auth" }, { status: 401 })
      }

      const token = authHeader.replace("Bearer ", "")
      const { data, error } = await supabaseAdmin.auth.getUser(token)

      if (error || !data.user) {
        console.error("[Whoop] Invalid auth token", error)
        return NextResponse.json({ error: "invalid_auth" }, { status: 401 })
      }

      userId = data.user.id
    }

    if (!userId) {
      return NextResponse.json({ error: "missing_user_id" }, { status: 400 })
    }

    console.log("[Whoop] Manual sync requested for user:", userId)

    const result = await syncUser(userId)

    if (!result.success) {
      console.error("[Whoop] Sync failed for user", userId, result.error)
      return NextResponse.json(
        { error: "sync_failed", details: result.error },
        { status: 500 },
      )
    }

    return NextResponse.json({
      status: "success",
      records: {
        cycles: result.cyclesCount,
        sleep: result.sleepCount,
        workouts: result.workoutsCount,
      },
    })
  } catch (error) {
    console.error("[Whoop] Sync route fatal error:", error)
    return NextResponse.json({ error: "sync_failed" }, { status: 500 })
  }
}
