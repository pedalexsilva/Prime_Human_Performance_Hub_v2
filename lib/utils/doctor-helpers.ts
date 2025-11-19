// lib/utils/doctor-helpers.ts
// Helper functions para o Doctor Dashboard

/**
 * Calcula idade a partir da data de nascimento
 */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
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

/**
 * Formata tempo relativo (ex: "Today", "Yesterday", "3 days ago")
 */
export function formatRelativeTime(dateString: string | null | undefined, locale: 'pt' | 'en' = 'pt'): string {
  if (!dateString) return locale === 'pt' ? 'Nunca' : 'Never'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return locale === 'pt' ? 'Hoje' : 'Today'
  } else if (diffDays === 1) {
    return locale === 'pt' ? 'Ontem' : 'Yesterday'
  } else if (diffDays < 7) {
    return locale === 'pt' ? `Há ${diffDays} dias` : `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return locale === 'pt' ? `Há ${weeks} semana${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString(locale === 'pt' ? 'pt-PT' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
}

/**
 * Determina o status do atleta baseado no Recovery Score
 */
export interface AthleteStatus {
  status: 'stable' | 'monitor' | 'at-risk' | 'no-data'
  label: {
    pt: string
    en: string
  }
  color: string
  bgColor: string
  icon: string
}

export function getAthleteStatus(recoveryScore: number | null | undefined): AthleteStatus {
  if (recoveryScore === null || recoveryScore === undefined) {
    return {
      status: 'no-data',
      label: { pt: 'Sem Dados', en: 'No Data' },
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/15',
      icon: '⚪'
    }
  }
  
  if (recoveryScore >= 67) {
    return {
      status: 'stable',
      label: { pt: 'Estável', en: 'Stable' },
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      icon: '🟢'
    }
  }
  
  if (recoveryScore >= 34) {
    return {
      status: 'monitor',
      label: { pt: 'Monitorar', en: 'Monitor' },
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
      icon: '🟡'
    }
  }
  
  return {
    status: 'at-risk',
    label: { pt: 'Em Risco', en: 'At Risk' },
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    icon: '🔴'
  }
}

/**
 * Formata duração de sono
 */
export function formatSleepDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-'
  
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  
  return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`
}
