import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

/**
 * Administrative endpoint to reset corrupted Whoop connections
 * This removes encrypted tokens that cannot be decrypted
 *
 * POST /api/admin/reset-whoop-connection
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { error: deleteError } = await supabase
      .from("device_connections")
      .delete()
      .eq("user_id", userId)
      .eq("platform", "whoop")

    if (deleteError) {
      console.error("[Admin] Error deleting connection:", deleteError)
      return NextResponse.json({ error: "Failed to delete connection", details: deleteError.message }, { status: 500 })
    }

    console.log("[Admin] Successfully reset Whoop connection for user:", userId)

    return NextResponse.json({
      success: true,
      message: "Whoop connection reset. User needs to re-authenticate.",
      userId,
    })
  } catch (error) {
    console.error("[Admin] Reset connection error:", error)
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 })
  }
}
