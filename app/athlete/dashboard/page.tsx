"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { useTranslation } from "@/lib/i18n/use-translation"
import { UserAvatar } from "@/components/athlete/user-avatar"
import { MetricCard } from "@/components/athlete/metric-card"
import { 
  getRecoveryMessage, 
  getHRVMessage, 
  getSleepMessage,
  formatSleepDuration 
} from "@/lib/utils/metric-messages"
import { Activity, Heart, Moon, RefreshCw } from "lucide-react"

// Lazy load heavy components
import dynamic from "next/dynamic"

const RecoveryChart = dynamic(() => import("@/components/athlete/recovery-chart").then(mod => ({ default: mod.RecoveryChart })), {
  loading: () => <Card><CardContent className="pt-6"><p>Carregando gráfico...</p></CardContent></Card>,
  ssr: false
})

const ConnectionCard = dynamic(() => import("@/components/athlete/connection-card").then(mod => ({ default: mod.ConnectionCard })), {
  loading: () => <Card><CardContent className="pt-6"><p>Carregando...</p></CardContent></Card>,
  ssr: false
})

const UserMenu = dynamic(() => import("@/components/ui/user-menu").then(mod => ({ default: mod.UserMenu })), {
  ssr: false
})

const SyncButton = dynamic(() => import("@/components/athlete/sync-button").then(mod => ({ default: mod.SyncButton })), {
  ssr: false
})

