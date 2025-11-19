import { type NextRequest, NextResponse } from "next/server"
import { generateDailySummaries, generateMonthlySummaries } from "@/lib/jobs/aggregations"
import { subDays, startOfMonth, subMonths, isFirstDayOfMonth } from "date-fns"

// Ensuring maxDuration is correctly set to 60 for Vercel limits
export const maxDuration = 60 // seconds - Vercel limit

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const yesterday = subDays(new Date(), 1)

    console.log("[v0] Starting summary generation job...")
    console.log("[v0] Generating daily summaries for:", yesterday.toISOString())

    // Generate daily summaries for yesterday
    const dailyResult = await generateDailySummaries(yesterday)

    console.log("[v0] Daily summaries generated:", dailyResult)

    let monthlyResult = null

    // If it's the first day of the month, generate monthly summary for previous month
    if (isFirstDayOfMonth(new Date())) {
      const lastMonth = startOfMonth(subMonths(new Date(), 1))
      console.log("[v0] First day of month - generating monthly summaries for:", lastMonth.toISOString())

      monthlyResult = await generateMonthlySummaries(lastMonth)
      console.log("[v0] Monthly summaries generated:", monthlyResult)
    }

    return NextResponse.json({
      success: true,
      daily: dailyResult,
      monthly: monthlyResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Summary generation job failed:", error)
    return NextResponse.json(
      {
        error: "Summary generation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
