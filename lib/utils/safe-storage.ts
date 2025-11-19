/**
 * Safe localStorage wrapper that handles SSR and browser restrictions
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null

  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.warn(`[Storage] Failed to get item "${key}":`, error)
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false

  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`[Storage] Failed to set item "${key}":`, error)
    return false
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === "undefined") return false

  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn(`[Storage] Failed to remove item "${key}":`, error)
    return false
  }
}
