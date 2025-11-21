import React from 'react';
import { X, Heart, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardMetrics } from '@/lib/queries/athlete-dashboard';

interface HRVDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    dashboardData: DashboardMetrics | null;
}

export const HRVDetailModal = ({ isOpen, onClose, dashboardData }: HRVDetailModalProps) => {
    if (!isOpen) return null;

    const hrvValue = dashboardData?.hrv_rmssd;
    const restingHR = dashboardData?.resting_heart_rate;
    const hrvTrend = dashboardData?.hrv_trend;
    const recoveryScore = dashboardData?.recovery_score;

    // Determine HRV status
    const getHRVStatus = (hrv: number | null | undefined) => {
        if (!hrv) return { label: 'Sem Dados', color: 'text-slate-400', bgColor: 'bg-slate-800/50' };
        if (hrv >= 60) return { label: 'Excelente', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
        if (hrv >= 40) return { label: 'Bom', color: 'text-green-400', bgColor: 'bg-green-500/20' };
        if (hrv >= 20) return { label: 'Moderado', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
        return { label: 'Baixo', color: 'text-red-400', bgColor: 'bg-red-500/20' };
    };

    const status = getHRVStatus(hrvValue);

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
                        <div className="p-2 bg-rose-500/20 rounded-lg">
                            <Heart size={20} className="text-rose-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">VFC (Variabilidade)</h2>
                            <p className="text-xs text-slate-400">Indicador de stress e recuperação</p>
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
                    {/* Main HRV Value */}
                    <div className={`p-6 rounded-xl border ${status.bgColor} border-slate-700/50`}>
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Activity size={20} className={status.color} />
                                <span className="text-sm font-medium text-slate-400 uppercase">HRV RMSSD</span>
                            </div>
                            <div className={`text-5xl font-bold ${status.color} mb-2`}>
                                {hrvValue ? `${Math.round(hrvValue)}ms` : '--'}
                            </div>
                            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${status.bgColor} ${status.color}`}>
                                {status.label}
                            </div>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Heart size={16} className="text-red-400" />
                                <span className="text-xs font-medium text-slate-400 uppercase">FC Repouso</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {restingHR ? `${Math.round(restingHR)} bpm` : '--'}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                                {hrvTrend && hrvTrend > 0 ? (
                                    <TrendingUp size={16} className="text-emerald-400" />
                                ) : (
                                    <TrendingDown size={16} className="text-red-400" />
                                )}
                                <span className="text-xs font-medium text-slate-400 uppercase">Tendência 7d</span>
                            </div>
                            <div className={`text-2xl font-bold ${hrvTrend && hrvTrend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {hrvTrend ? `${hrvTrend > 0 ? '+' : ''}${hrvTrend.toFixed(1)}%` : '--'}
                            </div>
                        </div>
                    </div>

                    {/* Recovery Correlation */}
                    {recoveryScore && (
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Correlação com Recuperação</p>
                                    <p className="text-sm text-white font-medium">Score de Prontidão: {Math.round(recoveryScore)}%</p>
                                </div>
                                <Activity size={24} className="text-indigo-400" />
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="font-bold text-white">VFC (HRV)</span> mede a variação entre batimentos cardíacos.
                            Valores mais altos indicam melhor recuperação e menor stress. Monitore a tendência para otimizar treino e descanso.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
