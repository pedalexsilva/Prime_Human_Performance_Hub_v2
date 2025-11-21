"use client"

import { useEffect, useState } from "react"
import { redirect } from "next/navigation"
import {
  Users, Activity, AlertTriangle, Search, Filter, ChevronRight,
  Heart, Moon, MessageSquare, MoreHorizontal, Shield, Radio
} from 'lucide-react'

export const dynamic = "force-dynamic"
import { createBrowserClient } from "@/lib/supabase/client"
import { UserAvatar } from "@/components/doctor/user-avatar"

interface AthleteWithData {
  id: string
  full_name: string | null
  email: string
  avatar_url?: string | null
  role?: string
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
  history?: number[]
  alert?: string | null
}

type StatusType = 'CRITICAL' | 'WARNING' | 'PEAK' | 'OPTIMAL' | 'RECOVERY'

const STATUS_COLORS = {
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  WARNING: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  PEAK: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  OPTIMAL: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  RECOVERY: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
}

const getAthleteStatus = (score: number | null): StatusType => {
  if (!score) return 'RECOVERY'
  if (score < 34) return 'CRITICAL'
  if (score < 67) return 'WARNING'
  if (score < 90) return 'OPTIMAL'
  return 'PEAK'
}

const getAthleteAlert = (athlete: AthleteWithData): string | null => {
  const hrv = athlete.summary?.avg_hrv_rmssd
  const score = athlete.summary?.avg_recovery_score

  if (score && score < 34) return 'Risco de Burnout'
  if (hrv && hrv < 30) return 'HRV Crítico'
  return null
}

