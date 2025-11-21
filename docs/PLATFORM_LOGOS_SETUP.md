# Platform Logos Setup Guide

## Step 1: Create Storage Bucket in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New Bucket**
4. Configure the bucket:
   - **Name**: `platform-logos`
   - **Public**: ✅ Yes (enable public access)
   - **File size limit**: 1 MB
   - **Allowed MIME types**: `image/png`, `image/jpeg`, `image/svg+xml`
5. Click **Create Bucket**

## Step 2: Upload Logo Images

Upload the 4 logo images to the `platform-logos` bucket:

1. Click on the `platform-logos` bucket
2. Click **Upload File**
3. Upload each logo with these exact names:
   - `whoop.png` (Whoop logo - black background with blue circle)
   - `oura.png` (Oura logo - dark blue background with white text)
   - `garmin.png` (Garmin logo - blue and gray)
   - `strava.png` (Strava logo - orange background with white icon)

## Step 3: Run SQL Migration

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy and paste the contents of `supabase/migrations/20250121_create_platform_logos.sql`
4. **IMPORTANT**: Before running, update the `logo_url` values with your actual Supabase project URL:
   - Replace `your-supabase-project` with your actual project reference
   - Example: `https://abcdefghijk.supabase.co/storage/v1/object/public/platform-logos/whoop.png`
5. Click **Run** to execute the migration

## Step 4: Verify Setup

Run this query to verify the data:

```sql
SELECT * FROM platform_logos ORDER BY platform_name;
```

You should see 4 rows with the platform logos.

## Step 5: Test Logo URLs

Open each logo URL in your browser to verify they're publicly accessible:
- `https://[your-project].supabase.co/storage/v1/object/public/platform-logos/whoop.png`
- `https://[your-project].supabase.co/storage/v1/object/public/platform-logos/oura.png`
- `https://[your-project].supabase.co/storage/v1/object/public/platform-logos/garmin.png`
- `https://[your-project].supabase.co/storage/v1/object/public/platform-logos/strava.png`

## Notes

- The logos are stored in a public bucket for easy access
- RLS policies allow public read access
- Only authenticated users can modify the logos
- The table uses UPSERT logic to prevent duplicates
