"use client"

import { useEffect, useState } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"
import { UserMenu } from "@/components/ui/user-menu"
import { UserAvatar } from "@/components/doctor/user-avatar"
import { AthleteCard } from "@/components/doctor/athlete-card"
import { useTranslation } from "@/lib/i18n/use-translation"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Activity, Users, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface AthleteWithData {
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

export default function DoctorDashboardPage() {
  const { t, language } = useTranslation()
  const locale = language || 'pt'
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [athleteData, setAthleteData] = useState<AthleteWithData[]>([])
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    atRisk: 0,
  })

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

  useEffect(() => {
    async function loadData() {
      // 1) Authentication
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        redirect("/auth/login")
        return
      }

      // 2) Get profile and role
      const { data: profileData, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_url")
        .eq("id", user.id)
        .single()

      if (pErr || !profileData) {
        setProfile({ error: true })
        setLoading(false)
        return
      }

      if (profileData.role !== "doctor") {
        redirect("/athlete/dashboard")
        return
      }

      setProfile(profileData)

      // 3) Fetch athletes and metrics
      const { data: athletes } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, date_of_birth, role")
        .eq("role", "athlete")
        .order("full_name", { ascending: true })

      if (athletes && athletes.length > 0) {
        const athletesWithData: AthleteWithData[] = []
        let connectedCount = 0
        let atRiskCount = 0

        for (const a of athletes) {
          // Get connection info
          const { data: conn } = await supabase
            .from("device_connections")
            .select("is_active, last_sync_at")
            .eq("user_id", a.id)
            .eq("platform", "whoop")
            .maybeSingle()

          // Get latest daily summary for Recovery + HRV
          const { data: dailySummary } = await supabase
            .from("daily_summaries")
            .select("avg_recovery_score, avg_hrv_rmssd, summary_date")
            .eq("user_id", a.id)
            .order("summary_date", { ascending: false })
            .limit(1)
            .maybeSingle()

          // Get latest sleep data from sleep_metrics table
          const { data: sleepData } = await supabase
            .from("sleep_metrics")
            .select("sleep_duration_minutes")
            .eq("user_id", a.id)
            .order("metric_date", { ascending: false })
            .limit(1)
            .maybeSingle()

          // Merge data
          const summary = dailySummary ? {
            avg_recovery_score: dailySummary.avg_recovery_score,
            avg_hrv_rmssd: dailySummary.avg_hrv_rmssd,
            total_sleep_minutes: sleepData?.sleep_duration_minutes || null,
            summary_date: dailySummary.summary_date
          } : null

          if (conn?.is_active) connectedCount++
          if (summary?.avg_recovery_score && summary.avg_recovery_score < 34) atRiskCount++

          athletesWithData.push({
            ...a,
            connection: conn,
            summary
          })
        }

        setAthleteData(athletesWithData)
        setStats({
          total: athletes.length,
          connected: connectedCount,
          atRisk: atRiskCount,
        })
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

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

  if (profile?.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-2">
              {t("doctor.dashboard.profile.notFound") || "Perfil não encontrado"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("doctor.dashboard.profile.unavailable") || "Seu perfil não está disponível"}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Traduções dinâmicas
  const titleText = locale === 'pt' || locale === 'pt-PT' ? 'Painel do Médico' : 'Practitioner Dashboard'
  const subtitleText = locale === 'pt' || locale === 'pt-PT'
    ? 'Monitore a sua lista de atletas e pacientes.'
    : 'Monitor your roster of athletes and patients.'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header with Date */}
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
                {titleText}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(locale)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {subtitleText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/doctor/dashboard/sync-monitoring">
              <Button variant="outline" size="sm" className="gap-2">
                <Activity className="h-4 w-4" />
                Sync Monitoring
              </Button>
            </Link>
            <UserMenu userName={profile?.full_name || "Doctor"} userRole="doctor" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'pt' || locale === 'pt-PT' ? 'Total de Atletas' : 'Total Athletes'}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="rounded-full bg-blue-500/15 p-3">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'pt' || locale === 'pt-PT' ? 'Conectados' : 'Connected'}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stats.connected}</p>
                </div>
                <div className="rounded-full bg-emerald-500/15 p-3">
                  <Activity className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'pt' || locale === 'pt-PT' ? 'Em Risco' : 'At Risk'}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stats.atRisk}</p>
                </div>
                <div className="rounded-full bg-red-500/15 p-3">
                  <TrendingUp className="h-6 w-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Athletes Grid */}
        {!athleteData || athleteData.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-sm text-muted-foreground">
                {locale === 'pt' || locale === 'pt-PT' ? 'Nenhum atleta cadastrado ainda' : 'No athletes registered yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {athleteData.map((athlete) => (
              <AthleteCard
                key={athlete.id}
                athlete={athlete}
                locale={locale as 'pt' | 'en'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
