// Database types for TypeScript safety

export type UserRole = "athlete" | "doctor" | "admin"
export type ConnectionStatus = "pending" | "active" | "inactive"
export type PlatformType = "whoop" | "strava" | "garmin"
export type AlertPriority = "critical" | "warning" | "info"
export type AlertStatus = "unread" | "read" | "dismissed"
export type TrendDirection = "improving" | "stable" | "declining"

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  email: string
  preferred_language: "pt" | "en"
  preferred_unit_system: "metric" | "imperial"
  created_at: string
  updated_at: string
}

export interface DoctorPatientRelationship {
  id: string
  doctor_id: string
  patient_id: string
  status: ConnectionStatus
  created_at: string
  updated_at: string
}

export interface DeviceConnection {
  id: string
  user_id: string
  platform: PlatformType
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  is_active: boolean
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface SleepMetrics {
  id: string
  user_id: string
  source_platform: PlatformType
  metric_date: string
  sleep_duration_minutes: number | null
  sleep_quality_score: number | null
  sleep_stage_deep_minutes: number | null
  sleep_stage_light_minutes: number | null
  sleep_stage_rem_minutes: number | null
  sleep_stage_awake_minutes: number | null
  sleep_efficiency_percentage: number | null
  sleep_onset_latency_minutes: number | null
  disturbances_count: number | null
  raw_data: Record<string, any> | null
  created_at: string
}

export interface RecoveryMetrics {
  id: string
  user_id: string
  source_platform: PlatformType
  metric_date: string
  recovery_score: number | null
  hrv_rmssd: number | null
  resting_heart_rate: number | null
  skin_temp_celsius: number | null
  spo2_percentage: number | null
  respiratory_rate: number | null
  raw_data: Record<string, any> | null
  created_at: string
}

export interface WorkoutMetrics {
  id: string
  user_id: string
  source_platform: PlatformType
  metric_date: string
  workout_id: string | null
  strain_score: number | null
  calories_burned: number | null
  activity_duration_minutes: number | null
  avg_heart_rate: number | null
  max_heart_rate: number | null
  activity_type: string | null
  distance_meters: number | null
  raw_data: Record<string, any> | null
  created_at: string
}

export interface DailySummary {
  id: string
  user_id: string
  summary_date: string
  avg_recovery_score: number | null
  avg_hrv_rmssd: number | null
  avg_resting_hr: number | null
  total_sleep_minutes: number | null
  avg_sleep_quality_score: number | null
  total_strain: number | null
  total_calories: number | null
  total_workouts: number | null
  total_activity_minutes: number | null
  data_completeness: number | null
  sources: string[] | null
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  patient_id: string
  doctor_id: string | null
  metric_name: string
  metric_value: number
  threshold_value: number
  priority: AlertPriority
  message: string
  metric_date: string
  status: AlertStatus
  read_at: string | null
  email_sent: boolean
  email_sent_at: string | null
  in_app_notified: boolean
  created_at: string
}