export default function AthleteDashboardPage() {
  const router = useRouter()
  const supabase = createBrowserClient()
  
  // Safe translation with fallback
  let t: any
  let locale: string = 'pt'
  let translationError = false
  
  try {
    const translation = useTranslation()
    t = translation.t
    locale = translation.language || 'pt'
  } catch (error) {
    console.error("Translation error:", error)
    translationError = true
    // Fallback translations
    t = (key: string) => {
      const fallbacks: Record<string, string> = {
        "common.loading": "Carregando...",
        "athlete.dashboard.title": "Painel do Atleta",
        "athlete.dashboard.welcome": "Bem-vindo",
        "athlete.dashboard.welcomeBack": "Bem-vindo de volta",
        "athlete.dashboard.profile.notFound": "Perfil não encontrado",
        "athlete.dashboard.profile.unavailable": "Seu perfil não está disponível",
        "athlete.dashboard.metrics.recovery": "Recuperação",
        "athlete.dashboard.metrics.hrv": "HRV",
        "athlete.dashboard.metrics.sleep": "Sono",
        "athlete.dashboard.metrics.rmssd": "RMSSD",
        "athlete.dashboard.metrics.noData": "Sem dados",
        "athlete.dashboard.metrics.hours": "h",
        "athlete.dashboard.metrics.minutes": "m",
        "athlete.dashboard.trends.title": "Tendências",
        "athlete.dashboard.trends.noRecentData": "Sem dados recentes",
        "athlete.dashboard.trends.connectPrompt": "Conecte o Whoop para ver tendências",
        "athlete.dashboard.trends.syncing": "Sincronizando...",
        "athlete.dashboard.connection.syncingData": "Sincronizando dados do WHOOP...",
        "athlete.dashboard.lastSync": "Última sincronização",
        "athlete.dashboard.justNow": "agora mesmo",
        "athlete.dashboard.minutesAgo": "há {minutes} min",
        "athlete.dashboard.hoursAgo": "há {hours}h",
        "athlete.dashboard.daysAgo": "há {days}d",
      }
      return fallbacks[key] || key
    }
  }

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [connection, setConnection] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>({
    latestSummary: null,
    latestRecovery: null,
    latestSleep: null,
    chartData: [],
  })
  const [syncingInitial, setSyncingInitial] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Format date in Portuguese or English
  const formatDate = (locale: string = 'pt'): string => {
    const date = new Date()
    
    if (locale === 'pt' || locale === 'pt-PT') {
      // Portuguese format: Segunda-feira, 18 de Novembro de 2025
      return date.toLocaleDateString('pt-PT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } else {
      // English format: Tuesday, November 18, 2025
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  // Format relative time
  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return t("athlete.dashboard.metrics.noData")
    
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return t("athlete.dashboard.justNow")
    if (diffMins < 60) return t("athlete.dashboard.minutesAgo").replace("{minutes}", diffMins.toString())
    if (diffHours < 24) return t("athlete.dashboard.hoursAgo").replace("{hours}", diffHours.toString())
    return t("athlete.dashboard.daysAgo").replace("{days}", diffDays.toString())
  }

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        // 1) Authentication
        let user
        try {
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
          
          if (authError) {
            console.error("Auth error:", authError)
            if (mounted) {
              router.push("/auth/login")
            }
            return
          }
          
          user = authUser
          
          if (!user) {
            if (mounted) {
              router.push("/auth/login")
            }
            return
          }
        } catch (err) {
          console.error("Error getting user:", err)
          if (mounted) {
            setError("Erro ao verificar autenticação")
            router.push("/auth/login")
          }
          return
        }

        // 2) Get profile and role
        try {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("role, full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle()

          if (profileError) {
            console.error("Profile error:", profileError)
            if (mounted) {
              setProfile({ error: true })
              setLoading(false)
            }
            return
          }

          if (!profileData) {
            if (mounted) {
              setProfile({ error: true })
              setLoading(false)
            }
            return
          }

          if (profileData.role !== "athlete") {
            if (mounted) {
              router.push("/doctor/dashboard")
            }
            return
          }

          if (mounted) {
            setProfile({ ...profileData, id: user.id })
          }
        } catch (err) {
          console.error("Error loading profile:", err)
          if (mounted) {
            setProfile({ error: true })
            setLoading(false)
          }
          return
        }

        // 3) Check Whoop connection
        try {
          const { data: connectionData, error: connectionError } = await supabase
            .from("device_connections")
            .select("is_active, last_sync_at, initial_sync_completed, created_at, updated_at")
            .eq("user_id", user.id)
            .eq("platform", "whoop")
            .maybeSingle()

          if (connectionError) {
            console.error("Connection check error:", connectionError)
          }

          const isConnected = connectionData?.is_active === true
          
          if (mounted) {
            setConnection({ 
              ...connectionData, 
              isConnected,
              hasInitialSync: connectionData?.initial_sync_completed === true
            })
          }

          // 4) Check if this is a fresh connection
          const params = new URLSearchParams(window.location.search)
          const justConnected = params.get("success") === "whoop_connected"
          
          // Trigger initial sync automatically after OAuth connection
          if (justConnected && isConnected && !connectionData?.initial_sync_completed && mounted) {
            console.log("[Dashboard] Fresh WHOOP connection - triggering sync")
            setSyncingInitial(true)
            
            try {
              const response = await fetch('/api/sync/whoop/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
                credentials: 'include',
              })

              if (response.ok) {
                console.log("[Dashboard] Sync triggered successfully")
                setTimeout(() => {
                  if (mounted) {
                    window.history.replaceState({}, "", window.location.pathname)
                    window.location.reload()
                  }
                }, 3000)
              } else {
                console.error("[Dashboard] Sync failed:", await response.text())
              }
            } catch (error) {
              console.error("[Dashboard] Error triggering sync:", error)
            } finally {
              if (mounted) {
                setSyncingInitial(false)
              }
            }
          }

          // 5) Get latest metrics only if connected
          if (isConnected) {
            try {
              const [latestSummary, latestRecovery, latestSleep, chartData] = await Promise.all([
                supabase
                  .from("daily_summaries")
                  .select("*")
                  .eq("user_id", user.id)
                  .order("summary_date", { ascending: false })
                  .limit(1)
                  .maybeSingle()
                  .then(res => res.data),
                supabase
                  .from("recovery_metrics")
                  .select("recovery_score, hrv_rmssd, metric_date")
                  .eq("user_id", user.id)
                  .order("metric_date", { ascending: false })
                  .limit(1)
                  .maybeSingle()
                  .then(res => res.data),
                supabase
                  .from("sleep_metrics")
                  .select("sleep_duration_minutes, metric_date")
                  .eq("user_id", user.id)
                  .order("metric_date", { ascending: false })
                  .limit(1)
                  .maybeSingle()
                  .then(res => res.data),
                supabase
                  .from("daily_summaries")
                  .select("summary_date, avg_recovery_score, total_strain, total_sleep_minutes")
                  .eq("user_id", user.id)
                  .order("summary_date", { ascending: false })
                  .limit(7)
                  .then(res => res.data || [])
              ])

              if (mounted) {
                setMetrics({ latestSummary, latestRecovery, latestSleep, chartData })
              }
            } catch (err) {
              console.error("Error loading metrics:", err)
            }
          }
        } catch (err) {
          console.error("Error in connection/metrics section:", err)
        }

        if (mounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error("Unexpected error in loadData:", err)
        if (mounted) {
          setError("Erro inesperado ao carregar dados")
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [router, supabase])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Profile error state
  if (profile?.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t("athlete.dashboard.profile.notFound")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t("athlete.dashboard.profile.unavailable")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate metrics
  const recoveryScore = metrics.latestRecovery?.recovery_score
  // Convert HRV from seconds to milliseconds (Whoop API returns seconds)
  const hrvValue = metrics.latestRecovery?.hrv_rmssd && metrics.latestRecovery.hrv_rmssd > 0 
    ? metrics.latestRecovery.hrv_rmssd * 1000  // Convert to milliseconds
    : null
  const sleepMinutes = metrics.latestSleep?.sleep_duration_minutes
  const sleepHours = sleepMinutes ? sleepMinutes / 60 : null

  // Get first name only
  const firstName = profile?.full_name?.split(' ')[0] || profile?.full_name || 'Atleta'

  // Main dashboard
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header with Avatar and Welcome Message */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              fullName={profile?.full_name}
              userId={profile?.id}
              size="lg"
              editable={true}
            />
            <div>
              <h1 className="text-3xl font-bold">
                {t("athlete.dashboard.welcomeBack")}, {firstName}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(locale)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <RefreshCw className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {t("athlete.dashboard.lastSync")}: {formatRelativeTime(connection?.last_sync_at)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connection?.isConnected && <SyncButton />}
            <UserMenu userName={profile?.full_name || "Athlete"} userRole="athlete" />
          </div>
        </div>

        {/* Initial Sync Message */}
        {syncingInitial && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-medium">
                  {t("athlete.dashboard.connection.syncingData")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Whoop Connection */}
        <div className="mb-8">
          <ConnectionCard isConnected={connection?.isConnected} lastSync={connection?.last_sync_at} />
        </div>

        {/* Metrics Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <MetricCard
            title={t("athlete.dashboard.metrics.recovery")}
            value={recoveryScore ? `${recoveryScore}%` : t("athlete.dashboard.metrics.noData")}
            subtitle={metrics.latestRecovery?.metric_date || undefined}
            message={getRecoveryMessage(recoveryScore)}
            icon={<Activity className="h-5 w-5" />}
          />

          <MetricCard
            title={t("athlete.dashboard.metrics.hrv")}
            value={hrvValue && hrvValue > 0 ? `${Math.round(hrvValue)} ms` : t("athlete.dashboard.metrics.noData")}
            subtitle={t("athlete.dashboard.metrics.rmssd")}
            message={getHRVMessage(hrvValue)}
            icon={<Heart className="h-5 w-5" />}
          />

          <MetricCard
            title={t("athlete.dashboard.metrics.sleep")}
            value={formatSleepDuration(sleepMinutes)}
            subtitle={metrics.latestSleep?.metric_date || undefined}
            message={getSleepMessage(sleepHours)}
            icon={<Moon className="h-5 w-5" />}
          />
        </div>

        {/* Trends Chart */}
        {metrics.chartData && metrics.chartData.length > 0 ? (
          <RecoveryChart data={metrics.chartData} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{t("athlete.dashboard.trends.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {connection?.isConnected
                  ? syncingInitial 
                    ? t("athlete.dashboard.trends.syncing")
                    : t("athlete.dashboard.trends.noRecentData")
                  : t("athlete.dashboard.trends.connectPrompt")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
