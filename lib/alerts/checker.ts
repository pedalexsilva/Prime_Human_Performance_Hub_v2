import { createServerClient } from "@/lib/supabase/server"
import { getAlertMessage } from "@/lib/utils/alerts"

interface Threshold {
  id: string
  doctor_id: string
  patient_id: string
  metric_name: string
  threshold_value: number
  comparison_operator: "<" | ">" | "<=" | ">="
  priority: "critical" | "warning" | "info"
}

interface MetricValue {
  metric_name: string
  value: number
  metric_date: string
}

/**
 * Get active thresholds for a patient
 */
async function getActiveThresholds(patientId: string): Promise<Threshold[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("alert_thresholds")
    .select("*")
    .eq("patient_id", patientId)
    .eq("is_active", true)

  if (error) {
    console.error("[v0] Error fetching thresholds:", error)
    return []
  }

  return data || []
}

/**
 * Evaluate if a metric value breaches a threshold
 */
function evaluateThreshold(value: number, threshold: Threshold): boolean {
  switch (threshold.comparison_operator) {
    case "<":
      return value < threshold.threshold_value
    case ">":
      return value > threshold.threshold_value
    case "<=":
      return value <= threshold.threshold_value
    case ">=":
      return value >= threshold.threshold_value
    default:
      return false
  }
}

/**
 * Create alert in database
 */
async function createAlert(
  patientId: string,
  doctorId: string,
  metricName: string,
  metricValue: number,
  thresholdValue: number,
  priority: string,
  metricDate: string,
): Promise<void> {
  const supabase = await createServerClient()

  const message = getAlertMessage(metricName, metricValue, thresholdValue, priority as any)

  const { error } = await supabase.from("alerts").insert({
    patient_id: patientId,
    doctor_id: doctorId,
    metric_name: metricName,
    metric_value: metricValue,
    threshold_value: thresholdValue,
    priority,
    message,
    metric_date: metricDate,
    status: "unread",
    email_sent: false,
    in_app_notified: true,
  })

  if (error) {
    console.error("[v0] Error creating alert:", error)
    throw new Error("Failed to create alert")
  }

  console.log("[v0] Created alert:", { patientId, metricName, priority })
}

/**
 * Create in-app notification for doctor
 */
async function createNotification(doctorId: string, alertId: string, priority: string, message: string): Promise<void> {
  const supabase = await createServerClient()

  const { error } = await supabase.from("notifications").insert({
    user_id: doctorId,
    type: "alert",
    title: `${priority.toUpperCase()} Alert`,
    body: message,
    priority,
    related_alert_id: alertId,
    is_read: false,
  })

  if (error) {
    console.error("[v0] Error creating notification:", error)
  }
}

/**
 * Check recovery metrics against thresholds
 */
async function checkRecoveryMetrics(patientId: string, metricDate: string): Promise<MetricValue[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("recovery_metrics")
    .select("recovery_score, hrv_rmssd, resting_heart_rate")
    .eq("user_id", patientId)
    .eq("metric_date", metricDate)
    .single()

  if (error || !data) {
    return []
  }

  return [
    { metric_name: "recovery_score", value: data.recovery_score, metric_date: metricDate },
    { metric_name: "hrv_rmssd", value: data.hrv_rmssd, metric_date: metricDate },
    { metric_name: "resting_heart_rate", value: data.resting_heart_rate, metric_date: metricDate },
  ]
}

/**
 * Check sleep metrics against thresholds
 */
async function checkSleepMetrics(patientId: string, metricDate: string): Promise<MetricValue[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("sleep_metrics")
    .select("total_sleep_minutes, sleep_efficiency_percentage")
    .eq("user_id", patientId)
    .eq("metric_date", metricDate)
    .single()

  if (error || !data) {
    return []
  }

  return [
    { metric_name: "sleep_duration_minutes", value: data.total_sleep_minutes, metric_date: metricDate },
    { metric_name: "sleep_efficiency_percentage", value: data.sleep_efficiency_percentage, metric_date: metricDate },
  ]
}

/**
 * Check workout metrics against thresholds
 */
async function checkWorkoutMetrics(patientId: string, metricDate: string): Promise<MetricValue[]> {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("workout_metrics")
    .select("strain_score")
    .eq("user_id", patientId)
    .eq("metric_date", metricDate)

  if (error || !data || data.length === 0) {
    return []
  }

  // Sum all strain scores for the day
  const totalStrain = data.reduce((sum, w) => sum + (w.strain_score || 0), 0)

  return [{ metric_name: "strain_score", value: totalStrain, metric_date: metricDate }]
}

