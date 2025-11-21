import React from 'react';

interface ScheduleItemProps {
    item: {
        time: string;
        event: string;
        type: string;
        detail: string;
    };
}

export const ScheduleItem: React.FC<ScheduleItemProps> = ({ item }) => {
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'biohack': return 'bg-purple-500';
            case 'work': return 'bg-emerald-500';
            case 'work_light': return 'bg-yellow-500';
            case 'exercise': return 'bg-orange-500';
            case 'recovery': return 'bg-blue-500';
            case 'nutrition': return 'bg-green-500';
            case 'sleep': return 'bg-indigo-500';
            default: return 'bg-slate-500';
        }
    };

    return (
        <div className="flex group">
            <div className="flex flex-col items-center mr-4">
                <div className={`w-3 h-3 rounded-full border-2 border-slate-900 ${getTypeColor(item.type)} z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>
                <div className="w-0.5 h-full bg-slate-800 group-last:bg-transparent"></div>
            </div>
            <div className="pb-6 w-full">
                <div className="flex justify-between items-baseline">
                    <span className="text-xs font-mono text-slate-500">{item.time}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400`}>
                        {item.type.replace('_', ' ')}
                    </span>
                </div>
                <div className="text-sm font-medium text-slate-200 mt-1">{item.event}</div>
                <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
            </div>
        </div>
    );
};
