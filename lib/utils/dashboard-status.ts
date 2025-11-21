/**
 * Dashboard status calculation utilities
 */

export type StatusLevel = 'optimal' | 'good' | 'moderate' | 'poor';
export type PrimeState = 'PRIME STATE' | 'MODERATE' | 'AT RISK';

export interface PrimeStateResult {
    status: PrimeState;
    score: number;
    color: string;
    borderColor: string;
    bgGradient: string;
}

/**
 * Calculate Prime State based on recovery score
 */
export function calculatePrimeState(recoveryScore: number | null): PrimeStateResult {
    if (recoveryScore === null || recoveryScore === undefined) {
        return {
            status: 'MODERATE',
            score: 0,
            color: '#fbbf24',
            borderColor: 'border-yellow-500/30',
            bgGradient: 'from-yellow-900/20 to-slate-900',
        };
    }

    if (recoveryScore >= 67) {
        return {
            status: 'PRIME STATE',
            score: recoveryScore,
            color: '#10b981',
            borderColor: 'border-emerald-500/30',
            bgGradient: 'from-emerald-900/20 to-slate-900',
        };
    }

    if (recoveryScore >= 34) {
        return {
            status: 'MODERATE',
            score: recoveryScore,
            color: '#fbbf24',
            borderColor: 'border-yellow-500/30',
            bgGradient: 'from-yellow-900/20 to-slate-900',
        };
    }

    return {
        status: 'AT RISK',
        score: recoveryScore,
        color: '#ef4444',
        borderColor: 'border-red-500/30',
        bgGradient: 'from-red-900/20 to-slate-900',
    };
}

/**
 * Get HRV status
 */
export function getHRVStatus(hrv: number | null): StatusLevel {
    if (hrv === null) return 'moderate';
    if (hrv > 70) return 'optimal';
    if (hrv >= 30) return 'good';
    return 'poor';
}

/**
 * Get sleep status based on duration
 */
export function getSleepStatus(durationMinutes: number | null): StatusLevel {
    if (durationMinutes === null) return 'moderate';
    const hours = durationMinutes / 60;
    if (hours >= 7) return 'optimal';
    if (hours >= 6) return 'good';
    return 'poor';
}

/**
 * Format sleep duration
 */
export function formatSleepDuration(minutes: number | null): string {
    if (minutes === null) return 'No Data';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

/**
 * Format trend percentage
 */
export function formatTrend(trend: number | null): string {
    if (trend === null) return '--';
    const sign = trend >= 0 ? '+' : '';
    return `${sign}${trend.toFixed(0)}%`;
}

/**
 * Get insight message based on Prime State
 */
export function getInsightMessage(state: PrimeState): { title: string; text: string } {
    switch (state) {
        case 'PRIME STATE':
            return {
                title: 'CAPACIDADE MÁXIMA',
                text: 'Neuroplasticidade otimizada. O teu córtex pré-frontal está limpo de inflamação e tens luz verde para a fusão de empresa e treino de alta intensidade.',
            };
        case 'MODERATE':
            return {
                title: 'RECUPERAÇÃO MODERADA',
                text: 'O teu corpo está em modo de recuperação. Considera treino leve e foca em descanso ativo para otimizar a performance.',
            };
        case 'AT RISK':
            return {
                title: 'RISCO ELEVADO',
                text: 'Sinais de fadiga acumulada. Prioriza descanso e recuperação. Evita treino intenso até os marcadores melhorarem.',
            };
    }
}
