import React from 'react';
import { X, Zap } from 'lucide-react';
import { Protocol } from './ProtocolCard';

interface ProtocolDetailModalProps {
    protocol: Protocol;
    onClose: () => void;
}

export const ProtocolDetailModal: React.FC<ProtocolDetailModalProps> = ({ protocol, onClose }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className={`p-6 border-b border-slate-800 flex justify-between items-start ${protocol.color.replace('text-', 'bg-').replace('400', '900/20')}`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-950 ${protocol.color}`}>
                        <protocol.icon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">{protocol.title}</h3>
                        <span className="text-xs uppercase tracking-wider text-slate-400">{protocol.type} Protocol</span>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="p-6 space-y-6">
                <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Plano de Ação</h4>
                    <div className="space-y-4">
                        {protocol.steps.map((step, i) => (
                            <div key={i} className="flex gap-4 items-start">
                                <div className="flex flex-col items-center pt-1">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    {i !== protocol.steps.length - 1 && <div className="w-0.5 h-full bg-slate-800 mt-1"></div>}
                                </div>
                                <div>
                                    <span className="text-xs font-mono text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded">{step.time}</span>
                                    <p className="text-sm font-bold text-slate-200 mt-1">{step.action}</p>
                                    <p className="text-xs text-slate-500">{step.obs}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Zap size={16} /> Ativar Protocolo Agora
                </button>
            </div>
        </div>
    </div>
);
