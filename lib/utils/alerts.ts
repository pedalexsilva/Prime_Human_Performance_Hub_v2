// Alert utilities and threshold evaluation

import type { AlertPriority } from "@/lib/types/database"

interface ThresholdCheck {
  metric_name: string
  threshold_value: number
  comparison_operator: "<" | ">" | "<=" | ">="
  priority: AlertPriority
}

export function evaluateThreshold(metricValue: number | null | undefined, threshold: ThresholdCheck): boolean {
  if (metricValue === null || metricValue === undefined) return false

  switch (threshold.comparison_operator) {
    case "<":
      return metricValue < threshold.threshold_value
    case ">":
      return metricValue > threshold.threshold_value
    case "<=":
      return metricValue <= threshold.threshold_value
    case ">=":
      return metricValue >= threshold.threshold_value
    default:
      return false
  }
}

export function generateAlertMessage(
  metricName: string,
  metricValue: number,
  thresholdValue: number,
  operator: string,
  locale = "pt",
): string {
  const metricLabels: Record<string, Record<string, string>> = {
    recovery_score: { pt: "Recuperação", en: "Recovery" },
    hrv_rmssd: { pt: "VFC", en: "HRV" },
    sleep_duration_minutes: { pt: "Sono", en: "Sleep" },
    resting_heart_rate: { pt: "FC Repouso", en: "Resting HR" },
  }

  const label = metricLabels[metricName]?.[locale] || metricName

  if (locale === "pt") {
    return `${label}: ${metricValue} (limiar: ${operator} ${thresholdValue})`
  } else {
    return `${label}: ${metricValue} (threshold: ${operator} ${thresholdValue})`
  }
}

export { generateAlertMessage as getAlertMessage }

export function getAlertPriorityColor(priority: AlertPriority): string {
  const colors: Record<AlertPriority, string> = {
    critical: "bg-critical/10 border-critical text-critical",
    warning: "bg-warning/10 border-warning text-warning-foreground",
    info: "bg-info/10 border-info text-info-foreground",
  }

  return colors[priority] || colors.info
}

export function getRecoveryScoreStatus(score: number | null): {
  status: "good" | "fair" | "poor"
  color: string
  label: string
} {
  if (score === null) return { status: "poor", color: "text-muted-foreground", label: "--" }

  if (score >= 67) {
    return { status: "good", color: "text-success", label: "Boa" }
  } else if (score >= 34) {
    return { status: "fair", color: "text-warning-foreground", label: "Moderada" }
  } else {
    return { status: "poor", color: "text-critical", label: "Baixa" }
  }
}
