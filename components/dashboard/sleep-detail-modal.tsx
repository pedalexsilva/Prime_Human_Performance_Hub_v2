import React from 'react';
import { X, Moon, Activity, Clock, Wind, AlertCircle } from 'lucide-react';
import { SleepMetrics } from '@/lib/queries/athlete-dashboard';

interface SleepDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    sleepData: SleepMetrics | null | undefined;
}

export const SleepDetailModal = ({ isOpen, onClose, sleepData }: SleepDetailModalProps) => {
    if (!isOpen) return null;

    if (!sleepData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center">
                    <h3 className="text-white font-bold mb-2">Sem dados de sono detalhados</h3>
                    <p className="text-slate-400 text-sm mb-4">Não foi possível carregar os detalhes do sono para esta noite.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Fechar</button>
                </div>
            </div>
        );
    }

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return '--';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    };

    // Calculate percentages for the bar
    const total = sleepData.sleep_duration_minutes || 1;
    const remPct = ((sleepData.sleep_stage_rem_minutes || 0) / total) * 100;
    const deepPct = ((sleepData.sleep_stage_deep_minutes || 0) / total) * 100;
    const lightPct = ((sleepData.sleep_stage_light_minutes || 0) / total) * 100;
    const awakePct = ((sleepData.sleep_stage_awake_minutes || 0) / total) * 100;

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
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <Moon size={20} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">Detalhes do Sono</h2>
                            <p className="text-xs text-slate-400">Análise da última noite</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock size={16} className="text-slate-400" />
                                <span className="text-xs font-medium text-slate-400 uppercase">Duração Total</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {formatDuration(sleepData.sleep_duration_minutes)}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity size={16} className="text-emerald-400" />
                                <span className="text-xs font-medium text-slate-400 uppercase">Eficiência</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {sleepData.sleep_efficiency_percentage ? `${sleepData.sleep_efficiency_percentage}%` : '--'}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Wind size={16} className="text-sky-400" />
                                <span className="text-xs font-medium text-slate-400 uppercase">Freq. Respiratória</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {sleepData.respiratory_rate ? `${sleepData.respiratory_rate} rpm` : '--'}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={16} className="text-amber-400" />
                                <span className="text-xs font-medium text-slate-400 uppercase">Perturbações</span>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                {sleepData.disturbances_count ?? '--'}
                            </div>
                        </div>
                    </div>

                    {/* Sleep Stages */}
                    <div>
                        <h3 className="text-sm font-bold text-white mb-4">Estágios do Sono</h3>

                        {/* Visual Bar */}
                        <div className="h-4 w-full flex rounded-full overflow-hidden mb-4">
                            <div style={{ width: `${awakePct}%` }} className="bg-rose-500/80" title="Acordado" />
                            <div style={{ width: `${remPct}%` }} className="bg-indigo-400" title="REM" />
                            <div style={{ width: `${lightPct}%` }} className="bg-slate-400" title="Leve" />
                            <div style={{ width: `${deepPct}%` }} className="bg-indigo-600" title="Profundo" />
                        </div>

                        {/* Legend / Details */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                    <span className="text-slate-300">Acordado</span>
                                </div>
                                <span className="font-mono text-slate-400">{formatDuration(sleepData.sleep_stage_awake_minutes)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-400" />
                                    <span className="text-slate-300">REM</span>
                                </div>
                                <span className="font-mono text-slate-400">{formatDuration(sleepData.sleep_stage_rem_minutes)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                                    <span className="text-slate-300">Leve</span>
                                </div>
                                <span className="font-mono text-slate-400">{formatDuration(sleepData.sleep_stage_light_minutes)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-indigo-600" />
                                    <span className="text-slate-300">Profundo</span>
                                </div>
                                <span className="font-mono text-slate-400">{formatDuration(sleepData.sleep_stage_deep_minutes)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
