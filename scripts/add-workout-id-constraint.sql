-- Add unique constraint on workout_id to prevent duplicate workouts
-- This allows upsert operations based on Whoop's workout ID

-- First, check if constraint already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'workout_metrics_workout_id_key'
    ) THEN
        -- Add unique constraint on workout_id
        ALTER TABLE workout_metrics 
        ADD CONSTRAINT workout_metrics_workout_id_key 
        UNIQUE (workout_id);
        
        RAISE NOTICE 'Constraint workout_metrics_workout_id_key added successfully';
    ELSE
        RAISE NOTICE 'Constraint workout_metrics_workout_id_key already exists';
    END IF;
END $$;

-- Create index for better query performance on workout_id
CREATE INDEX IF NOT EXISTS idx_workout_metrics_workout_id 
ON workout_metrics(workout_id);

-- Add index on user_id and metric_date for common queries
CREATE INDEX IF NOT EXISTS idx_workout_metrics_user_date 
ON workout_metrics(user_id, metric_date DESC);

COMMENT ON CONSTRAINT workout_metrics_workout_id_key ON workout_metrics IS 
'Ensures each Whoop workout is stored only once, enabling upsert operations';
