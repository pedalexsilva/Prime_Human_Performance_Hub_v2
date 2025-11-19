/**
 * Get the application base URL for OAuth redirects
 * Handles development, preview, and production environments
 */
export function getBaseUrl(): string {
  // Client-side
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Server-side with priority fallbacks
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Local development fallback
  return "http://localhost:3000"
}
