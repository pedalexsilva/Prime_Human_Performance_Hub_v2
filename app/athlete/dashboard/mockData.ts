import { Plane, Shield, Brain, Battery } from 'lucide-react';

export const SCENARIOS = {
    PEAK: {
        id: 'peak',
        status: 'PRIME STATE',
        score: 96,
        color: '#10B981', // Emerald 500
        bgGradient: 'from-emerald-500/20 to-emerald-900/5',
        borderColor: 'border-emerald-500/50',
        metrics: {
            hrv: { value: 112, label: 'ms', status: 'optimal', trend: '+12%' },
            sleep: { value: '7h 42m', label: 'Total', status: 'optimal', sub: 'REM: 2h15' },
            glucose: { value: 88, label: 'mg/dL', status: 'optimal', stability: 'Estável' },
            readiness: { value: 98, label: '%', status: 'optimal' }
        },
        insight: {
            title: "CAPACIDADE MÁXIMA",
            text: "Neuroplasticidade otimizada. O teu córtex pré-frontal está limpo de inflamação. Tens luz verde para a fusão da empresa e treino de alta intensidade."
        },
        nutrition: {
            strategy: "High Performance Fuel",
            macros: { carbs: "High", protein: "Mod", fats: "Low" },
            meals: [
                { time: "08:00", title: "Neuro-Breakfast", items: ["Ovos Poché", "Abacate", "Mirtilos (Antioxidantes)"], type: "Fat & Protein" },
                { time: "13:00", title: "Refuel Lunch", items: ["Quinoa", "Peito de Frango Bio", "Beterraba (Óxido Nítrico)"], type: "Carb Load" },
                { time: "20:00", title: "Recovery Dinner", items: ["Salmão Selvagem", "Batata Doce", "Espinafres"], type: "Serotonin Boost" }
            ],
            stack: [
                { name: "Omega-3 (DHA)", dose: "2g", time: "Manhã", checked: false },
                { name: "Creatina", dose: "5g", time: "Pós-Treino", checked: false },
                { name: "Magnésio Treonato", dose: "400mg", time: "Noite", checked: false }
            ]
        },
        schedule: [
            { time: '08:00', event: 'Café + L-Teanina', type: 'biohack', detail: 'Foco Limpo' },
            { time: '10:00', event: 'Deep Work (Estratégia)', type: 'work', detail: 'Janela de Pico' },
            { time: '13:00', event: 'Almoço Keto', type: 'nutrition', detail: 'Salmão + Verdes' },
            { time: '18:00', event: 'Treino VO2 Max', type: 'exercise', detail: 'Zona 5' }
        ],
        chartData: [
            { time: '06h', stress: 20, performance: 60 },
            { time: '09h', stress: 35, performance: 95 },
            { time: '12h', stress: 40, performance: 90 },
            { time: '15h', stress: 45, performance: 85 },
            { time: '18h', stress: 80, performance: 92 },
            { time: '21h', stress: 20, performance: 60 },
        ]
    },
    BURNOUT: {
        id: 'burnout',
        status: 'RISCO CRÍTICO',
        score: 34,
        color: '#EF4444', // Red 500
        bgGradient: 'from-red-500/20 to-red-900/5',
        borderColor: 'border-red-500/50',
        metrics: {
            hrv: { value: 28, label: 'ms', status: 'critical', trend: '-45%' },
            sleep: { value: '5h 10m', label: 'Total', status: 'critical', sub: 'REM: 35m' },
            glucose: { value: 145, label: 'mg/dL', status: 'warning', stability: 'Picos' },
            readiness: { value: 32, label: '%', status: 'critical' }
        },
        insight: {
            title: "MODO DE SEGURANÇA",
            text: "Sistema simpático em sobrecarga. Detetada fragmentação do sono REM. Treino de força cancelado para evitar lesão. Foco total em recuperação."
        },
        nutrition: {
            strategy: "Anti-Inflammatory Reset",
            macros: { carbs: "Zero", protein: "Mod", fats: "High" },
            meals: [
                { time: "08:00", title: "Jejum Metabólico", items: ["Apenas Água + Eletrólitos", "Café Preto (Opcional)"], type: "Autofagia" },
                { time: "13:00", title: "Keto Lunch", items: ["Salada Verde Escura", "Azeite Extra Virgem", "Sardinhas"], type: "Low Insulin" },
                { time: "19:00", title: "Gut Healing Soup", items: ["Caldo de Ossos (Bone Broth)", "Cúrcuma", "Gengibre"], type: "Repair" }
            ],
            stack: [
                { name: "Curcumina", dose: "500mg", time: "Manhã", checked: false },
                { name: "Ashwagandha", dose: "600mg", time: "Tarde", checked: false },
                { name: "Melatonina", dose: "0.3mg", time: "Noite", checked: false }
            ]
        },
        schedule: [
            { time: '08:00', event: 'Hidratação + Eletrólitos', type: 'recovery', detail: 'Suporte Adrenal' },
            { time: '10:00', event: 'Trabalho Admin Leve', type: 'work_light', detail: 'Sem Decisões' },
            { time: '14:00', event: 'Protocolo NSDR (20min)', type: 'recovery', detail: 'Reset Neural' },
            { time: '20:00', event: 'Bloqueio Luz Azul', type: 'sleep', detail: 'Prep. Sono' }
        ],
        chartData: [
            { time: '06h', stress: 85, performance: 40 },
            { time: '09h', stress: 90, performance: 35 },
            { time: '12h', stress: 85, performance: 30 },
            { time: '15h', stress: 95, performance: 20 },
            { time: '18h', stress: 70, performance: 25 },
            { time: '21h', stress: 60, performance: 15 },
        ]
    }
};

