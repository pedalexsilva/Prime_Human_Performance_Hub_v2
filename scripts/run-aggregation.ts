import { generateDailySummaries } from '@/lib/jobs/aggregations'

/**
 * Script to manually run daily aggregation
 * This will update daily_summaries with the latest data from all metrics tables
 */
async function runAggregation() {
    console.log('🔄 Starting daily aggregation...\n')

    try {
        // Run aggregation for today
        const today = new Date()
        console.log(`Aggregating data for: ${today.toISOString().split('T')[0]}`)

        const result = await generateDailySummaries(today)

        console.log('\n✅ Aggregation complete!')
        console.log(`Processed: ${result.processed} users`)

        if (result.errors && result.errors.length > 0) {
            console.log(`\n⚠️  Errors: ${result.errors.length}`)
            result.errors.forEach((err: any) => {
                console.log(`  - User ${err.user_id}:`, err.error)
            })
        }

        // Also run for the last 7 days to backfill
        console.log('\n🔄 Backfilling last 7 days...')
        for (let i = 1; i <= 7; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            console.log(`  Aggregating: ${date.toISOString().split('T')[0]}`)
            await generateDailySummaries(date)
        }

        console.log('\n✅ Backfill complete!')
    } catch (error) {
        console.error('\n❌ Aggregation failed:', error)
        process.exit(1)
    }
}

runAggregation()
