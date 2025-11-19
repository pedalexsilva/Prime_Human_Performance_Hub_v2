export interface NormalizedRecoveryMetrics {
  user_id: string
  source_platform: string
  metric_date: string
  recovery_score: number
  hrv_rmssd: number
  resting_heart_rate: number
  spo2_percentage: number
  skin_temp_celsius: number
  raw_data: any
}

export interface NormalizedSleepMetrics {
  user_id: string
  source_platform: string
  metric_date: string
  sleep_start: string
  sleep_end: string
  total_sleep_minutes: number
  light_sleep_minutes: number
  deep_sleep_minutes: number
  rem_sleep_minutes: number
  awake_minutes: number
  sleep_efficiency_percentage: number
  sleep_performance_percentage: number
  sleep_consistency_percentage: number
  respiratory_rate: number
  disturbance_count: number
  is_nap: boolean
  raw_data: any
}

export interface NormalizedWorkoutMetrics {
  user_id: string
  source_platform: string
  metric_date: string
  workout_start: string
  workout_end: string
  duration_minutes: number
  strain_score: number
  average_heart_rate: number
  max_heart_rate: number
  calories_burned: number
  distance_meters: number
  altitude_gain_meters: number
  sport_id: number
  zone_durations: any
  raw_data: any
}
