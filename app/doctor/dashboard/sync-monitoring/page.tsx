"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export const dynamic = "force-dynamic"
import { createBrowserClient } from "@/lib/supabase/client"
import { UserMenu } from "@/components/ui/user-menu"
import { SyncKPICards } from "@/components/sync-monitoring/sync-kpi-cards"
import { AthleteStatusTable } from "@/components/sync-monitoring/athlete-status-table"
import { SyncTrendChart } from "@/components/sync-monitoring/sync-trend-chart"
import { ErrorLogsTable } from "@/components/sync-monitoring/error-logs-table"
import { Button } from "@/components/ui/button"
import { RefreshCw, ArrowLeft } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface SyncStats {
  successRate: number
  totalSyncs: number
  avgDuration: number
  byPlatform: Record<string, number>
  recentErrors: any[]
}

interface AthleteStatus {
  id: string
  fullName: string
  email: string
  lastSyncAt: string | null
  syncStatus: "success" | "failed" | "never"
  cyclesCount: number
  sleepCount: number
  workoutsCount: number
  platform: string
}

interface TrendData {
  date: string
  success: number
  failed: number
}

export default function SyncMonitoringPage() {
  const supabase = createBrowserClient()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<SyncStats | null>(null)
  const [athletes, setAthletes] = useState<AthleteStatus[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Get profile and verify role
      const { data: profileData, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single()

      if (pErr || !profileData || profileData.role !== "doctor") {
        router.push("/athlete/dashboard")
        return
      }

      setProfile(profileData)

      const [statsRes, athletesRes, trendsRes] = await Promise.all([
        fetch("/api/sync/stats?period=7"),
        fetch("/api/sync/athletes"),
        fetch("/api/sync/trends?days=30"),
      ])

      const [statsData, athletesData, trendsData] = await Promise.all([
        statsRes.json(),
        athletesRes.json(),
        trendsRes.json(),
      ])

      if (statsData.success) {
        setStats(statsData.stats)
      }

      if (athletesData.success) {
        setAthletes(athletesData.athletes)
      }

      if (trendsData.success) {
        setTrendData(trendsData.trendData)
      }

      setLoading(false)
    } catch (error) {
      console.error("[v0] Error loading sync monitoring data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de monitorização",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadData()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const handleForceSync = async (userId: string) => {
    try {
      const res = await fetch("/api/sync/force", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: "Sincronização iniciada",
          description: "Os dados estão sendo sincronizados...",
        })
        // Reload data after a delay
        setTimeout(() => loadData(), 3000)
      } else {
        const errorMessage = data.data?.error || data.error || "Não foi possível iniciar a sincronização"

        toast({
          title: data.needsReconnection ? "Reconexão necessária" : "Erro na sincronização",
          description: errorMessage,
          variant: "destructive",
        })

        setTimeout(() => loadData(), 1000)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao forçar sincronização",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Carregando monitorização...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/doctor/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Monitorização de Sincronização</h1>
              <p className="text-sm text-muted-foreground">Dashboard completo do sistema Whoop</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => loadData()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              Auto-refresh: {autoRefresh ? "ON" : "OFF"}
            </Button>
            <UserMenu userName={profile?.full_name || "Doctor"} userRole="doctor" />
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="mb-6">
            <SyncKPICards
              successRate={stats.successRate}
              totalSyncs={stats.totalSyncs}
              avgDuration={stats.avgDuration}
              loading={loading}
            />
          </div>
        )}

        {/* Platform Distribution */}
        {stats && Object.keys(stats.byPlatform).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Distribuição por Plataforma</CardTitle>
              <CardDescription>Total de sincronizações nos últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {Object.entries(stats.byPlatform).map(([platform, count]) => (
                  <div key={platform} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-chart-1" />
                    <span className="text-sm">
                      {platform}: <span className="font-semibold">{count}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="athletes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="athletes">Atletas</TabsTrigger>
            <TabsTrigger value="trends">Tendências</TabsTrigger>
            <TabsTrigger value="errors">Erros</TabsTrigger>
          </TabsList>

          <TabsContent value="athletes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Status dos Atletas</CardTitle>
                <CardDescription>Últimos 30 dias de dados sincronizados</CardDescription>
              </CardHeader>
              <CardContent>
                <AthleteStatusTable athletes={athletes} onForceSync={handleForceSync} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <SyncTrendChart data={trendData} loading={loading} />
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Erros Recentes</CardTitle>
                <CardDescription>Últimos 10 erros de sincronização</CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorLogsTable errors={stats?.recentErrors || []} loading={loading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
