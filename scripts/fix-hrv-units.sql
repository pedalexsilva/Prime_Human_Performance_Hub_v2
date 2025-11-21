-- Migration: Fix HRV values from seconds to milliseconds
-- This script multiplies existing hrv_rmssd values by 1000
-- to convert from seconds (incorrect) to milliseconds (correct)

-- Update recovery_metrics table
UPDATE recovery_metrics
SET hrv_rmssd = hrv_rmssd * 1000
WHERE hrv_rmssd IS NOT NULL 
  AND hrv_rmssd < 1  -- Only update values that are clearly in seconds (< 1)
  AND hrv_rmssd > 0;

-- Update daily_summaries table
UPDATE daily_summaries
SET avg_hrv_rmssd = avg_hrv_rmssd * 1000
WHERE avg_hrv_rmssd IS NOT NULL 
  AND avg_hrv_rmssd < 1  -- Only update values that are clearly in seconds (< 1)
  AND avg_hrv_rmssd > 0;

-- Verify the changes
SELECT 
    'recovery_metrics' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN hrv_rmssd IS NOT NULL THEN 1 END) as records_with_hrv,
    ROUND(AVG(hrv_rmssd), 2) as avg_hrv_value,
    ROUND(MIN(hrv_rmssd), 2) as min_hrv_value,
    ROUND(MAX(hrv_rmssd), 2) as max_hrv_value
FROM recovery_metrics
WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'daily_summaries' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN avg_hrv_rmssd IS NOT NULL THEN 1 END) as records_with_hrv,
    ROUND(AVG(avg_hrv_rmssd), 2) as avg_hrv_value,
    ROUND(MIN(avg_hrv_rmssd), 2) as min_hrv_value,
    ROUND(MAX(avg_hrv_rmssd), 2) as max_hrv_value
FROM daily_summaries
WHERE summary_date >= CURRENT_DATE - INTERVAL '30 days';
