"use client"

import { UserAvatar } from "@/components/athlete/user-avatar"
import { calculateAge, formatRelativeTime, getAthleteStatus, formatSleepDuration } from "@/lib/utils/doctor-helpers"
import { Activity, Moon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface AthleteCardProps {
  athlete: {
    id: string
    full_name: string | null
    email: string
    avatar_url?: string | null
    date_of_birth?: string | null
    connection?: {
      is_active: boolean
      last_sync_at?: string | null
    } | null
    summary?: {
      avg_recovery_score: number | null
      avg_hrv_rmssd: number | null
      total_sleep_minutes: number | null
      summary_date: string
    } | null
  }
  locale?: 'pt' | 'en'
  onClick?: (athleteId: string) => void
}

export function AthleteCard({ athlete, locale = 'pt', onClick }: AthleteCardProps) {
  const age = calculateAge(athlete.date_of_birth)
  const lastCheckIn = formatRelativeTime(athlete.connection?.last_sync_at, locale)
  const recoveryScore = athlete.summary?.avg_recovery_score
  const status = getAthleteStatus(recoveryScore)
  
  // Convert HRV from seconds to milliseconds (same as athlete dashboard)
  const hrvValue = athlete.summary?.avg_hrv_rmssd && athlete.summary.avg_hrv_rmssd > 0
    ? Math.round(athlete.summary.avg_hrv_rmssd * 1000)
    : null
  
  const sleepDuration = formatSleepDuration(athlete.summary?.total_sleep_minutes)

  const content = (
    <div className={cn(
      "group rounded-2xl bg-card p-5 text-card-foreground shadow transition-all",
      "hover:shadow-lg hover:scale-[1.02]",
      onClick ? "cursor-pointer" : "cursor-default"
    )}>
      {/* Header with Avatar and Status */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar
            avatarUrl={athlete.avatar_url}
            fullName={athlete.full_name}
            userId={athlete.id}
            size="md"
            editable={false}
          />
          <div>
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
              {athlete.full_name || 'Atleta'}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {age && (
                <>
                  <span>{locale === 'pt' ? 'Idade' : 'Age'}: {age}</span>
                  <span>•</span>
                </>
              )}
              <span>
                {locale === 'pt' ? 'Última sincronização' : 'Last check-in'}: {lastCheckIn}
              </span>
            </div>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className={cn(
          "rounded-full px-3 py-1 text-xs font-medium flex items-center gap-1",
          status.bgColor,
          status.color
        )}>
          <span>{status.icon}</span>
          <span>{status.label[locale]}</span>
        </div>
      </div>

      {/* Metrics */}
      {athlete.summary ? (
        <div className="grid grid-cols-2 gap-3">
          {/* HRV */}
          <div className="rounded-lg bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">HRV</p>
            </div>
            <p className="text-xl font-semibold">
              {hrvValue ? `${hrvValue}ms` : '-'}
            </p>
          </div>

          {/* Sleep */}
          <div className="rounded-lg bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {locale === 'pt' ? 'Sono' : 'Sleep'}
              </p>
            </div>
            <p className="text-xl font-semibold">
              {sleepDuration}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-muted/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {locale === 'pt' ? 'Sem dados disponíveis' : 'No data available'}
          </p>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {athlete.email}
        </span>
        <div className={cn(
          "flex items-center gap-1",
          athlete.connection?.is_active ? 'text-emerald-400' : 'text-amber-400'
        )}>
          <div className={cn(
            "h-2 w-2 rounded-full",
            athlete.connection?.is_active ? 'bg-emerald-400' : 'bg-amber-400'
          )} />
          <span>
            {athlete.connection?.is_active 
              ? (locale === 'pt' ? 'Conectado' : 'Connected')
              : (locale === 'pt' ? 'Desconectado' : 'Disconnected')
            }
          </span>
        </div>
      </div>
    </div>
  )

  // If onClick is provided, make it clickable without Link
  if (onClick) {
    return <div onClick={() => onClick(athlete.id)}>{content}</div>
  }

  // Otherwise wrap in Link
  return (
    <Link href={`/doctor/athletes/${athlete.id}`}>
      {content}
    </Link>
  )
}
