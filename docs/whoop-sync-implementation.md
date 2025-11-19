# Whoop Sync Implementation Summary

## Overview

This document summarizes the implementation of the Whoop data synchronization system that downloads data from the Whoop API and stores it in Supabase.

## What Was Fixed

### 1. Schema Alignment (Critical Fix)

**Problem**: The `normalizer.ts` was using incorrect column names that didn't match the Supabase schema.

**Solution**: Updated all column names to match the actual database schema:

#### Sleep Metrics Corrections
- `total_sleep_minutes` → `sleep_duration_minutes`
- `light_sleep_minutes` → `sleep_stage_light_minutes`
- `deep_sleep_minutes` → `sleep_stage_deep_minutes`
- `rem_sleep_minutes` → `sleep_stage_rem_minutes`
- `awake_minutes` → `sleep_stage_awake_minutes`
- `sleep_performance_percentage` → `sleep_quality_score`
- `disturbance_count` → `disturbances_count`
- Removed: `sleep_start`, `sleep_end`, `is_nap`, `sleep_consistency_percentage` (not in schema)

#### Workout Metrics Corrections
- `duration_minutes` → `activity_duration_minutes`
- `average_heart_rate` → `avg_heart_rate`
- Removed: `workout_start`, `workout_end`, `altitude_gain_meters`, `zone_durations` (not in schema)
- Added: `activity_type` (mapped from Whoop sport_id)
- Added: `workout_id` (Whoop's unique workout ID)

### 2. Sport ID Mapping

**Created**: `lib/whoop/sport-mapping.ts`

Maps Whoop's numeric sport IDs (0-240) to human-readable activity types like "Running", "Cycling", "Yoga", etc. Supports 100+ sport types.

### 3. Service Role Client

**Problem**: Regular Supabase client was hitting RLS policies that blocked inserts.

**Solution**: Updated `saveMetrics()` to use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS policies during sync operations.

\`\`\`typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
\`\`\`

### 4. Manual Sync Endpoint

**Created**: `app/api/sync/whoop/manual/route.ts`

Allows athletes to manually trigger a sync from their dashboard. Returns sync results including counts of synced records and validation errors.

### 5. Sync Button Component

**Created**: `components/athlete/sync-button.tsx`

UI button that triggers manual sync with:
- Loading state with spinning icon
- Toast notifications for success/error
- i18n support for PT/EN
- Auto-reload after successful sync

**Integrated** into `app/athlete/dashboard/page.tsx` (only shown when Whoop is connected)

### 6. Database Constraint

**Created**: `scripts/add-workout-id-constraint.sql`

Adds `UNIQUE` constraint on `workout_id` column to prevent duplicate workouts and enable proper upsert operations.

## How It Works

### Automatic Sync (Cron Job)

**Schedule**: Daily at 6:00 UTC (configured in `vercel.json`)

**Flow**:
1. Vercel Cron calls `/api/cron/sync-whoop`
2. Gets all users with active Whoop connections
3. For each user:
   - Fetches last 7 days of data (or 15 days for first sync)
   - Validates data against schemas
   - Normalizes to Supabase schema
   - Upserts to `recovery_metrics`, `sleep_metrics`, `workout_metrics`
   - Generates `daily_summaries`
   - Checks for alerts
   - Updates `device_connections.last_sync_at`

### Manual Sync

**Trigger**: User clicks "Sync Whoop" button in dashboard

**Flow**:
1. POST to `/api/sync/whoop/manual`
2. Authenticates user
3. Calls `syncUser(userId)`
4. Returns results to frontend
5. Shows toast with sync counts
6. Reloads page to display new data

## Data Flow

\`\`\`
Whoop API
    ↓
fetchAllData() - Parallel fetch of cycles, sleep, workouts
    ↓
validateAllWhoopData() - Zod validation
    ↓
normalizeMetrics() - Transform to Supabase schema
    ↓
saveMetrics() - Upsert with service role
    ↓
generateDailySummaries() - Aggregate metrics
    ↓
checkPatientMetrics() - Generate alerts
    ↓
autoAssignPatientToDoctor() - First sync only
\`\`\`

## Environment Variables Required

- `WHOOP_CLIENT_ID` - OAuth client ID
- `WHOOP_CLIENT_SECRET` - OAuth client secret
- `WHOOP_ENCRYPTION_KEY` - For encrypting tokens
- `CRON_SECRET` - Protects cron endpoints
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)

## Testing

### Manual Sync Test
1. Connect Whoop account via OAuth flow
2. Go to athlete dashboard
3. Click "Sync Whoop" button
4. Check browser console for `[Whoop Sync]` logs
5. Verify data in Supabase tables

### Cron Job Test
1. Deploy to Vercel with `vercel.json` configured
2. Wait for scheduled time (6:00 UTC) or trigger manually
3. Check Vercel logs for cron execution
4. Verify `sync_logs` table for results

### Database Verification
\`\`\`sql
-- Check recent syncs
SELECT * FROM sync_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- Check synced metrics
SELECT COUNT(*) FROM recovery_metrics WHERE created_at > NOW() - INTERVAL '1 day';
SELECT COUNT(*) FROM sleep_metrics WHERE created_at > NOW() - INTERVAL '1 day';
SELECT COUNT(*) FROM workout_metrics WHERE created_at > NOW() - INTERVAL '1 day';

-- Check for validation errors
SELECT * FROM data_validation_errors 
ORDER BY created_at DESC 
LIMIT 10;
\`\`\`

## Known Limitations

1. **Sleep Onset Latency**: Whoop API doesn't provide this metric directly, so we default to 0
2. **Naps**: Currently filtered out from sleep metrics (only main sleep sessions stored)
3. **Rate Limiting**: Whoop API has rate limits; sync handles this with retry logic
4. **Token Refresh**: Tokens expire after 60 minutes; automatic refresh implemented

## Future Enhancements

1. **Incremental Sync**: Only fetch new data since last sync instead of 7-day window
2. **Webhook Integration**: Real-time sync when new data available
3. **Sync Status UI**: Dashboard showing sync history and errors
4. **Retry Logic**: Automatic retry for failed syncs
5. **Data Validation Dashboard**: View and resolve validation errors

## Files Modified/Created

### Created
- `lib/whoop/sport-mapping.ts`
- `app/api/sync/whoop/manual/route.ts`
- `components/athlete/sync-button.tsx`
- `scripts/add-workout-id-constraint.sql`
- `docs/whoop-sync-implementation.md`

### Modified
- `lib/whoop/normalizer.ts` - Fixed schema alignment
- `lib/i18n/translations.ts` - Added sync translations
- `app/athlete/dashboard/page.tsx` - Added sync button
- `vercel.json` - Already had cron configured

## Deployment Checklist

- [ ] Run SQL script to add workout_id constraint
- [ ] Verify all environment variables are set in Vercel
- [ ] Verify `vercel.json` is in repository
- [ ] Test manual sync in staging
- [ ] Monitor first cron execution
- [ ] Check sync_logs and data_validation_errors tables
- [ ] Verify athlete dashboard shows sync button
- [ ] Test sync in both PT and EN languages

## Support

For issues or questions, check:
1. Browser console for `[Whoop Sync]` logs
2. Vercel logs for cron execution
3. Supabase `sync_logs` table for sync results
4. Supabase `data_validation_errors` table for data issues
