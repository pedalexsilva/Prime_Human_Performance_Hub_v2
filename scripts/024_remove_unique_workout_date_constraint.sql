-- Remove the unique constraint that prevents multiple workouts per day
DROP INDEX IF EXISTS idx_workout_user_date;

-- Recreate it as a standard (non-unique) index for performance
CREATE INDEX IF NOT EXISTS idx_workout_metrics_user_date_v2 ON public.workout_metrics(user_id, metric_date DESC);