/**
 * Check all metrics for a patient on a specific date
 */
export async function checkPatientMetrics(patientId: string, metricDate: string): Promise<number> {
  console.log("[v0] Checking metrics for patient:", patientId, "date:", metricDate)

  const thresholds = await getActiveThresholds(patientId)

  if (thresholds.length === 0) {
    console.log("[v0] No active thresholds for patient:", patientId)
    return 0
  }

  // Gather all metrics
  const [recoveryMetrics, sleepMetrics, workoutMetrics] = await Promise.all([
    checkRecoveryMetrics(patientId, metricDate),
    checkSleepMetrics(patientId, metricDate),
    checkWorkoutMetrics(patientId, metricDate),
  ])

  const allMetrics = [...recoveryMetrics, ...sleepMetrics, ...workoutMetrics]

  let alertsCreated = 0

  // Check each metric against thresholds
  for (const metric of allMetrics) {
    const relevantThresholds = thresholds.filter((t) => t.metric_name === metric.metric_name)

    for (const threshold of relevantThresholds) {
      if (evaluateThreshold(metric.value, threshold)) {
        await createAlert(
          patientId,
          threshold.doctor_id,
          metric.metric_name,
          metric.value,
          threshold.threshold_value,
          threshold.priority,
          metric.metric_date,
        )

        alertsCreated++
      }
    }
  }

  console.log("[v0] Created", alertsCreated, "alerts for patient:", patientId)

  return alertsCreated
}

/**
 * Check metrics for all patients (called after sync)
 */
export async function checkAllPatientMetrics(metricDate: string): Promise<number> {
  const supabase = await createServerClient()

  // Get all patients with active thresholds
  const { data: thresholds, error } = await supabase.from("alert_thresholds").select("patient_id").eq("is_active", true)

  if (error || !thresholds || thresholds.length === 0) {
    return 0
  }

  const uniquePatientIds = [...new Set(thresholds.map((t) => t.patient_id))]

  console.log("[v0] Checking metrics for", uniquePatientIds.length, "patients")

  let totalAlerts = 0

  for (const patientId of uniquePatientIds) {
    const alertsCreated = await checkPatientMetrics(patientId, metricDate)
    totalAlerts += alertsCreated
  }

  return totalAlerts
}

/**
 * Get default thresholds for a patient
 */
export const DEFAULT_THRESHOLDS = {
  recovery_score: [
    { value: 33, operator: "<" as const, priority: "critical" as const },
    { value: 50, operator: "<" as const, priority: "warning" as const },
  ],
  hrv_rmssd: [
    { value: 30, operator: "<" as const, priority: "critical" as const },
    { value: 40, operator: "<" as const, priority: "warning" as const },
  ],
  sleep_duration_minutes: [
    { value: 300, operator: "<" as const, priority: "critical" as const },
    { value: 360, operator: "<" as const, priority: "warning" as const },
  ],
  resting_heart_rate: [
    { value: 100, operator: ">" as const, priority: "critical" as const },
    { value: 85, operator: ">" as const, priority: "warning" as const },
  ],
  strain_score: [
    { value: 20, operator: ">" as const, priority: "critical" as const },
    { value: 18, operator: ">" as const, priority: "warning" as const },
  ],
}

/**
 * Initialize default thresholds for a patient
 */
export async function initializeDefaultThresholds(patientId: string, doctorId: string): Promise<void> {
  const supabase = await createServerClient()

  const thresholds = []

  for (const [metricName, rules] of Object.entries(DEFAULT_THRESHOLDS)) {
    for (const rule of rules) {
      thresholds.push({
        doctor_id: doctorId,
        patient_id: patientId,
        metric_name: metricName,
        threshold_value: rule.value,
        comparison_operator: rule.operator,
        priority: rule.priority,
        is_active: true,
      })
    }
  }

  const { error } = await supabase.from("alert_thresholds").insert(thresholds)

  if (error) {
    console.error("[v0] Error initializing thresholds:", error)
    throw new Error("Failed to initialize thresholds")
  }

  console.log("[v0] Initialized default thresholds for patient:", patientId)
}