export const WEEKLY_DATA = [
    { day: 'Seg', strain: 14, recovery: 85, sleep: 7.5 },
    { day: 'Ter', strain: 16, recovery: 90, sleep: 8.0 },
    { day: 'Qua', strain: 12, recovery: 70, sleep: 6.5 },
    { day: 'Qui', strain: 18, recovery: 95, sleep: 8.2 },
    { day: 'Sex', strain: 15, recovery: 60, sleep: 5.5 },
    { day: 'Sáb', strain: 10, recovery: 98, sleep: 9.0 },
    { day: 'Dom', strain: 8, recovery: 96, sleep: 8.5 },
];

export const PROTOCOLS = [
    {
        id: 1, title: "Jet Lag Reset", duration: "48h", type: "Travel", icon: Plane, color: "text-blue-400", border: "border-blue-500/20",
        steps: [{ time: "07:00", action: "Luz Solar Direta", obs: "Mínimo 20 min" }, { time: "14:00", action: "Zero Cafeína", obs: "Trocar por Água com Gás" }, { time: "21:00", action: "Melatonina 0.3mg", obs: "Microdose apenas" }]
    },
    {
        id: 2, title: "Imunidade Boost", duration: "24h", type: "Defense", icon: Shield, color: "text-emerald-400", border: "border-emerald-500/20",
        steps: [{ time: "Manhã", action: "Vitamina D3 + K2", obs: "5000 UI" }, { time: "Tarde", action: "Sauna Infravermelha", obs: "30 min a 80ºC" }, { time: "Noite", action: "Zinco + Magnésio", obs: "Protocolo ZMA" }]
    },
    {
        id: 3, title: "Deep Focus Prep", duration: "60m", type: "Cognitive", icon: Brain, color: "text-purple-400", border: "border-purple-500/20",
        steps: [{ time: "T-60", action: "Desligar Notificações", obs: "Modo Avião" }, { time: "T-30", action: "Alpha-GPC + Café", obs: "Stack Colinérgico" }, { time: "T-00", action: "Binaural Beats 40Hz", obs: "Headphones Noise-Cancel" }]
    },
    {
        id: 4, title: "Adrenal Recovery", duration: "7 Dias", type: "Repair", icon: Battery, color: "text-orange-400", border: "border-orange-500/20",
        steps: [{ time: "Diário", action: "Ashwagandha KSM-66", obs: "600mg pós-almoço" }, { time: "Diário", action: "Caminhada Zona 1", obs: "Sem música/podcasts" }, { time: "Noite", action: "Banho Sais Epsom", obs: "Antes de dormir" }]
    },
];

export const CHAT_HISTORY = [
    { id: 1, sender: 'doctor', text: 'Bom dia. Analisei os teus dados de sono. A recuperação REM foi baixa. Bebeste álcool ontem à noite?', time: '07:02' },
    { id: 2, sender: 'user', text: 'Sim, dois copos de vinho ao jantar. Reunião tardia.', time: '07:15' },
    { id: 3, sender: 'doctor', text: 'Entendido. O álcool suprimiu o REM. Hoje o foco cognitivo estará 15% reduzido. Aumentei a tua dose de eletrólitos na agenda e cancelei o treino de força. Foca-te em hidratação até às 12h.', time: '07:16' },
];
