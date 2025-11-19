import type { AthleteMetric, AthleteProfile, MetricGenerationParams } from "./types/athlete-metrics"

/**
 * Generate array of dates in ISO 8601 format
 * @param startDate - Starting date
 * @param days - Number of days to generate
 * @returns Array of ISO date strings
 */
export function generateDateRange(startDate: Date, days: number): string[] {
  const dates: string[] = []
  const current = new Date(startDate)

  for (let i = 0; i < days; i++) {
    dates.push(current.toISOString().split("T")[0] + "T00:00:00Z")
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Generate sinusoidal trend with noise for realistic variation
 * @param params - Generation parameters
 * @param numPoints - Number of data points
 * @returns Array of values
 */
function generateSinusoidalTrend(params: MetricGenerationParams, numPoints: number): number[] {
  const values: number[] = []

  for (let i = 0; i < numPoints; i++) {
    // Sinusoidal component (circadian rhythm simulation)
    const sinComponent = params.amplitude * Math.sin((2 * Math.PI * i) / params.period)

    // Linear trend component (e.g., progressive overtraining)
    const trendComponent = (params.trend || 0) * i

    // Random noise
    const noiseComponent = (Math.random() - 0.5) * 2 * params.noise

    const value = params.baseline + sinComponent + trendComponent + noiseComponent
    values.push(value)
  }

  return values
}

/**
 * Apply autocorrelation to simulate day-to-day continuity
 * @param values - Original values
 * @param correlation - Correlation coefficient (0-1)
 * @returns Correlated values
 */
function applyCorrelatedNoise(values: number[], correlation: number): number[] {
  if (correlation <= 0 || values.length === 0) return values

  const correlated: number[] = [values[0]]

  for (let i = 1; i < values.length; i++) {
    // AR(1) process: x[t] = correlation * x[t-1] + (1-correlation) * x[t]
    const smoothed = correlation * correlated[i - 1] + (1 - correlation) * values[i]
    correlated.push(smoothed)
  }

  return correlated
}

/**
 * Calculate derived metrics from base data
 * @param data - Array of athlete metrics
 * @returns Same array with derived metrics populated
 */
export function calculateDerivedMetrics(data: AthleteMetric[]): AthleteMetric[] {
  return data.map((metric, index) => {
    // Recovery trend (3-day)
    if (index >= 3) {
      const prev3 = data.slice(index - 3, index)
      const avg3d = prev3.reduce((sum, d) => sum + d.recovery, 0) / 3
      metric.recovery_trend_3d = ((metric.recovery - avg3d) / avg3d) * 100
    }

    // Strain load (7-day moving average)
    if (index >= 6) {
      const prev7 = data.slice(index - 6, index + 1)
      metric.strain_load_7d = prev7.reduce((sum, d) => sum + d.strain, 0) / 7
    }

    // Sleep consistency (7-day standard deviation inverted)
    if (index >= 6) {
      const prev7 = data.slice(index - 6, index + 1)
      const avgSleep = prev7.reduce((sum, d) => sum + d.sleep_performance, 0) / 7
      const variance = prev7.reduce((sum, d) => sum + Math.pow(d.sleep_performance - avgSleep, 2), 0) / 7
      const stdDev = Math.sqrt(variance)
      // Invert: lower stdDev = higher consistency
      metric.sleep_consistency = Math.max(0, 100 - stdDev * 2)
    }

    // HRV trend (7-day)
    if (index >= 7) {
      const prev7 = data.slice(index - 7, index)
      const avg7d = prev7.reduce((sum, d) => sum + d.hrv, 0) / 7
      metric.hrv_trend_7d = ((metric.hrv - avg7d) / avg7d) * 100
    }

    return metric
  })
}

/**
 * Generate realistic athlete data with physiological correlations
 * @param profile - Athlete profile with behavior pattern
 * @param startDate - Starting date
 * @param days - Number of days (default: 14)
 * @returns Array of athlete metrics
 */
export function generateRealisticAthleteData(
  profile: AthleteProfile,
  startDate: Date = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 14 days ago
  days = 14,
): AthleteMetric[] {
  const dates = generateDateRange(startDate, days)

  // Profile-specific parameters
  let strainParams: MetricGenerationParams
  let recoveryParams: MetricGenerationParams
  let sleepParams: MetricGenerationParams
  let hrvParams: MetricGenerationParams

  switch (profile.profile_type) {
    case "overtraining":
      strainParams = { baseline: 15, amplitude: 2, period: 7, noise: 1, trend: 0.1 }
      recoveryParams = { baseline: 55, amplitude: 10, period: 7, noise: 8, trend: -0.5 }
      sleepParams = { baseline: 78, amplitude: 8, period: 7, noise: 5 }
      hrvParams = { baseline: 85, amplitude: 8, period: 7, noise: 6, trend: -0.3 }
      break

    case "balanced":
      strainParams = { baseline: 12, amplitude: 2, period: 7, noise: 1.5 }
      recoveryParams = { baseline: 70, amplitude: 12, period: 7, noise: 6 }
      sleepParams = { baseline: 85, amplitude: 6, period: 7, noise: 4 }
      hrvParams = { baseline: 95, amplitude: 8, period: 7, noise: 5 }
      break

    case "sleep_deprived":
      strainParams = { baseline: 11, amplitude: 2, period: 7, noise: 1.5 }
      recoveryParams = { baseline: 60, amplitude: 10, period: 7, noise: 7 }
      sleepParams = { baseline: 68, amplitude: 10, period: 7, noise: 8 }
      hrvParams = { baseline: 80, amplitude: 10, period: 7, noise: 7 }
      break

    case "optimal":
      strainParams = { baseline: 13, amplitude: 2, period: 7, noise: 1 }
      recoveryParams = { baseline: 85, amplitude: 8, period: 7, noise: 4 }
      sleepParams = { baseline: 92, amplitude: 4, period: 7, noise: 2 }
      hrvParams = { baseline: 105, amplitude: 6, period: 7, noise: 4 }
      break

    case "inconsistent":
      strainParams = { baseline: 12, amplitude: 4, period: 3, noise: 3 }
      recoveryParams = { baseline: 65, amplitude: 20, period: 4, noise: 12 }
      sleepParams = { baseline: 80, amplitude: 15, period: 5, noise: 10 }
      hrvParams = { baseline: 90, amplitude: 15, period: 4, noise: 10 }
      break
  }

  // Generate base time series
  let strainValues = generateSinusoidalTrend(strainParams, days)
  let recoveryValues = generateSinusoidalTrend(recoveryParams, days)
  let sleepValues = generateSinusoidalTrend(sleepParams, days)
  let hrvValues = generateSinusoidalTrend(hrvParams, days)

  // Apply autocorrelation for realistic day-to-day continuity
  strainValues = applyCorrelatedNoise(strainValues, 0.7)
  recoveryValues = applyCorrelatedNoise(recoveryValues, 0.8)
  sleepValues = applyCorrelatedNoise(sleepValues, 0.75)
  hrvValues = applyCorrelatedNoise(hrvValues, 0.8)

  // Apply physiological correlation: HRV inversely correlated with Strain
  hrvValues = hrvValues.map((hrv, i) => {
    const strainEffect = (strainValues[i] - 12) * -2 // Higher strain reduces HRV
    return Math.max(60, hrv + strainEffect)
  })

  // Clamp values to realistic ranges
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  // Build athlete metrics
  const metrics: AthleteMetric[] = dates.map((date, i) => ({
    athlete_id: profile.id,
    name: profile.name,
    team: profile.team,
    date,
    timestamp: new Date(date).getTime(),
    strain: clamp(strainValues[i], 0, 21),
    recovery: clamp(recoveryValues[i], 0, 100),
    sleep_performance: clamp(sleepValues[i], 0, 100),
    hrv: clamp(hrvValues[i], 40, 150),
    resting_heart_rate: clamp(50 - (hrvValues[i] - 90) * 0.1, 40, 65),
    respiratory_rate: clamp(14 + (Math.random() - 0.5) * 2, 12, 18),
  }))

  // Calculate derived metrics
  return calculateDerivedMetrics(metrics)
}

/**
 * Mock athlete profiles with distinct patterns
 */
export const MOCK_ATHLETES: AthleteProfile[] = [
  { id: 1, name: "João Silva", team: "Equipa A", profile_type: "overtraining" },
  { id: 2, name: "Maria Santos", team: "Equipa A", profile_type: "balanced" },
  { id: 3, name: "Pedro Costa", team: "Equipa B", profile_type: "sleep_deprived" },
  { id: 4, name: "Ana Rodrigues", team: "Equipa B", profile_type: "optimal" },
  { id: 5, name: "Carlos Fernandes", team: "Equipa C", profile_type: "inconsistent" },
]

/**
 * Generate all mock data (14 days for 5 athletes)
 */
export function generateAllMockData(): Map<number, AthleteMetric[]> {
  const allData = new Map<number, AthleteMetric[]>()

  for (const athlete of MOCK_ATHLETES) {
    const data = generateRealisticAthleteData(athlete)
    allData.set(athlete.id, data)
  }

  return allData
}

/**
 * Get data for a specific athlete
 */
export function getAthleteData(athleteId: number): AthleteMetric[] {
  const allData = generateAllMockData()
  return allData.get(athleteId) || []
}

/**
 * Get all athletes data (flattened)
 */
export function getAllAthletesData(): AthleteMetric[] {
  const allData = generateAllMockData()
  const flattened: AthleteMetric[] = []

  for (const [, data] of allData) {
    flattened.push(...data)
  }

  return flattened.sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Calculate summary statistics for an athlete
 */
export function getAthleteSummary(athleteId: number, days = 7) {
  const data = getAthleteData(athleteId)
  if (data.length === 0) return null

  const recentData = data.slice(-days)

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

  return {
    athlete_id: athleteId,
    name: data[0].name,
    team: data[0].team,
    period_days: days,
    avg_recovery: avg(recentData.map((d) => d.recovery)),
    avg_strain: avg(recentData.map((d) => d.strain)),
    avg_sleep: avg(recentData.map((d) => d.sleep_performance)),
    avg_hrv: avg(recentData.map((d) => d.hrv)),
    latest: recentData[recentData.length - 1],
  }
}
