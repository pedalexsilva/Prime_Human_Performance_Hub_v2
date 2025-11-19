/**
 * Base athlete metric from Whoop API
 * Represents daily physiological data
 */
export interface AthleteMetric {
  // Identification
  athlete_id: number
  name: string
  team: string

  // Temporal data (ISO 8601 format, UTC timezone)
  date: string
  timestamp: number // Unix timestamp for sorting

  // Base metrics from Whoop
  strain: number // 0-21 scale
  recovery: number // 0-100%
  sleep_performance: number // 0-100%
  hrv: number // milliseconds
  resting_heart_rate: number // bpm
  respiratory_rate: number // breaths per minute

  // Derived metrics (calculated)
  recovery_trend_3d?: number // Delta vs 3-day average
  strain_load_7d?: number // 7-day moving average
  sleep_consistency?: number // Sleep quality consistency (0-100)
  hrv_trend_7d?: number // HRV trend percentage
}

/**
 * Athlete profile with distinct physiological patterns
 */
export interface AthleteProfile {
  id: number
  name: string
  team: string
  profile_type: "overtraining" | "balanced" | "sleep_deprived" | "optimal" | "inconsistent"
}

/**
 * Statistical parameters for realistic data generation
 */
export interface MetricGenerationParams {
  baseline: number
  amplitude: number
  period: number
  noise: number
  trend?: number // Linear trend per day
  correlation?: number // Correlation with another metric
}
