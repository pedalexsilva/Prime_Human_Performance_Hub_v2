import { NextRequest, NextResponse } from 'next/server'
import { generateDailySummaries } from '@/lib/jobs/aggregations'

/**
 * API route to manually trigger daily aggregation
 * POST /api/admin/aggregate
 */
export async function POST(request: NextRequest) {
    try {
        const { days = 7 } = await request.json().catch(() => ({}))

        console.log('🔄 Starting daily aggregation...')

        const results = []

        // Run aggregation for the last N days
        for (let i = 0; i < days; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]

            console.log(`Aggregating: ${dateStr}`)

            try {
                const result = await generateDailySummaries(date)
                results.push({
                    date: dateStr,
                    processed: result.processed,
                    errors: result.errors?.length || 0
                })
            } catch (error) {
                console.error(`Error aggregating ${dateStr}:`, error)
                results.push({
                    date: dateStr,
                    error: String(error)
                })
            }
        }

        console.log('✅ Aggregation complete!')

        return NextResponse.json({
            success: true,
            message: `Aggregated ${days} days of data`,
            results
        })
    } catch (error) {
        console.error('❌ Aggregation failed:', error)
        return NextResponse.json(
            {
                success: false,
                error: String(error)
            },
            { status: 500 }
        )
    }
}
