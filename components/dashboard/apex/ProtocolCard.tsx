import React from 'react';
import { ArrowUp, LucideIcon } from 'lucide-react';

export interface Protocol {
    id: number;
    title: string;
    duration: string;
    type: string;
    icon: LucideIcon;
    color: string;
    border: string;
    steps: { time: string; action: string; obs: string }[];
}

interface ProtocolCardProps {
    protocol: Protocol;
    onClick: (protocol: Protocol) => void;
}

export const ProtocolCard: React.FC<ProtocolCardProps> = ({ protocol, onClick }) => (
    <div
        onClick={() => onClick(protocol)}
        className={`bg-slate-900/50 border ${protocol.border} p-4 rounded-xl hover:bg-slate-800/80 transition-all cursor-pointer group relative overflow-hidden`}
    >
        <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-lg bg-slate-950 ${protocol.color} group-hover:scale-110 transition-transform`}>
                <protocol.icon size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-1 rounded">
                {protocol.duration}
            </span>
        </div>
        <h4 className="text-white font-bold mb-1">{protocol.title}</h4>
        <p className="text-xs text-slate-500 uppercase tracking-wide">{protocol.type} Protocol</p>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Ver Detalhes</span> <ArrowUp className="rotate-45" size={12} />
        </div>
    </div>
);
