"use client"

import React, { useState } from 'react'
import { Activity, PlusCircle, Utensils, BookOpen, BarChart2, MessageSquare, FlaskConical, Brain, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
    id: string
    label: string
    icon: React.ElementType
}

const navItems: NavItem[] = [
    { id: 'dashboard', label: 'DASHBOARD', icon: Activity },
    { id: 'inputs', label: 'INPUTS', icon: PlusCircle },
    { id: 'fuel', label: 'FUEL', icon: Utensils },
    { id: 'lab', label: 'LAB', icon: FlaskConical },
    { id: 'mind', label: 'MIND', icon: Brain },
    { id: 'protocols', label: 'PROTOCOLS', icon: BookOpen },
    { id: 'trends', label: 'TRENDS', icon: BarChart2 },
    { id: 'rank', label: 'RANK', icon: Trophy },
    { id: 'chat', label: 'CHAT', icon: MessageSquare },
]

export function BottomNav() {
    const [activeId, setActiveId] = useState('dashboard')

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4">
            <div className="flex items-center justify-between bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-2xl shadow-black/50 gap-1 md:gap-2 overflow-x-auto no-scrollbar">
                {navItems.map((item) => {
                    const isActive = activeId === item.id
                    const isChat = item.id === 'chat'

                    if (isChat) {
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveId(item.id)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 group ml-2",
                                    "bg-slate-800/50 hover:bg-slate-800 border border-white/5"
                                )}
                            >
                                <div className={cn(
                                    "relative transition-all duration-300",
                                    isActive ? "text-emerald-400" : "text-emerald-500 group-hover:text-emerald-400"
                                )}>
                                    <item.icon size={24} strokeWidth={2.5} />
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950" />
                                </div>

                                <span className={cn(
                                    "text-[10px] font-bold tracking-wider mt-1 transition-all duration-300",
                                    isActive ? "text-emerald-400" : "text-emerald-500 group-hover:text-emerald-400"
                                )}>
                                    {item.label}
                                </span>
                            </button>
                        )
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveId(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 group shrink-0",
                                isActive ? "bg-white/10" : "hover:bg-white/5"
                            )}
                        >
                            <div className={cn(
                                "relative transition-all duration-300",
                                isActive ? "text-emerald-400 -translate-y-1" : "text-slate-400 group-hover:text-slate-200"
                            )}>
                                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>

                            <span className={cn(
                                "text-[9px] md:text-[10px] font-bold tracking-wider mt-1 transition-all duration-300",
                                isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
                            )}>
                                {item.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
