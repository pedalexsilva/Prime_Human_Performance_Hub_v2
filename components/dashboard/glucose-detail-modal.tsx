import React from 'react';
import { X, Battery, Calendar, TrendingUp } from 'lucide-react';

interface GlucoseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GlucoseDetailModal = ({ isOpen, onClose }: GlucoseDetailModalProps) => {
    if (!isOpen) return null;

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
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <Battery size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-wide">Glicose</h2>
                            <p className="text-xs text-slate-400">Monitoramento contínuo de glicose</p>
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
                    {/* Coming Soon Message */}
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-4">
                            <Battery size={40} className="text-amber-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Em Breve Disponível</h3>
                        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                            A integração com monitores contínuos de glicose (CGM) está em desenvolvimento.
                            Em breve você poderá acompanhar seus níveis de glicose em tempo real.
                        </p>
                    </div>

                    {/* Preview Features */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Funcionalidades Futuras</p>

                        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl flex items-start gap-3">
                            <TrendingUp size={20} className="text-emerald-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-white">Monitoramento em Tempo Real</p>
                                <p className="text-xs text-slate-400 mt-1">Acompanhe seus níveis de glicose 24/7</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl flex items-start gap-3">
                            <Calendar size={20} className="text-sky-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-white">Análise de Tendências</p>
                                <p className="text-xs text-slate-400 mt-1">Identifique padrões e otimize sua nutrição</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl flex items-start gap-3">
                            <Battery size={20} className="text-amber-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-white">Alertas Personalizados</p>
                                <p className="text-xs text-slate-400 mt-1">Receba notificações de hiper/hipoglicemia</p>
                            </div>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="font-bold text-white">Integração CGM</span> permitirá correlacionar
                            glicose com treino, sono e recuperação para otimização completa da performance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
