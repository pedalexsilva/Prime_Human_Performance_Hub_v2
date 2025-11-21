import React from 'react';
import { ArrowUp, ArrowDown, LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    sub?: string;
    sublabel?: string;
    icon: LucideIcon;
    status: 'optimal' | 'good' | 'moderate' | 'low' | 'poor' | 'warning' | 'critical';
    trend?: string;
    onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, sub, sublabel, icon: Icon, status, trend, onClick }) => {
    const textColor =
        status === 'optimal' ? 'text-emerald-400' :
            status === 'good' ? 'text-emerald-400' :
                status === 'moderate' ? 'text-yellow-400' :
                    status === 'warning' ? 'text-orange-400' :
                        'text-red-400';

    return (
        <div
            className={`bg-slate-900/50 border border-slate-800 p-5 rounded-xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-emerald-900/10 ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${textColor}`}>
                <Icon size={64} />
            </div>
            <div className="flex justify-between items-start mb-2">
                <div className={`p-2 rounded-lg bg-slate-800/80 ${textColor}`}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <span className={`text-xs font-mono flex items-center bg-slate-800 px-2 py-1 rounded ${textColor}`}>
                        {trend.includes('+') ? <ArrowUp size={12} className="mr-1" /> : <ArrowDown size={12} className="mr-1" />}
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</h3>
            <div className="mt-1">
                <span className="text-2xl font-bold text-white">{value}</span>
                <span className="ml-1 text-xs text-slate-500">{sublabel}</span>
            </div>
            {sub && <div className="mt-2 text-xs text-slate-400 border-t border-slate-800/50 pt-2">{sub}</div>}
        </div>
    );
};
