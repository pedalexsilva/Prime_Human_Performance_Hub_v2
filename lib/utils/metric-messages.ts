// lib/utils/metric-messages.ts

/**
 * Gera mensagens dinâmicas baseadas nos valores das métricas
 */

export interface MetricMessage {
  message: string
  color: "red" | "yellow" | "green"
  icon: "🔴" | "🟡" | "🟢"
}

/**
 * Recovery Score (0-100%)
 */
export function getRecoveryMessage(score: number | null | undefined): MetricMessage {
  if (score === null || score === undefined) {
    return {
      message: "Sem dados de recuperação disponíveis",
      color: "yellow",
      icon: "🟡"
    }
  }

  if (score >= 67) {
    return {
      message: "Corpo pronto para alta performance!",
      color: "green",
      icon: "🟢"
    }
  }

  if (score >= 34) {
    return {
      message: "Recuperação moderada. Treino leve recomendado.",
      color: "yellow",
      icon: "🟡"
    }
  }

  return {
    message: "Descansa hoje. Teu corpo precisa de recuperar.",
    color: "red",
    icon: "🔴"
  }
}

/**
 * HRV - Heart Rate Variability (RMSSD in milliseconds)
 */
export function getHRVMessage(hrv: number | null | undefined): MetricMessage {
  if (hrv === null || hrv === undefined) {
    return {
      message: "Sem dados de HRV disponíveis",
      color: "yellow",
      icon: "🟡"
    }
  }

  if (hrv > 70) {
    return {
      message: "HRV excelente. Ótima recuperação!",
      color: "green",
      icon: "🟢"
    }
  }

  if (hrv >= 30) {
    return {
      message: "HRV dentro da normalidade.",
      color: "yellow",
      icon: "🟡"
    }
  }

  return {
    message: "HRV baixo. Stress elevado ou fadiga.",
    color: "red",
    icon: "🔴"
  }
}

/**
 * Sleep Duration (in hours)
 */
export function getSleepMessage(hours: number | null | undefined): MetricMessage {
  if (hours === null || hours === undefined) {
    return {
      message: "Sem dados de sono disponíveis",
      color: "yellow",
      icon: "🟡"
    }
  }

  if (hours >= 7) {
    return {
      message: "Excelente quantidade de sono!",
      color: "green",
      icon: "🟢"
    }
  }

  if (hours >= 6) {
    return {
      message: "Sono adequado mas pode melhorar.",
      color: "yellow",
      icon: "🟡"
    }
  }

  return {
    message: "Sono insuficiente. Tenta dormir mais.",
    color: "red",
    icon: "🔴"
  }
}

/**
 * Format sleep duration from minutes to "Xh Ym" format
 */
export function formatSleepDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) {
    return "Sem dados"
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  return `${hours}h ${mins}m`
}

/**
 * Get color class for Tailwind based on metric color
 */
export function getColorClass(color: "red" | "yellow" | "green", type: "text" | "bg" | "border" = "text"): string {
  const colorMap = {
    red: {
      text: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20"
    },
    yellow: {
      text: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/20"
    },
    green: {
      text: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20"
    }
  }

  return colorMap[color][type]
}
