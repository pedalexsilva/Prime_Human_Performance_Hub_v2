import React from 'react';
import { X, Brain, Heart, Moon, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardMetrics } from '@/lib/queries/athlete-dashboard';

interface RecoveryDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    dashboardData: DashboardMetrics | null;
}

export const RecoveryDetailModal = ({ isOpen, onClose, dashboardData }: RecoveryDetailModalProps) => {
    if (!isOpen) return null;

    const recoveryScore = dashboardData?.recovery_score;
    const hrvValue = dashboardData?.hrv_rmssd;
    const restingHR = dashboardData?.resting_heart_rate;
    const sleepDuration = dashboardData?.sleep_duration_minutes;
    const recoveryTrend = dashboardData?.recovery_trend;

    // Determine recovery status
    const getRecoveryStatus = (score: number | null | undefined) => {
        if (!score) return { label: 'Sem Dados', color: 'text-slate-400', bgColor: 'bg-slate-800/50', recommendation: 'Conecte seu dispositivo para ver dados' };
        if (score >= 67) return {
            label: 'Excelente',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/20',
            recommendation: 'Você está pronto para treino intenso. Aproveite!'
        };
        if (score >= 34) return {
            label: 'Moderado',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/20',
            recommendation: 'Considere treino moderado ou trabalho técnico.'
        };
        return {
            label: 'Baixo',
            color: 'text-red-400',
            bgColor: 'bg-red-500/20',
            recommendation: 'Priorize descanso e recuperação ativa.'
        };
    };

    const status = getRecoveryStatus(recoveryScore);

    const formatSleep = (minutes: number | null | undefined) => {
        if (!minutes) return '--';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Brain size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">Prontidão</h2>
                            <p className="text-xs text-slate-400">Score de recuperação e preparação</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Main Recovery Score */}
                    <div className={`p-6 rounded-xl border ${status.bgColor} border-slate-700/50`}>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Brain size={20} className={status.color} />
                                <span className="text-sm font-medium text-slate-400 uppercase">Recovery Score</span>
                            </div>
                            <div className={`text-5xl font-bold ${status.color} mb-2`}>
                                {recoveryScore ? `${Math.round(recoveryScore)}%` : '--'}
                            </div>
                            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${status.bgColor} ${status.color}`}>
                                {status.label}
                            </div>
                        </div>
                    </div>

                    {/* Contributing Factors */}
                    <div>
                        <h3 className="text-sm font-bold text-white mb-3">Fatores Contribuintes</h3>
                        <div className="space-y-3">
                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Heart size={20} className="text-rose-400" />
                                    <div>
                                        <p className="text-sm font-medium text-white">VFC (HRV)</p>
                                        <p className="text-xs text-slate-400">Variabilidade cardíaca</p>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-white">
                                    {hrvValue ? `${Math.round(hrvValue)}ms` : '--'}
                                </span>
                            </div>

                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Moon size={20} className="text-indigo-400" />
                                    <div>
                                        <p className="text-sm font-medium text-white">Sono</p>
                                        <p className="text-xs text-slate-400">Duração total</p>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-white">
                                    {formatSleep(sleepDuration)}
                                </span>
                            </div>

                            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Activity size={20} className="text-red-400" />
                                    <div>
                                        <p className="text-sm font-medium text-white">FC Repouso</p>
                                        <p className="text-xs text-slate-400">Frequência cardíaca</p>
                                    </div>
                                </div>
                                <span className="text-lg font-bold text-white">
                                    {restingHR ? `${Math.round(restingHR)} bpm` : '--'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Trend */}
                    {recoveryTrend !== null && recoveryTrend !== undefined && (
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {recoveryTrend > 0 ? (
                                        <TrendingUp size={20} className="text-emerald-400" />
                                    ) : (
                                        <TrendingDown size={20} className="text-red-400" />
                                    )}
                                    <span className="text-sm font-medium text-slate-400">Tendência (7 dias)</span>
                                </div>
                                <span className={`text-xl font-bold ${recoveryTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {recoveryTrend > 0 ? '+' : ''}{recoveryTrend.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Recommendation */}
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Recomendação</p>
                        <p className="text-sm text-white leading-relaxed">
                            {status.recommendation}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
