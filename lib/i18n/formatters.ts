import type { Language } from "./translations"

/**
 * Get locale string from language code
 */
export function getLocale(language: Language): string {
  return language === "pt" ? "pt-BR" : "en-US"
}

/**
 * Format date according to language
 */
export function formatDate(
  date: Date | string | number,
  language: Language,
  options?: Intl.DateTimeFormatOptions,
): string {
  const locale = getLocale(language)
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  }

  return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj)
}

/**
 * Format time according to language
 * Portuguese: 24-hour format
 * English: 12-hour format with AM/PM
 */
export function formatTime(date: Date | string | number, language: Language): string {
  const locale = getLocale(language)
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: language === "eng", // 12-hour for English, 24-hour for Portuguese
  }

  return new Intl.DateTimeFormat(locale, options).format(dateObj)
}

/**
 * Format datetime according to language
 */
export function formatDateTime(date: Date | string | number, language: Language): string {
  const locale = getLocale(language)
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: language === "eng",
  }

  return new Intl.DateTimeFormat(locale, options).format(dateObj)
}

/**
 * Format number according to language
 * Portuguese: 1.234,56
 * English: 1,234.56
 */
export function formatNumber(value: number, language: Language, options?: Intl.NumberFormatOptions): string {
  const locale = getLocale(language)
  return new Intl.NumberFormat(locale, options).format(value)
}

/**
 * Format currency according to language
 * Portuguese: R$ 1.234,56
 * English: $1,234.56
 */
export function formatCurrency(value: number, language: Language, currency = "BRL"): string {
  const locale = getLocale(language)

  // Default to BRL for Portuguese and USD for English
  const defaultCurrency = language === "pt" ? "BRL" : "USD"
  const currencyCode = currency || defaultCurrency

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(value)
}

/**
 * Format percentage according to language
 */
export function formatPercent(value: number, language: Language, decimals = 1): string {
  const locale = getLocale(language)
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Format relative time (e.g., "2 days ago", "3 hours ago")
 */
export function formatRelativeTime(date: Date | string | number, language: Language, translations: any): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  const t = translations[language].datetime

  if (diffMins < 1) return t.justNow
  if (diffMins < 60) return `${diffMins} ${t.minutesAgo}`
  if (diffHours < 24) return `${diffHours} ${t.hoursAgo}`
  if (diffDays === 1) return t.yesterday
  if (diffDays < 7) return `${diffDays} ${t.daysAgo}`

  return formatDate(dateObj, language, { month: "short", day: "numeric" })
}
