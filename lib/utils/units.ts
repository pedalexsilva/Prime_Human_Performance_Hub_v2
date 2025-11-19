// Unit conversion utilities for metric/imperial system

export type UnitSystem = "metric" | "imperial"

interface ConversionResult {
  value: number
  unit: string
}

export function convertDistance(meters: number, system: UnitSystem): ConversionResult {
  if (system === "imperial") {
    return {
      value: meters * 0.000621371, // miles
      unit: "mi",
    }
  }
  return {
    value: meters / 1000, // km
    unit: "km",
  }
}

export function convertWeight(kg: number, system: UnitSystem): ConversionResult {
  if (system === "imperial") {
    return {
      value: kg * 2.20462, // lbs
      unit: "lbs",
    }
  }
  return { value: kg, unit: "kg" }
}

export function convertTemperature(celsius: number, system: UnitSystem): ConversionResult {
  if (system === "imperial") {
    return {
      value: (celsius * 9) / 5 + 32, // fahrenheit
      unit: "°F",
    }
  }
  return { value: celsius, unit: "°C" }
}

export function formatMetric(
  value: number | null | undefined,
  metricName: string,
  system: UnitSystem,
  locale: string,
): string {
  if (value === null || value === undefined) return "--"

  const converters: Record<string, (val: number, sys: UnitSystem) => ConversionResult> = {
    distance_meters: convertDistance,
    weight_kg: convertWeight,
    skin_temp_celsius: convertTemperature,
  }

  const converter = converters[metricName]
  if (!converter) {
    // No conversion needed, just format
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    }).format(value)
  }

  const converted = converter(value, system)
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(converted.value)} ${converted.unit}`
}

// Helper to get localized metric labels
export function getMetricLabel(metricName: string, locale: string): string {
  const labels: Record<string, Record<string, string>> = {
    recovery_score: {
      pt: "Recuperação",
      en: "Recovery",
    },
    hrv_rmssd: {
      pt: "VFC (HRV)",
      en: "HRV",
    },
    sleep_duration_minutes: {
      pt: "Duração do Sono",
      en: "Sleep Duration",
    },
    strain_score: {
      pt: "Carga de Treino",
      en: "Strain",
    },
    resting_heart_rate: {
      pt: "FC em Repouso",
      en: "Resting HR",
    },
  }

  return labels[metricName]?.[locale] || metricName
}
