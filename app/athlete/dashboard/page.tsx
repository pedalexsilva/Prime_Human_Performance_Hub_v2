"use client"

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Moon,
  Battery,
  Zap,
  Menu,
  Settings,
  User,
  Brain,
  Utensils,
  FlaskConical,
  BookOpen,
  BarChart3,
  Trophy,
  MessageSquare,
  RefreshCw,
  HeartPulse,
  ChevronUp,
  ChevronDown,
  PlusCircle,
  Wifi,
  LogOut,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area
} from 'recharts';

import { UserAvatar } from '@/components/doctor/user-avatar';
import { createBrowserClient } from '@/lib/supabase/client';
import { calculatePrimeState, getHRVStatus, getSleepStatus, formatSleepDuration, formatTrend, getInsightMessage } from '@/lib/utils/dashboard-status';
import type { DashboardMetrics } from '@/lib/queries/athlete-dashboard';
import { SetupModal } from '@/components/dashboard/settings-modal';
import { SleepDetailModal } from '@/components/dashboard/sleep-detail-modal';
import { HRVDetailModal } from '@/components/dashboard/hrv-detail-modal';
import { GlucoseDetailModal } from '@/components/dashboard/glucose-detail-modal';
import { RecoveryDetailModal } from '@/components/dashboard/recovery-detail-modal';

// --- Components ---

const CircularProgress = ({ value, label, subLabel }: { value: number; label: string; subLabel?: string }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="transform -rotate-90 w-full h-full drop-shadow-[0_0_10px_rgba(20,184,166,0.3)]">
        <circle
          className="text-slate-800"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50%"
          cy="50%"
        />
        <circle
          className="text-teal-400 transition-all duration-1000 ease-out"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50%"
          cy="50%"
        />
      </svg>
      <div className="absolute flex flex-col items-center text-white">
        <span className="text-4xl font-bold font-mono">{value}</span>
        <span className="text-xs text-slate-400 mt-1 tracking-widest uppercase">{label}</span>
      </div>
    </div>
  );
};

type StatusLevel = 'good' | 'optimal' | 'moderate' | 'pending' | string;

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  status: StatusLevel | string;
  trend?: number | null;
  color?: string;
  onClick?: () => void;
}

