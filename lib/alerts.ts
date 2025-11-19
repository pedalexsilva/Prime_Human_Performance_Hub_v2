import type { AthleteMetric } from "./types/athlete-metrics"

export type AlertSeverity = "critical" | "warning" | "info"

export interface Alert {
  id: string
  athlete_id: number
  athlete_name: string
  rule_id: string
  severity: AlertSeverity
  message: string
  recommendation?: string
  detected_at: string // ISO 8601
  metric_value?: number
  threshold?: number
}

export interface AlertRule {
  id: string
  name: string
  severity: AlertSeverity
  condition: (data: AthleteMetric[]) => boolean
  getMessage: (data: AthleteMetric[]) => string
  getRecommendation?: (data: AthleteMetric[]) => string
  getMetricValue?: (data: AthleteMetric[]) => number
  threshold?: number
}

/**
 * Alert rules configuration
 * Modular structure allows easy calibration and future ML integration
 */
export const ALERT_RULES: AlertRule[] = [
  // Critical: Severe fatigue
  {
    id: "critical-low-recovery",
    name: "Fadiga Severa",
    severity: "critical",
    condition: (data) => {
      const latest = data[data.length - 1]
      return latest.recovery < 33
    },
    getMessage: (data) => `Recuperação crítica: ${data[data.length - 1].recovery.toFixed(0)}%`,
    getRecommendation: () => "Repouso completo recomendado. Evitar treinos de alta intensidade.",
    getMetricValue: (data) => data[data.length - 1].recovery,
    threshold: 33,
  },

  // Warning: Risk of overtraining
  {
    id: "warning-low-recovery",
    name: "Risco de Overtraining",
    severity: "warning",
    condition: (data) => {
      const latest = data[data.length - 1]
      return latest.recovery >= 33 && latest.recovery < 50
    },
    getMessage: (data) => `Recuperação baixa: ${data[data.length - 1].recovery.toFixed(0)}%`,
    getRecommendation: () => "Considerar treino leve ou recuperação ativa.",
    getMetricValue: (data) => data[data.length - 1].recovery,
    threshold: 50,
  },

  // Warning: HRV drop
  {
    id: "warning-hrv-drop",
    name: "Stress Fisiológico",
    severity: "warning",
    condition: (data) => {
      if (data.length < 8) return false
      const recent7 = data.slice(-7)
      const avg7d = recent7.reduce((sum, d) => sum + d.hrv, 0) / 7
      const latest = data[data.length - 1].hrv
      const drop = ((avg7d - latest) / avg7d) * 100
      return drop > 15
    },
    getMessage: (data) => {
      const recent7 = data.slice(-7)
      const avg7d = recent7.reduce((sum, d) => sum + d.hrv, 0) / 7
      const latest = data[data.length - 1].hrv
      const drop = ((avg7d - latest) / avg7d) * 100
      return `HRV abaixo da média: -${drop.toFixed(0)}%`
    },
    getRecommendation: () => "Possível stress fisiológico. Verificar qualidade do sono e níveis de stress.",
    getMetricValue: (data) => data[data.length - 1].hrv,
  },

  // Warning: Sleep deprivation pattern
  {
    id: "warning-sleep-pattern",
    name: "Privação de Sono",
    severity: "warning",
    condition: (data) => {
      if (data.length < 3) return false
      const last3 = data.slice(-3)
      return last3.every((d) => d.sleep_performance < 75)
    },
    getMessage: () => "Sono insuficiente há 3 dias consecutivos",
    getRecommendation: () => "Priorizar higiene do sono. Considerar ajuste de horários de treino.",
    getMetricValue: (data) => data[data.length - 1].sleep_performance,
    threshold: 75,
  },

  // Warning: High strain load
  {
    id: "warning-high-strain",
    name: "Carga Excessiva",
    severity: "warning",
    condition: (data) => {
      const latest = data[data.length - 1]
      return (latest.strain_load_7d || 0) > 15
    },
    getMessage: (data) => `Carga de treino elevada: ${data[data.length - 1].strain_load_7d?.toFixed(1)}`,
    getRecommendation: () => "Considerar semana de descarga para prevenir overtraining.",
    getMetricValue: (data) => data[data.length - 1].strain_load_7d,
    threshold: 15,
  },

  // Info: Poor sleep consistency
  {
    id: "info-sleep-consistency",
    name: "Padrão Irregular de Sono",
    severity: "info",
    condition: (data) => {
      const latest = data[data.length - 1]
      return (latest.sleep_consistency || 100) < 70
    },
    getMessage: (data) => `Consistência de sono baixa: ${data[data.length - 1].sleep_consistency?.toFixed(0)}%`,
    getRecommendation: () => "Estabelecer rotina de sono mais consistente.",
    getMetricValue: (data) => data[data.length - 1].sleep_consistency,
    threshold: 70,
  },

  // Warning: Recovery deterioration
  {
    id: "warning-recovery-trend",
    name: "Deterioração de Recuperação",
    severity: "warning",
    condition: (data) => {
      const latest = data[data.length - 1]
      return (latest.recovery_trend_3d || 0) < -10
    },
    getMessage: (data) => `Tendência negativa de recuperação: ${data[data.length - 1].recovery_trend_3d?.toFixed(0)}%`,
    getRecommendation: () => "Monitorar de perto. Pode indicar acumulação de fadiga.",
    getMetricValue: (data) => data[data.length - 1].recovery_trend_3d,
    threshold: -10,
  },
]

/**
 * Detect alerts for a single athlete
 * @param athleteData - Array of athlete metrics (chronologically ordered)
 * @returns Array of active alerts
 */
export function detectAlerts(athleteData: AthleteMetric[]): Alert[] {
  if (athleteData.length === 0) return []

  const alerts: Alert[] = []
  const latestMetric = athleteData[athleteData.length - 1]

  for (const rule of ALERT_RULES) {
    if (rule.condition(athleteData)) {
      alerts.push({
        id: `${rule.id}-${latestMetric.athlete_id}-${Date.now()}`,
        athlete_id: latestMetric.athlete_id,
        athlete_name: latestMetric.name,
        rule_id: rule.id,
        severity: rule.severity,
        message: rule.getMessage(athleteData),
        recommendation: rule.getRecommendation?.(athleteData),
        detected_at: new Date().toISOString(),
        metric_value: rule.getMetricValue?.(athleteData),
        threshold: rule.threshold,
      })
    }
  }

  return alerts
}

/**
 * Get alerts for all athletes
 * @param allAthletesData - Map of athlete_id to metrics array
 * @returns Array of all alerts sorted by severity
 */
export function detectAllAlerts(allAthletesData: Map<number, AthleteMetric[]>): Alert[] {
  const allAlerts: Alert[] = []

  for (const [, athleteData] of allAthletesData) {
    const alerts = detectAlerts(athleteData)
    allAlerts.push(...alerts)
  }

  // Sort by severity: critical > warning > info
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  return allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
