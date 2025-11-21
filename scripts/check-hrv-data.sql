-- ============================================
-- Script para verificar dados de HRV no Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Verificar usuários atletas
SELECT 
    id,
    full_name,
    email,
    role,
    created_at
FROM profiles
WHERE role = 'athlete'
ORDER BY created_at DESC;

-- 2. Verificar conexões de dispositivos (Whoop)
SELECT 
    dc.user_id,
    p.full_name,
    dc.platform,
    dc.connection_status,
    dc.last_sync_at,
    dc.created_at
FROM device_connections dc
LEFT JOIN profiles p ON dc.user_id = p.id
WHERE dc.platform = 'whoop'
ORDER BY dc.last_sync_at DESC;

-- 3. Verificar dados de recovery_metrics (últimos 10 registros)
SELECT 
    rm.user_id,
    p.full_name,
    rm.metric_date,
    rm.recovery_score,
    rm.hrv_rmssd,
    rm.resting_heart_rate,
    rm.source_platform,
    rm.created_at
FROM recovery_metrics rm
LEFT JOIN profiles p ON rm.user_id = p.id
ORDER BY rm.metric_date DESC, rm.created_at DESC
LIMIT 10;

-- 4. Verificar dados de daily_summaries (últimos 10 registros)
SELECT 
    ds.user_id,
    p.full_name,
    ds.summary_date,
    ds.avg_recovery_score,
    ds.avg_hrv_rmssd,
    ds.avg_resting_hr,
    ds.total_sleep_minutes,
    ds.total_strain,
    ds.data_completeness,
    ds.sources
FROM daily_summaries ds
LEFT JOIN profiles p ON ds.user_id = p.id
ORDER BY ds.summary_date DESC
LIMIT 10;

-- 5. Verificar dados de HRV para um usuário específico (últimos 7 dias)
-- SUBSTITUA 'USER_ID_AQUI' pelo ID do usuário que você quer verificar
SELECT 
    summary_date,
    avg_recovery_score,
    avg_hrv_rmssd,
    avg_resting_hr,
    total_sleep_minutes,
    total_strain,
    data_completeness,
    sources
FROM daily_summaries
WHERE user_id = 'USER_ID_AQUI'
    AND summary_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY summary_date DESC;

-- 6. Estatísticas gerais de HRV
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as total_users,
    COUNT(CASE WHEN avg_hrv_rmssd IS NOT NULL THEN 1 END) as records_with_hrv,
    COUNT(CASE WHEN avg_hrv_rmssd IS NULL THEN 1 END) as records_without_hrv,
    ROUND(AVG(avg_hrv_rmssd), 2) as avg_hrv_value,
    ROUND(MIN(avg_hrv_rmssd), 2) as min_hrv_value,
    ROUND(MAX(avg_hrv_rmssd), 2) as max_hrv_value
FROM daily_summaries
WHERE summary_date >= CURRENT_DATE - INTERVAL '30 days';

-- 7. Verificar se há dados de HRV = 0 ou muito pequenos
SELECT 
    ds.user_id,
    p.full_name,
    ds.summary_date,
    ds.avg_hrv_rmssd,
    ds.avg_recovery_score,
    ds.sources
FROM daily_summaries ds
LEFT JOIN profiles p ON ds.user_id = p.id
WHERE ds.avg_hrv_rmssd IS NOT NULL 
    AND ds.avg_hrv_rmssd < 1
    AND ds.summary_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ds.summary_date DESC;

-- 8. Verificar dados brutos de recovery_metrics para comparação
SELECT 
    rm.user_id,
    p.full_name,
    rm.metric_date,
    rm.hrv_rmssd as raw_hrv,
    rm.recovery_score as raw_recovery,
    rm.resting_heart_rate as raw_hr,
    rm.source_platform
FROM recovery_metrics rm
LEFT JOIN profiles p ON rm.user_id = p.id
WHERE rm.metric_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY rm.metric_date DESC, rm.created_at DESC
LIMIT 20;