const StatusBadge = ({ status }: { status: StatusType }) => {
  const styles = STATUS_COLORS[status]
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wider ${styles.bg} ${styles.text} ${styles.border}`}>
      {status}
    </span>
  )
}

const formatSleepDuration = (minutes: number | null): string => {
  if (!minutes) return 'No Data'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export default function DoctorDashboardPage() {
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [athleteData, setAthleteData] = useState<AthleteWithData[]>([])
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteWithData | null>(null)
  const [filter, setFilter] = useState<StatusType | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const stats = {
    total: athleteData.length,
    critical: athleteData.filter(a => getAthleteStatus(a.summary?.avg_recovery_score || null) === 'CRITICAL').length,
    warning: athleteData.filter(a => getAthleteStatus(a.summary?.avg_recovery_score || null) === 'WARNING').length,
    optimal: athleteData.filter(a => {
      const status = getAthleteStatus(a.summary?.avg_recovery_score || null)
      return status === 'OPTIMAL' || status === 'PEAK'
    }).length,
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        redirect("/auth/login")
        return
      }

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

      const { data: athletes } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role")
        .eq("role", "athlete")
        .order("full_name", { ascending: true })

      if (athletes && athletes.length > 0) {
        const athletesWithData: AthleteWithData[] = []

        for (const a of athletes) {
          const { data: conn } = await supabase
            .from("device_connections")
            .select("is_active, last_sync_at")
            .eq("user_id", a.id)
            .eq("platform", "whoop")
            .maybeSingle()

          const { data: dailySummary } = await supabase
            .from("daily_summaries")
            .select("avg_recovery_score, avg_hrv_rmssd, summary_date")
            .eq("user_id", a.id)
            .order("summary_date", { ascending: false })
            .limit(1)
            .maybeSingle()

          const { data: sleepData } = await supabase
            .from("sleep_metrics")
            .select("sleep_duration_minutes")
            .eq("user_id", a.id)
            .order("metric_date", { ascending: false })
            .limit(1)
            .maybeSingle()

          // Get history for sparkline (last 7 days)
          const { data: historyData } = await supabase
            .from("daily_summaries")
            .select("avg_recovery_score")
            .eq("user_id", a.id)
            .order("summary_date", { ascending: false })
            .limit(7)

          const history = historyData?.map(h => h.avg_recovery_score || 0).reverse() || []

          const summary = dailySummary ? {
            avg_recovery_score: dailySummary.avg_recovery_score,
            avg_hrv_rmssd: dailySummary.avg_hrv_rmssd,
            total_sleep_minutes: sleepData?.sleep_duration_minutes || null,
            summary_date: dailySummary.summary_date
          } : null

          const athleteWithData: AthleteWithData = {
            ...a,
            connection: conn,
            summary,
            history,
            alert: null
          }

          athleteWithData.alert = getAthleteAlert(athleteWithData)
          athletesWithData.push(athleteWithData)
        }

        setAthleteData(athletesWithData)
        if (athletesWithData.length > 0) {
          setSelectedAthlete(athletesWithData[0])
        }
      }

      setLoading(false)
    }

    loadData()
  }, [supabase])

  const filteredAthletes = athleteData.filter(athlete => {
    const status = getAthleteStatus(athlete.summary?.avg_recovery_score || null)
    const matchesFilter = filter === 'ALL' || status === filter
    const matchesSearch = !searchQuery ||
      athlete.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      athlete.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (profile?.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-center text-slate-400">
          <p>Profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 flex overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/50 mb-4">
          <Activity className="text-white" size={24} />
        </div>
        <div className="flex flex-col gap-4 w-full">
          <button className="p-3 rounded-lg mx-auto transition-all bg-slate-800 text-emerald-400">
            <Users size={20} />
          </button>
          <button className="p-3 rounded-lg mx-auto transition-all text-slate-500 hover:text-white hover:bg-slate-800">
            <Radio size={20} />
          </button>
        </div>
        <div className="mt-auto">
          <UserAvatar
            avatarUrl={profile?.avatar_url}
            fullName={profile?.full_name}
            userId={profile?.id}
            size="sm"
            editable={false}
          />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-[#0a0a0a]">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-[#0a0a0a]/95 backdrop-blur">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity size={18} className="text-emerald-500" /> Triagem
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Procurar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-sm text-slate-300 focus:border-emerald-500 focus:outline-none w-64 transition-all"
              />
            </div>
            <button className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
              <Filter size={18} />
            </button>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-px bg-slate-800 border-b border-slate-800">
          <div className={`bg-[#0a0a0a] p-4 cursor-pointer ${filter === 'ALL' ? 'bg-slate-900' : ''}`} onClick={() => setFilter('ALL')}>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Carteira</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div className={`bg-[#0a0a0a] p-4 cursor-pointer relative overflow-hidden ${filter === 'CRITICAL' ? 'bg-slate-900' : ''}`} onClick={() => setFilter('CRITICAL')}>
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
            <div className="text-xs text-red-400 uppercase tracking-wider mb-1 font-bold flex items-center gap-2">
              <AlertTriangle size={12} /> Críticos
            </div>
            <div className="text-2xl font-bold text-white">{stats.critical}</div>
          </div>
          <div className={`bg-[#0a0a0a] p-4 cursor-pointer ${filter === 'WARNING' ? 'bg-slate-900' : ''}`} onClick={() => setFilter('WARNING')}>
            <div className="text-xs text-yellow-400 uppercase tracking-wider mb-1 font-bold">Atenção</div>
            <div className="text-2xl font-bold text-white">{stats.warning}</div>
          </div>
          <div className={`bg-[#0a0a0a] p-4 cursor-pointer ${filter === 'OPTIMAL' || filter === 'PEAK' ? 'bg-slate-900' : ''}`} onClick={() => setFilter('OPTIMAL')}>
            <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1 font-bold">Otimizados</div>
            <div className="text-2xl font-bold text-white">{stats.optimal}</div>
          </div>
        </div>

        {/* Athletes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredAthletes.map(athlete => {
            const status = getAthleteStatus(athlete.summary?.avg_recovery_score || null)
            const score = athlete.summary?.avg_recovery_score || 0
            const isSelected = selectedAthlete?.id === athlete.id

            return (
              <div
                key={athlete.id}
                onClick={() => setSelectedAthlete(athlete)}
                className={`group flex items-center p-4 rounded-xl border cursor-pointer transition-all ${isSelected
                  ? 'bg-slate-800/60 border-slate-600'
                  : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
                  }`}
              >
                <div className="mr-4">
                  <UserAvatar
                    avatarUrl={athlete.avatar_url}
                    fullName={athlete.full_name}
                    userId={athlete.id}
                    size="sm"
                    editable={false}
                  />
                </div>
                <div className="w-40">
                  <div className="font-bold text-white text-sm">{athlete.full_name || 'Unknown'}</div>
                  <div className="text-xs text-slate-500">{athlete.role || 'Athlete'}</div>
                </div>
                <div className="w-24">
                  <StatusBadge status={status} />
                </div>
                <div className="flex-1 px-4">
                  {athlete.alert ? (
                    <div className="flex items-center gap-2 text-xs text-red-300 bg-red-900/10 px-3 py-1.5 rounded border border-red-500/20">
                      <AlertTriangle size={12} /> {athlete.alert}
                    </div>
                  ) : (
                    <div className="h-8 w-full opacity-30 grayscale group-hover:grayscale-0 transition-all">
                      <div className="flex gap-1 h-full items-end">
                        {athlete.history?.map((val, i) => (
                          <div key={i} className="w-1 bg-emerald-500" style={{ height: `${val}%` }}></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-24 text-right">
                  <div className="text-xs text-slate-500 mb-1">Score</div>
                  <div className={`text-xl font-bold font-mono ${score < 50 ? 'text-red-500' : score < 80 ? 'text-yellow-400' : 'text-emerald-400'
                    }`}>
                    {Math.round(score)}
                  </div>
                </div>
                <div className="w-8 flex justify-end text-slate-600 group-hover:text-white">
                  <ChevronRight size={18} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT PANEL - Athlete Details */}
      {selectedAthlete && (
        <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto">
          {/* Athlete Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <UserAvatar
                avatarUrl={selectedAthlete.avatar_url}
                fullName={selectedAthlete.full_name}
                userId={selectedAthlete.id}
                size="xl"
                editable={false}
              />
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors border border-transparent hover:border-slate-700">
                  <MessageSquare size={18} />
                </button>
                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{selectedAthlete.full_name}</h2>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${selectedAthlete.connection?.is_active ? 'bg-green-500' : 'bg-slate-500'}`}></span>
              {selectedAthlete.connection?.is_active ? 'Online agora' : 'Offline'}
            </p>
          </div>

          {/* Metrics */}
          <div className="p-6 space-y-6 border-b border-slate-800">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                  <Heart size={14} /> HRV (ms)
                </div>
                <div className="text-2xl font-bold text-white flex items-end gap-2">
                  {selectedAthlete.summary?.avg_hrv_rmssd ? Math.round(selectedAthlete.summary.avg_hrv_rmssd) : 'N/A'}
                </div>
              </div>
              <div className="bg-black/40 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                  <Moon size={14} /> Sono
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatSleepDuration(selectedAthlete.summary?.total_sleep_minutes || null)}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 flex-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              Protocolos Ativos
            </h3>
            <div className="space-y-3">
              {getAthleteStatus(selectedAthlete.summary?.avg_recovery_score || null) === 'CRITICAL' && (
                <button className="w-full p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all animate-pulse">
                  <Shield size={16} /> Ativar Protocolo de Resgate
                </button>
              )}
              <button className="w-full p-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition-all">
                <Radio size={18} /> Monitorização Ao Vivo
              </button>
              <div className="pt-4 mt-4 border-t border-slate-800">
                <label className="text-xs text-slate-500 mb-2 block">Nota Clínica Rápida</label>
                <textarea
                  className="w-full bg-black/40 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 h-24 focus:border-emerald-500 outline-none resize-none"
                  placeholder="Escreva uma observação..."
                ></textarea>
                <button className="mt-2 text-xs bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-500">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
