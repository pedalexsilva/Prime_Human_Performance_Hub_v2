import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputButtonProps {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    active: boolean;
}

export const InputButton: React.FC<InputButtonProps> = ({ icon: Icon, label, onClick, active }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${active ? 'bg-slate-800 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'}`}
    >
        <Icon size={24} className="mb-2" />
        <span className="text-xs font-medium">{label}</span>
    </button>
);
