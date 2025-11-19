"use client"

import { UserAvatar } from "@/components/athlete/user-avatar"
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
  locale: 'pt' | 'en'
  onClick?: (athleteId: string) => void
}

// Helper: Calculate age
function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Helper: Format relative time
function formatRelativeTime(dateString: string | null | undefined, locale: 'pt' | 'en'): string {
  if (!dateString) return locale === 'pt' ? 'Nunca' : 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return locale === 'pt' ? 'Hoje' : 'Today'
  if (diffDays === 1) return locale === 'pt' ? 'Ontem' : 'Yesterday'
  if (diffDays < 7) return locale === 'pt' ? `Há ${diffDays} dias` : `${diffDays} days ago`
  
  return date.toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// Helper: Get athlete status
function getAthleteStatus(recoveryScore: number | null | undefined, locale: 'pt' | 'en') {
  if (recoveryScore === null || recoveryScore === undefined) {
    return {
      label: locale === 'pt' ? 'Sem Dados' : 'No Data',
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/15',
      icon: '⚪'
    }
  }
  if (recoveryScore >= 67) {
    return {
      label: locale === 'pt' ? 'Estável' : 'Stable',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      icon: '🟢'
    }
  }
  if (recoveryScore >= 34) {
    return {
      label: locale === 'pt' ? 'Monitorar' : 'Monitor',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      icon: '🟡'
    }
  }
  return {
    label: locale === 'pt' ? 'Em Risco' : 'At Risk',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    icon: '🔴'
  }
}

// Helper: Format sleep duration
function formatSleepDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
}

export function AthleteCard({ athlete, locale, onClick }: AthleteCardProps) {
  const age = calculateAge(athlete.date_of_birth)
  const lastCheckIn = formatRelativeTime(athlete.connection?.last_sync_at, locale)
  const recoveryScore = athlete.summary?.avg_recovery_score
  const status = getAthleteStatus(recoveryScore, locale)
  
  // Convert HRV from seconds to milliseconds
  const hrvValue = athlete.summary?.avg_hrv_rmssd && athlete.summary.avg_hrv_rmssd > 0
    ? Math.round(athlete.summary.avg_hrv_rmssd * 1000)
    : null
  
  const sleepDuration = formatSleepDuration(athlete.summary?.total_sleep_minutes)

  const content = (
    <div className={cn(
      "group rounded-2xl bg-card p-5 text-card-foreground shadow transition-all",
      "hover:shadow-lg hover:scale-[1.02]",
      onClick ? "cursor-pointer" : ""
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
                {locale === 'pt' ? 'Última sync' : 'Last check-in'}: {lastCheckIn}
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
          <span>{status.label}</span>
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
        <span className="text-muted-foreground truncate">
          {athlete.email}
        </span>
        <div className={cn(
          "flex items-center gap-1 flex-shrink-0",
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

  // If onClick is provided, make it clickable
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
