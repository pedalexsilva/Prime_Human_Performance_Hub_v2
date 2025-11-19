import { type NextRequest, NextResponse } from "next/server"
import { getSyncStatsByPeriod } from "@/lib/queries/sync-stats"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "7"
    const days = Number.parseInt(period, 10)

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json({ error: "Invalid period parameter" }, { status: 400 })
    }

    const stats = await getSyncStatsByPeriod(days)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("[v0] Error fetching sync stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sync stats",
      },
      { status: 500 },
    )
  }
}
