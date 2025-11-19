/**
 * Retry utilities with exponential backoff for API calls
 */

interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableStatusCodes?: number[]
}

interface RetryResult<T> {
  data: T
  attempts: number
  totalDelay: number
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 8000, // 8 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [429, 500, 502, 503, 504], // Rate limit and server errors
}

/**
 * Determines if an error should trigger a retry
 */
function isRetryableError(error: any, retryableStatusCodes: number[]): boolean {
  // Network errors
  if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT") {
    return true
  }

  // HTTP errors
  if (error.response?.status) {
    return retryableStatusCodes.includes(error.response.status)
  }

  // Fetch API errors
  if (error.status) {
    return retryableStatusCodes.includes(error.status)
  }

  return false
}

/**
 * Calculates delay for next retry attempt with exponential backoff
 */
function calculateDelay(attempt: number, initialDelay: number, maxDelay: number, backoffMultiplier: number): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1)
  return Math.min(delay, maxDelay)
}

/**
 * Sleeps for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Executes a function with retry logic and exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Result with data, attempts count, and total delay
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, initialDelay: 1000 }
 * )
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<RetryResult<T>> {
  const config = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  let totalDelay = 0

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const data = await fn()

      if (attempt > 1) {
        console.log(`[v0] Retry successful on attempt ${attempt}`)
      }

      return {
        data,
        attempts: attempt,
        totalDelay,
      }
    } catch (error: any) {
      lastError = error

      const isLastAttempt = attempt === config.maxAttempts
      const shouldRetry = isRetryableError(error, config.retryableStatusCodes)

      console.log(
        `[v0] Attempt ${attempt}/${config.maxAttempts} failed:`,
        error.message || error.status || "Unknown error",
      )

      if (!shouldRetry) {
        console.log("[v0] Error is not retryable, throwing immediately")
        throw error
      }

      if (isLastAttempt) {
        console.log("[v0] Max attempts reached, throwing error")
        throw lastError
      }

      // Calculate and apply delay
      const delay = calculateDelay(attempt, config.initialDelay, config.maxDelay, config.backoffMultiplier)

      console.log(`[v0] Waiting ${delay}ms before retry...`)
      await sleep(delay)
      totalDelay += delay
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError
}

/**
 * Wrapper for fetch with retry logic
 */
export async function fetchWithRetry(url: string, init?: RequestInit, options?: RetryOptions): Promise<Response> {
  const result = await retryWithBackoff(async () => {
    const response = await fetch(url, init)

    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`)
      error.status = response.status
      error.response = response
      throw error
    }

    return response
  }, options)

  return result.data
}
