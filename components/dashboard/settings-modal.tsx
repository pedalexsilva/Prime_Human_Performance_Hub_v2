import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import {
    X,
    Activity,
    Settings,
    RefreshCw,
    Trash2,
    Plus,
    Shield,
    Bell,
    Moon,
    Heart,
    ExternalLink,
    Target, // Usado para Strava
    Wifi, // Usado para Garmin
    CheckCircle
} from 'lucide-react';

// --- Componentes Auxiliares ---

// Componente Toggle Switch (Interruptor)
const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (val: boolean) => void }) => (
    <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
);

interface PlatformLogo {
    id: string;
    platform_name: string;
    logo_url: string;
    display_name: string;
}

// Componente Cartão de Dispositivo Conectado
const DeviceCard = ({ device, onSync, onRemove }: { device: any; onSync: (id: string) => void; onRemove: (id: string) => void }) => {
    return (
        <div className="group relative flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-all duration-300">
            <div className="flex items-center gap-4">
                {device.logoUrl ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src={`${device.logoUrl}?v=2`} alt={device.name} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className="p-3 bg-slate-700/50 rounded-lg text-slate-300 group-hover:text-emerald-400 group-hover:bg-slate-700 transition-colors">
                        {device.icon}
                    </div>
                )}
                <div>
                    <h3 className="text-sm font-semibold text-white tracking-wide">{device.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs text-emerald-400 font-medium">
                            Sincronizado ({device.lastSync})
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">


                {/* Ações */}
                <div className="flex items-center gap-1 opacity-100 sm:opacity-100 transition-opacity">
                    <button onClick={() => onSync(device.id)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors" title="Sincronizar Agora">
                        <RefreshCw size={14} />
                    </button>
                    <button onClick={() => onRemove(device.id)} className="p-2 hover:bg-red-500/10 rounded-full text-slate-400 hover:text-red-400 transition-colors" title="Desconectar">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Dados das Plataformas Disponíveis para Conexão
const availablePlatforms = [
    { id: 'oura', name: 'Oura Ring', icon: <div className="h-5 w-5 rounded-full border-2 border-current"></div>, color: 'text-sky-400' },
    { id: 'whoop', name: 'Whoop', icon: <Activity size={20} />, color: 'text-emerald-400' },
    { id: 'garmin', name: 'Garmin Connect', icon: <Wifi size={20} />, color: 'text-orange-400' },
    { id: 'strava', name: 'Strava', icon: <Target size={20} />, color: 'text-red-400' },
];

interface SetupModalProps {
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
    connectedServices: string[];
    userId: string;
}

export const SetupModal = ({ isModalOpen, setIsModalOpen, connectedServices, userId }: SetupModalProps) => {
    const [flowStep, setFlowStep] = useState('main'); // 'main', 'select_platform', 'connecting', 'success'
    const [privacyMode, setPrivacyMode] = useState(false);
    const [stressNotif, setStressNotif] = useState(true);
    const [selectedPlatform, setSelectedPlatform] = useState<any>(null);
    const [platformLogos, setPlatformLogos] = useState<Record<string, string>>({});

    const router = useRouter();
    const supabase = createBrowserClient();

    // Fetch platform logos from Supabase
    useEffect(() => {
        const fetchLogos = async () => {
            const { data, error } = await supabase
                .from('platform_logos')
                .select('platform_name, logo_url');

            if (data && !error) {
                const logosMap: Record<string, string> = {};
                data.forEach((logo: any) => {
                    logosMap[logo.platform_name] = logo.logo_url;
                });
                setPlatformLogos(logosMap);
            }
        };

        if (isModalOpen) {
            fetchLogos();
        }
    }, [isModalOpen, supabase]);

    if (!isModalOpen) return null;

    // Map connected services to device objects
    const devices = connectedServices.map(service => {
        const platform = availablePlatforms.find(p => p.id === service);
        return {
            id: service,
            name: platform?.name || service,
            icon: platform?.icon,
            logoUrl: platformLogos[service] || null,
            lastSync: 'Sync active',
            platformId: service,
        };
    });

    const startConnection = (platform: any) => {
        if (platform.id === 'whoop') {
            // Redirect to Whoop Auth
            window.location.href = `/api/auth/whoop/authorize?user_id=${userId}`;
        } else {
            alert(`A integração com ${platform.name} estará disponível em breve!`);
        }
    };

    const handleRemoveDevice = async (id: string) => {
        if (!confirm('Tem a certeza que deseja desconectar este serviço?')) return;

        try {
            const response = await fetch('/api/connections', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: id }),
            });

            if (response.ok) {
                router.refresh();
            } else {
                alert('Erro ao desconectar serviço.');
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            alert('Erro ao desconectar serviço.');
        }
    };

    const handleSync = (id: string) => {
        // This would trigger a manual sync via API
        alert('Sincronização manual iniciada...');
    };

    // Vista 1: Dispositivos Conectados (Main)
    const RenderMainView = () => (
        <>
            {/* Secção Wearables Conectados */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wearables Conectados</h3>
                    <button
                        onClick={() => setFlowStep('select_platform')}
                        className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                    >
                        <Plus size={12} />
                        Conectar Novo Serviço
                    </button>
                </div>

                <div className="space-y-3">
                    {devices.map(device => (
                        <DeviceCard
                            key={device.id}
                            device={device}
                            onSync={handleSync}
                            onRemove={handleRemoveDevice}
                        />
                    ))}

                    {devices.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl">
                            <p className="text-slate-500 text-sm">Nenhum serviço conectado. Clique em "Conectar Novo Serviço" para começar.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Secção Preferências */}
            <div className="pt-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Preferências</h3>

                <div className="space-y-1 bg-slate-800/30 rounded-xl overflow-hidden">

                    {/* Item: Notificações */}
                    <div className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <Bell size={18} className="text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-white">Notificações de Stress</p>
                                <p className="text-xs text-slate-500">Alertar quando o nível de recuperação for baixo</p>
                            </div>
                        </div>
                        <ToggleSwitch enabled={stressNotif} onChange={setStressNotif} />
                    </div>

                    {/* Separador Fino */}
                    <div className="h-[1px] bg-slate-800 mx-4"></div>

                    {/* Item: Modo Privacidade */}
                    <div className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <Shield size={18} className="text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-white">Modo Privacidade (Blur Values)</p>
                                <p className="text-xs text-slate-500">Ocultar valores numéricos no dashboard</p>
                            </div>
                        </div>
                        <ToggleSwitch enabled={privacyMode} onChange={setPrivacyMode} />
                    </div>

                </div>
            </div>
        </>
    );

    // Vista 2: Selecionar Plataforma
    const RenderSelectPlatform = () => (
        <>
            <h3 className="text-base font-semibold text-white mb-4">Passo 1: Selecionar Plataforma</h3>
            <p className="text-sm text-slate-400 mb-6">Selecione o serviço onde estão os seus dados de alta performance para iniciar o processo de autorização.</p>

            <div className="grid grid-cols-2 gap-4">
                {availablePlatforms.map(platform => {
                    const isConnected = connectedServices.includes(platform.id);
                    const logoUrl = platformLogos[platform.id];
                    return (
                        <button
                            key={platform.id}
                            onClick={() => !isConnected && startConnection(platform)}
                            disabled={isConnected}
                            className={`flex flex-col items-center p-6 border-2 rounded-xl transition-all duration-200 group
                            ${isConnected
                                    ? 'border-slate-800 bg-slate-800/20 opacity-50 cursor-not-allowed'
                                    : `border-slate-700 hover:border-emerald-500 hover:bg-slate-800/50 ${platform.color}`
                                }`}
                        >
                            {logoUrl ? (
                                <div className="w-16 h-16 mb-3 rounded-lg overflow-hidden flex items-center justify-center">
                                    <img src={`${logoUrl}?v=2`} alt={platform.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className={`mb-3 p-3 rounded-lg transition-colors ${isConnected ? 'bg-slate-800 text-slate-500' : 'bg-slate-800/50 group-hover:bg-slate-700'}`}>
                                    {platform.icon}
                                </div>
                            )}
                            <span className={`font-semibold text-sm ${isConnected ? 'text-slate-500' : 'text-white'}`}>{platform.name}</span>
                            <span className="text-xs text-slate-500 mt-1">
                                {isConnected ? 'Conectado' : 'Conexão API'}
                            </span>
                        </button>
                    );
                })}
            </div>
        </>
    );

    // Vista 3: Conexão (Loading)
    const RenderConnecting = () => (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <RefreshCw size={32} className="text-emerald-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">A Autorizar {selectedPlatform?.name}...</h3>
            <p className="text-sm text-slate-400 max-w-xs">
                Isto simula o redirecionamento para o website do parceiro para conceder acesso.
                <br />
                <span className="flex items-center justify-center gap-1 mt-2 text-xs text-emerald-400">
                    Aguardando Token OAuth <ExternalLink size={12} />
                </span>
            </p>
        </div>
    );

    // Vista 4: Sucesso
    const RenderSuccess = () => (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <CheckCircle size={32} className="text-emerald-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Conexão Bem-Sucedida!</h3>
            <p className="text-sm text-slate-400">Os dados do **{selectedPlatform?.name}** estão a ser sincronizados pela primeira vez.</p>
        </div>
    );

    // Seleção do Conteúdo da Modal
    const renderContent = () => {
        switch (flowStep) {
            case 'select_platform':
                return <RenderSelectPlatform />;
            case 'connecting':
                return <RenderConnecting />;
            case 'success':
                return <RenderSuccess />;
            case 'main':
            default:
                return <RenderMainView />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsModalOpen(false)}
            />

            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

                {/* Header da Modal */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                            <Settings size={20} className="text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-white tracking-wide">
                            {flowStep === 'main' ? 'Definições & Dispositivos' : 'Configurar Conexão API'}
                        </h2>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {renderContent()}
                </div>

                {/* Footer Condicional */}
                {flowStep === 'main' && (
                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-6 py-2 bg-white text-slate-900 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Concluir
                        </button>
                    </div>
                )}

                {flowStep === 'select_platform' && (
                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-start">
                        <button
                            onClick={() => setFlowStep('main')}
                            className="px-6 py-2 bg-slate-700 text-white text-sm font-bold rounded-lg hover:bg-slate-600 transition-colors"
                        >
                            Voltar
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
