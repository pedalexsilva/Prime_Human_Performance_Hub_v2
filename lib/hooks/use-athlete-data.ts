"use client"

import { useMemo } from "react"
import type { AthleteMetric } from "../types/athlete-metrics"
import type { Alert } from "../alerts"
import { getAthleteData, getAllAthletesData, getAthleteSummary, MOCK_ATHLETES } from "../mock-data"
import { detectAlerts } from "../alerts"

/**
 * Hook to fetch athlete data (memoized)
 * TODO: Replace with SWR + API call in Phase 3
 */
export function useAthleteData(athleteId: number) {
  const data = useMemo(() => {
    return getAthleteData(athleteId)
  }, [athleteId])

  return {
    data,
    loading: false,
    error: null,
  }
}

/**
 * Hook to fetch summary statistics for an athlete
 */
export function useAthleteSummary(athleteId: number, days = 7) {
  const { data } = useAthleteData(athleteId)

  const summary = useMemo(() => {
    if (!data || data.length === 0) return null
    return getAthleteSummary(athleteId, days)
  }, [athleteId, days, data])

  return summary
}

/**
 * Hook to fetch all athletes data
 */
export function useAllAthletes() {
  const data = useMemo(() => {
    return MOCK_ATHLETES
  }, [])

  return {
    data,
    loading: false,
    error: null,
  }
}

/**
 * Hook to fetch all athletes metrics
 */
export function useAllAthletesMetrics() {
  const data = useMemo(() => {
    return getAllAthletesData()
  }, [])

  return {
    data,
    loading: false,
    error: null,
  }
}

/**
 * Hook to detect alerts for an athlete
 */
export function useAthleteAlerts(athleteId: number): Alert[] {
  const { data } = useAthleteData(athleteId)

  const alerts = useMemo(() => {
    if (!data || data.length === 0) return []
    return detectAlerts(data)
  }, [data])

  return alerts
}

/**
 * Hook to get latest metric for an athlete
 */
export function useLatestMetric(athleteId: number): AthleteMetric | null {
  const { data } = useAthleteData(athleteId)

  return useMemo(() => {
    if (!data || data.length === 0) return null
    return data[data.length - 1]
  }, [data])
}