const MetricCard = ({ icon, label, value, subValue, status, trend, color = "teal", onClick }: MetricCardProps) => (
  <div
    onClick={onClick}
    className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-teal-500/30 transition-all duration-300 group cursor-pointer relative overflow-hidden"
  >
    <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-${color}-500/10 transition-colors`}></div>

    <div className="flex justify-between items-start mb-2 relative z-10">
      <div className={`p-2 rounded-lg bg-slate-900/50 border border-slate-800 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-900/40 text-emerald-400' : 'bg-rose-900/40 text-rose-400'}`}>
          {trend > 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {Math.round(Math.abs(trend))}%
        </div>
      )}
    </div>

    <div className="relative z-10">
      <h3 className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">{label}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {subValue && <span className="text-xs text-slate-500 font-mono">{subValue}</span>}
      </div>
      {status && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'pending' ? 'bg-amber-500' : status === 'optimal' || status === 'good' || status === 'Eficiente' ? 'bg-teal-500' : 'bg-rose-500'} animate-pulse`}></div>
          <span className="text-xs text-slate-400 font-medium capitalize">{status}</span>
        </div>
      )}
    </div>
  </div>
);

const NavButton = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 px-1 rounded-xl transition-all duration-200 ${active ? 'text-teal-400 bg-teal-950/30' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[9px] font-bold tracking-wider uppercase">{label}</span>
  </button>
);

const DoctorInsight = ({ title, subtitle, message }: { title: string; subtitle: string; message: string }) => (
  <div className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg h-full flex flex-col justify-center group hover:border-teal-900/30 transition-all duration-300">
    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-teal-500/10 transition-colors duration-500"></div>
    <div className="flex items-start gap-5 relative z-10">
      <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20 shrink-0">
        <Activity className="text-teal-400" size={24} />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-col">
          <h4 className="text-teal-500 text-[10px] font-bold uppercase tracking-widest">{title}</h4>
          <span className="text-white text-lg font-bold tracking-tight">{subtitle}</span>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed font-medium border-l-2 border-slate-800 pl-3 italic">
          "{message}"
        </p>
      </div>
    </div>
  </div>
);

export default function ApexDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [scrolled, setScrolled] = useState(false);

  // Settings Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Detail Modal States
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);
  const [isHRVModalOpen, setIsHRVModalOpen] = useState(false);
  const [isGlucoseModalOpen, setIsGlucoseModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);



  const supabase = createBrowserClient();
  const router = useRouter();
  const { t, language } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  // Load dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      if (!profile) return;

      setDataLoading(true);
      try {
        const response = await fetch('/api/athlete/dashboard');
        const result = await response.json();
        if (result.success) {
          setDashboardData(result.data);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    }
    loadDashboardData();
  }, [profile]);

  const handleSync = async () => {
    if (syncing || !profile) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/sync/force', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id })
      });
      const result = await response.json();
      if (result.success) {
        alert('Sincronização concluída com sucesso!');
        // Reload data
        const dataResponse = await fetch('/api/athlete/dashboard');
        const dataResult = await dataResponse.json();
        if (dataResult.success) {
          setDashboardData(dataResult.data);
        }
      } else {
        alert('Erro na sincronização: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Erro ao sincronizar. Tente novamente.');
    } finally {
      setSyncing(false);
    }
  };

  // Calculate status from real data
  const primeState = dashboardData?.recovery_score
    ? calculatePrimeState(dashboardData.recovery_score)
    : calculatePrimeState(null);

  const insight = {
    title: t("athlete.dashboard.doctorInsight.title"),
    text: primeState.status === 'optimal'
      ? t("athlete.dashboard.doctorInsight.optimalMessage")
      : primeState.status === 'good'
        ? t("athlete.dashboard.doctorInsight.goodMessage")
        : t("athlete.dashboard.doctorInsight.moderateMessage")
  };

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
          <p className="mt-4 text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-200 font-sans selection:bg-teal-500/30 pb-32">

      {/* Header */}
      <header className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-[#0B0F17]/90 backdrop-blur-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile && (
                <div className="w-16 h-16 rounded-full shadow-lg shadow-black/50">
                  <UserAvatar
                    avatarUrl={profile.avatar_url}
                    fullName={profile.full_name}
                    userId={profile.id}
                    size="lg"
                    editable={false}
                    className="!w-full !h-full"
                  />
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-teal-500 border-4 border-[#0B0F17] rounded-full"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{profile?.full_name || 'Athlete'}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-400 font-medium">
                  {new Date().toLocaleDateString(language === 'pt' ? 'pt-PT' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-1.5 text-[10px] font-bold bg-slate-800/80 px-2.5 py-1 rounded-full text-teal-400 border border-teal-900/30 hover:bg-slate-800 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <RefreshCw size={10} className={syncing ? "animate-spin" : ""} /> {syncing ? t("athlete.dashboard.connection.syncing") : 'SYNC'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <Settings size={20} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
              title={t("userMenu.logout")}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pb-32">

        {/* Top Section: Prime State & Insight */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

          {/* Prime State Card */}
          <div className="col-span-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px] md:min-h-[250px]">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-teal-500/20 rounded-full blur-[50px] pointer-events-none"></div>

            <div className="w-full flex justify-between items-center mb-4 px-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-teal-500">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                Status Atual
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                {dashboardData?.connected_services?.some(s => s === 'whoop') ? 'WHOOP: ON' : 'DEVICES: OFF'}
              </span>
            </div>

            <div className="flex flex-row items-center gap-4 md:gap-6 scale-90 md:scale-100 transition-transform">
              <CircularProgress value={primeState.score} label="PRIME" />
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl md:text-3xl font-bold text-white leading-none">PRIME<br />STATE</h2>
                <p className="text-xs text-slate-400 max-w-[100px]">{primeState.status}</p>
              </div>
            </div>
          </div>
          {/* Doctor Insight */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 flex flex-col justify-center">
            <DoctorInsight
              title={t("athlete.dashboard.doctorInsight.title")}
              subtitle={t("athlete.dashboard.doctorInsight.capacity")}
              message={insight.text || t("athlete.dashboard.doctorInsight.defaultMessage")}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            icon={<HeartPulse size={20} className="text-teal-400" />}
            label={t("athlete.dashboard.metrics.hrv")}
            value={`${Math.round(dashboardData?.hrv_rmssd || 0)}${t("athlete.dashboard.metrics.ms")}`}
            subValue={`${Math.round(dashboardData?.resting_heart_rate || 0)} ${t("athlete.dashboard.metrics.bpm")}`}
            trend={dashboardData?.hrv_trend}
            color="teal"
            status={getHRVStatus(dashboardData?.hrv_rmssd || null)}
            onClick={() => setIsHRVModalOpen(true)}
          />
          <MetricCard
            icon={<Moon size={20} className="text-indigo-400" />}
            label={t("athlete.dashboard.metrics.sleep")}
            value={formatSleepDuration(dashboardData?.sleep_duration_minutes || null)}
            subValue=""
            status={getSleepStatus(dashboardData?.sleep_duration_minutes || null)}
            trend={dashboardData?.sleep_trend}
            color="indigo"
            onClick={() => setIsSleepModalOpen(true)}
          />
          <MetricCard
            icon={<Battery size={20} className="text-amber-400" />}
            label={t("athlete.dashboard.metrics.glucose")}
            value={t("athlete.dashboard.metrics.noData")}
            subValue="--"
            status="pending"
            color="amber"
            onClick={() => setIsGlucoseModalOpen(true)}
          />
          <MetricCard
            icon={<Brain size={20} className="text-sky-400" />}
            label={t("athlete.dashboard.metrics.readiness")}
            value={dashboardData?.recovery_score ? `${Math.round(dashboardData.recovery_score)}%` : t("athlete.dashboard.metrics.noData")}
            subValue={t("athlete.dashboard.metrics.cognitive")}
            trend={dashboardData?.recovery_trend}
            color="sky"
            status={dashboardData?.recovery_score && dashboardData.recovery_score >= 67 ? 'optimal' : dashboardData?.recovery_score && dashboardData.recovery_score >= 34 ? 'good' : 'moderate'}
            onClick={() => setIsRecoveryModalOpen(true)}
          />
        </div>

        {/*        {/* Chart Section */}
        <div className="bg-[#0B0F17] rounded-2xl p-6 border border-slate-800/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-teal-500" />
              <h3 className="text-white font-bold">{t("athlete.dashboard.chart.title")}</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-700"></div>
                <span className="text-slate-400">{t("athlete.dashboard.chart.stress")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]"></div>
                <span className="text-teal-400">{t("athlete.dashboard.chart.performance")}</span>
              </div>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {dashboardData?.chartData ? (
                <ComposedChart data={dashboardData.chartData}>
                  <defs>
                    <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '8px' }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="performance"
                    stroke="#14B8A6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPerformance)"
                  />
                  <Line
                    type="monotone"
                    dataKey="stress"
                    stroke="#475569"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  {t("athlete.dashboard.trends.noRecentData")}
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </main>

      {/* Floating Dock Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-[#0B0F17]/90 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-2 shadow-2xl shadow-black/50 flex items-center gap-1">
          <NavButton icon={Activity} label={t("athlete.dashboard.nav.dashboard")} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavButton icon={PlusCircle} label={t("athlete.dashboard.nav.inputs")} active={activeTab === 'inputs'} onClick={() => setActiveTab('inputs')} />
          <NavButton icon={Utensils} label={t("athlete.dashboard.nav.fuel")} active={activeTab === 'fuel'} onClick={() => setActiveTab('fuel')} />
          <NavButton icon={FlaskConical} label={t("athlete.dashboard.nav.lab")} active={activeTab === 'lab'} onClick={() => setActiveTab('lab')} />
          <NavButton icon={Brain} label={t("athlete.dashboard.nav.mind")} active={activeTab === 'mind'} onClick={() => setActiveTab('mind')} />
          <NavButton icon={FileText} label={t("athlete.dashboard.nav.protocols")} active={activeTab === 'protocols'} onClick={() => setActiveTab('protocols')} />
          <NavButton icon={TrendingUp} label={t("athlete.dashboard.nav.trends")} active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} />
          <NavButton icon={Trophy} label={t("athlete.dashboard.nav.rank")} active={activeTab === 'rank'} onClick={() => setActiveTab('rank')} />
          <NavButton icon={MessageSquare} label={t("athlete.dashboard.nav.chat")} active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
        </div>
      </div>


      {/* Modals */}
      <SetupModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        connectedServices={dashboardData?.connected_services || []}
        userId={profile?.id || ''}
      />

      <SleepDetailModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        sleepData={dashboardData?.latestSleepMetrics}
      />

      <HRVDetailModal
        isOpen={isHRVModalOpen}
        onClose={() => setIsHRVModalOpen(false)}
        dashboardData={dashboardData}
      />

      <GlucoseDetailModal
        isOpen={isGlucoseModalOpen}
        onClose={() => setIsGlucoseModalOpen(false)}
      />

      <RecoveryDetailModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        dashboardData={dashboardData}
      />

    </div >
  );
}

