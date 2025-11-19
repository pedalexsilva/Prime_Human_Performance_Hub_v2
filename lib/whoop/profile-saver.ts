import { ensureValidToken } from "./tokens"
import { fetchWithRetry } from "./retry"

const WHOOP_BASE = "https://api.prod.whoop.com/developer/v2"

/* -----------------------------------------
   PAGINAÇÃO WHOOP API V2
----------------------------------------- */
async function fetchPaginated(
  url: string,
  accessToken: string
): Promise<any[]> {
  let results: any[] = []
  let nextToken: string | null = null
  
  do {
    const fullUrl = new URL(url)
    fullUrl.searchParams.set("limit", "25")
    if (nextToken) fullUrl.searchParams.set("nextToken", nextToken)
    
    const response = await fetchWithRetry(
      fullUrl.toString(),
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      { maxAttempts: 3, initialDelay: 1000 },
    )
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const json = await response.json()
    if (json.records?.length) results.push(...json.records)
    nextToken = json.next_token || null
  } while (nextToken)
  
  return results
}

/* -----------------------------------------
   USER PROFILE (read:profile)
   ⚠️ NOVO!
----------------------------------------- */
export async function fetchUserProfile(userId: string) {
  const accessToken = await ensureValidToken(userId)
  const url = `${WHOOP_BASE}/user/profile/basic`
  
  console.log("[🔍 API] Fetching user profile:", url)
  
  const response = await fetchWithRetry(
    url,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { maxAttempts: 3, initialDelay: 1000 },
  )
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/* -----------------------------------------
   BODY MEASUREMENTS (read:body_measurement)
   ⚠️ NOVO!
----------------------------------------- */
export async function fetchBodyMeasurements(userId: string) {
  const accessToken = await ensureValidToken(userId)
  const url = `${WHOOP_BASE}/user/measurement/body`
  
  console.log("[🔍 API] Fetching body measurements:", url)
  
  const response = await fetchWithRetry(
    url,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    { maxAttempts: 3, initialDelay: 1000 },
  )
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  
  return response.json()
}

/* -----------------------------------------
   CYCLES (Strain diário)
----------------------------------------- */
export async function fetchCycles(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const accessToken = await ensureValidToken(userId)
  const baseUrl = `${WHOOP_BASE}/cycle`
  const url = `${baseUrl}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
  
  console.log("[🔍 API] Fetching cycles v2:", url)
  return fetchPaginated(url, accessToken)
}

/* -----------------------------------------
   RECOVERY (Recovery score, HRV, RHR)
----------------------------------------- */
export async function fetchRecovery(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const accessToken = await ensureValidToken(userId)
  const baseUrl = `${WHOOP_BASE}/recovery`
  const url = `${baseUrl}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
  
  console.log("[🔍 API] Fetching recovery v2:", url)
  return fetchPaginated(url, accessToken)
}

/* -----------------------------------------
   SLEEP
----------------------------------------- */
export async function fetchSleep(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const accessToken = await ensureValidToken(userId)
  const baseUrl = `${WHOOP_BASE}/activity/sleep`
  const url = `${baseUrl}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
  
  console.log("[🔍 API] Fetching sleep v2:", url)
  return fetchPaginated(url, accessToken)
}

/* -----------------------------------------
   WORKOUTS
----------------------------------------- */
export async function fetchWorkouts(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  const accessToken = await ensureValidToken(userId)
  const baseUrl = `${WHOOP_BASE}/activity/workout`
  const url = `${baseUrl}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
  
  console.log("[🔍 API] Fetching workouts v2:", url)
  const rawWorkouts = await fetchPaginated(url, accessToken)
  
  const transformedWorkouts = rawWorkouts.map((workout) => ({
    ...workout,
    user_id: String(workout.user_id || userId),
    source: workout.source || "whoop",
  }))
  
  console.log("[🔍 API] Transformed", transformedWorkouts.length, "workouts with metadata")
  return transformedWorkouts
}

/* -----------------------------------------
   FETCH ALL DATA
   ⚠️ ATUALIZADO: Agora com profile e body measurements
----------------------------------------- */
export async function fetchAllData(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  console.log("[🔍 API] fetchAllData (v2)", {
    userId,
    startDate,
    endDate,
  })
  
  try {
    // Fetch metrics data (time-based)
    const [cycles, recovery, sleep, workouts] = await Promise.all([
      fetchCycles(userId, startDate, endDate),
      fetchRecovery(userId, startDate, endDate),
      fetchSleep(userId, startDate, endDate),
      fetchWorkouts(userId, startDate, endDate),
    ])
    
    // Fetch profile data (not time-based) - only on first sync or periodically
    let profile = null
    let bodyMeasurements = null
    
    try {
      profile = await fetchUserProfile(userId)
      console.log("[✅ API] Profile fetched successfully")
    } catch (error) {
      console.warn("[⚠️ API] Failed to fetch profile (may not have permission):", error)
    }
    
    try {
      bodyMeasurements = await fetchBodyMeasurements(userId)
      console.log("[✅ API] Body measurements fetched successfully")
    } catch (error) {
      console.warn("[⚠️ API] Failed to fetch body measurements (may not have permission):", error)
    }
    
    console.log("[✅ API] v2 fetched successfully", {
      cycles: cycles.length,
      recovery: recovery.length,
      sleep: sleep.length,
      workouts: workouts.length,
      hasProfile: !!profile,
      hasBodyMeasurements: !!bodyMeasurements,
    })
    
    return { 
      cycles, 
      recovery, 
      sleep, 
      workouts,
      profile,  // ← NOVO!
      bodyMeasurements,  // ← NOVO!
    }
  } catch (error) {
    console.error("[❌ API] v2 fetchAllData failed:", error)
    throw error
  }
}
