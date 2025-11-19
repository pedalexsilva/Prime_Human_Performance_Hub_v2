# Procedimentos Operacionais - Sincronização Whoop

## Guia de Troubleshooting

### Problema 1: "Wrong key or corrupt data"

**Sintoma:**
\`\`\`
fetch to .../rpc/get_whoop_tokens failed with status 500
{"code":"39000","message":"Wrong key or corrupt data"}
\`\`\`

**Causa:**
- Tokens foram encriptados com chave diferente
- Variável `WHOOP_ENCRYPTION_KEY` foi alterada
- Dados corrompidos na base de dados

**Solução:**

1. **Verificar variável de ambiente:**
\`\`\`bash
# Na plataforma Vercel
echo $WHOOP_ENCRYPTION_KEY

# Deve ter exatamente 32 caracteres
\`\`\`

2. **Validar integridade dos tokens:**
\`\`\`sql
-- Executar no SQL Editor do Supabase
SELECT validate_token_integrity(
  'user-id-aqui',
  'sua-encryption-key'
);

-- Retorna: true (válido) ou false (corrompido)
\`\`\`

3. **Limpar tokens corrompidos (Admin):**
\`\`\`typescript
// POST /api/admin/reset-whoop-connection
fetch('/api/admin/reset-whoop-connection', {
  method: 'POST',
  body: JSON.stringify({ userId: 'xxx' })
})
\`\`\`

4. **Solicitar reconexão ao atleta:**
- Navegar para `/athlete/dashboard`
- Clicar em "Conectar Whoop"
- Completar fluxo OAuth novamente

---

### Problema 2: Sincronização não acontece automaticamente

**Sintoma:**
- Cron job não executa
- `last_sync_at` não atualiza

**Verificações:**

1. **Confirmar configuração do Cron:**
\`\`\`bash
# Vercel Dashboard > Project > Settings > Cron Jobs
# Deve existir:
# Path: /api/cron/sync-whoop
# Schedule: 0 */6 * * * (a cada 6 horas)
\`\`\`

2. **Testar endpoint manualmente:**
\`\`\`bash
curl -X GET https://seudominio.com/api/cron/sync-whoop \
  -H "Authorization: Bearer ${CRON_SECRET}"
\`\`\`

3. **Verificar logs no Vercel:**
\`\`\`
Vercel Dashboard > Logs > Filter by "/api/cron/sync-whoop"
\`\`\`

4. **Verificar `CRON_SECRET`:**
\`\`\`bash
# Deve estar configurado no Vercel
# E coincidir com o valor no código
\`\`\`

**Solução alternativa - Sync manual:**
\`\`\`typescript
// No dashboard do médico
// /doctor/dashboard/sync-monitoring
// Clicar botão "Sync Now" no atleta desejado
\`\`\`

---

### Problema 3: Rate Limit 429

**Sintoma:**
\`\`\`
HTTP 429: Too Many Requests
X-RateLimit-Remaining: 0
\`\`\`

**Causa:**
- Mais de 100 requests/minuto para a API Whoop
- Múltiplas sincronizações simultâneas

**Solução:**

1. **Verificar concorrência:**
\`\`\`typescript
// lib/whoop/sync.ts
// Deve usar p-limit para limitar concorrência
import pLimit from 'p-limit'
const limit = pLimit(5) // Máximo 5 simultâneos
\`\`\`

2. **Implementar delay entre requests:**
\`\`\`typescript
// Adicionar delay após cada sync
await syncUserData(userId)
await new Promise(resolve => setTimeout(resolve, 600)) // 600ms
\`\`\`

3. **Aguardar reset do rate limit:**
\`\`\`typescript
if (response.status === 429) {
  const resetTime = response.headers.get('X-RateLimit-Reset')
  const waitTime = new Date(resetTime).getTime() - Date.now()
  await new Promise(resolve => setTimeout(resolve, waitTime))
}
\`\`\`

---

### Problema 4: Dados não aparecem no dashboard

**Sintoma:**
- Sincronização reporta sucesso
- Dashboard mostra "Sem dados"

**Verificações:**

1. **Confirmar dados no banco:**
\`\`\`sql
-- Verificar recovery_metrics
SELECT COUNT(*), MAX(metric_date)
FROM recovery_metrics
WHERE user_id = 'user-id-aqui';

-- Verificar sleep_metrics
SELECT COUNT(*), MAX(metric_date)
FROM sleep_metrics
WHERE user_id = 'user-id-aqui';

-- Verificar workout_metrics
SELECT COUNT(*), MAX(metric_date)
FROM workout_metrics
WHERE user_id = 'user-id-aqui';
\`\`\`

2. **Verificar RLS (Row Level Security):**
\`\`\`sql
-- Confirmar que médico tem acesso aos dados do paciente
SELECT * FROM doctor_patient_relationships
WHERE patient_id = 'patient-id'
AND doctor_id = 'doctor-id'
AND status = 'active';
\`\`\`

3. **Testar query diretamente:**
\`\`\`sql
-- Como o médico logado
SELECT * FROM recovery_metrics
WHERE user_id = 'patient-id'
LIMIT 10;

-- Se retornar vazio, problema é RLS
-- Se retornar dados, problema é no frontend
\`\`\`

**Solução RLS:**
\`\`\`sql
-- Criar relação doctor-patient
INSERT INTO doctor_patient_relationships (
  doctor_id,
  patient_id,
  status
) VALUES (
  'doctor-uuid',
  'patient-uuid',
  'active'
);
\`\`\`

---

### Problema 5: Erros de validação (Zod)

**Sintoma:**
\`\`\`
Validation error: recovery_score must be between 0 and 100
\`\`\`

**Investigação:**

1. **Consultar erros de validação:**
\`\`\`sql
SELECT * FROM data_validation_errors
WHERE user_id = 'user-id'
ORDER BY created_at DESC
LIMIT 20;
\`\`\`

2. **Analisar raw_data:**
\`\`\`sql
SELECT 
  data_type,
  error_message,
  raw_data
FROM data_validation_errors
WHERE created_at >= NOW() - INTERVAL '24 hours';
\`\`\`

**Ações:**

1. **Se dados inválidos vieram da Whoop:**
   - Reportar à Whoop API Support
   - Ajustar schema Zod para tolerar casos edge
   - Adicionar transformação de dados

2. **Se schema Zod está muito restritivo:**
\`\`\`typescript
// Ajustar em lib/whoop/schemas.ts
recovery_score: z.number().min(0).max(100).nullable() // Permitir null
\`\`\`

3. **Atualizar logs de validação:**
\`\`\`typescript
// lib/whoop/validator.ts
// Adicionar mais contexto ao erro
console.error('[v0] Validation failed:', {
  userId,
  dataType,
  error: error.message,
  data: JSON.stringify(record)
})
\`\`\`

---

### Problema 6: Timeout em sincronizações

**Sintoma:**
\`\`\`
Error: Function execution timed out after 60 seconds
\`\`\`

**Causa:**
- Janela temporal muito grande
- Muitos dados para processar
- API Whoop lenta

**Solução:**

1. **Reduzir janela temporal:**
\`\`\`typescript
// lib/whoop/sync.ts
const INITIAL_SYNC_DAYS = 7  // Era 15
const REGULAR_SYNC_DAYS = 3  // Era 7
\`\`\`

2. **Dividir sincronização em batches:**
\`\`\`typescript
async function syncInBatches(userId: string, days: number) {
  const batchSize = 3 // 3 dias por vez
  
  for (let i = 0; i < days; i += batchSize) {
    const start = new Date(Date.now() - (i + batchSize) * 24 * 60 * 60 * 1000)
    const end = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    
    await syncUserData(userId, start, end)
  }
}
\`\`\`

3. **Aumentar timeout (Vercel Pro):**
\`\`\`javascript
// vercel.json
{
  "functions": {
    "app/api/cron/sync-whoop/route.ts": {
      "maxDuration": 300
    }
  }
}
\`\`\`

---

## Procedimentos de Manutenção

### Limpeza de Logs Antigos

**Frequência:** Mensal

\`\`\`sql
-- Remover logs com mais de 90 dias
DELETE FROM sync_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Remover erros de validação com mais de 30 dias
DELETE FROM data_validation_errors
WHERE created_at < NOW() - INTERVAL '30 days';
\`\`\`

### Audit de Conexões Inativas

**Frequência:** Semanal

\`\`\`sql
-- Listar conexões sem sincronização há mais de 7 dias
SELECT 
  u.email,
  dc.platform,
  dc.last_sync_at,
  dc.is_active
FROM device_connections dc
JOIN users u ON u.id = dc.user_id
WHERE dc.is_active = true
  AND (
    dc.last_sync_at IS NULL 
    OR dc.last_sync_at < NOW() - INTERVAL '7 days'
  );
\`\`\`

**Ação:**
- Notificar atletas para reconectar
- Marcar como inativas após 14 dias

\`\`\`sql
-- Marcar como inativas
UPDATE device_connections
SET is_active = false
WHERE last_sync_at < NOW() - INTERVAL '14 days'
  AND is_active = true;
\`\`\`

### Monitoramento de Taxa de Sucesso

**Frequência:** Diária

\`\`\`sql
-- Taxa de sucesso (últimas 24h)
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / 
    COUNT(*)::NUMERIC * 100,
    2
  ) as success_rate_percentage
FROM sync_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';
\`\`\`

**Meta:** Taxa de sucesso > 95%

**Ação se < 95%:**
1. Investigar erros mais comuns
2. Verificar status da API Whoop
3. Revisar logs de validação

---

## Adicionar Nova Plataforma (ex: Garmin)

### Passo 1: Configurar OAuth

\`\`\`typescript
// lib/garmin/oauth.ts
export function getGarminAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GARMIN_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/garmin/callback`,
    scope: 'activity:read profile:read',
    state
  })
  
  return `https://connect.garmin.com/oauth/authorize?${params}`
}
\`\`\`

### Passo 2: Criar API Client

\`\`\`typescript
// lib/garmin/api.ts
export async function fetchGarminActivities(
  userId: string,
  startDate: string,
  endDate: string
) {
  const token = await ensureValidToken(userId)
  
  const response = await retryWithBackoff(() =>
    fetch(`https://apis.garmin.com/wellness-api/rest/activities`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      params: { startDate, endDate }
    })
  )
  
  return response.json()
}
\`\`\`

### Passo 3: Criar Schemas Zod

\`\`\`typescript
// lib/garmin/schemas.ts
import { z } from 'zod'

export const GarminActivitySchema = z.object({
  activityId: z.string(),
  activityName: z.string(),
  startTimeGMT: z.string(),
  duration: z.number().positive(),
  distance: z.number().nonnegative(),
  averageHR: z.number().min(30).max(220).nullable(),
  maxHR: z.number().min(30).max(220).nullable(),
  calories: z.number().nonnegative()
})
\`\`\`

### Passo 4: Normalizar Dados

\`\`\`typescript
// lib/garmin/normalizer.ts
export function normalizeGarminActivity(
  activity: GarminActivity,
  userId: string
): WorkoutMetric {
  return {
    user_id: userId,
    source_platform: 'garmin',
    workout_id: activity.activityId,
    metric_date: new Date(activity.startTimeGMT).toISOString().split('T')[0],
    workout_start: activity.startTimeGMT,
    workout_end: new Date(
      new Date(activity.startTimeGMT).getTime() + activity.duration * 1000
    ).toISOString(),
    duration_minutes: Math.round(activity.duration / 60),
    average_heart_rate: activity.averageHR,
    max_heart_rate: activity.maxHR,
    calories_burned: activity.calories,
    distance_meters: activity.distance,
    raw_data: activity
  }
}
\`\`\`

### Passo 5: Adicionar ao Sync Service

\`\`\`typescript
// lib/garmin/sync.ts
export async function syncGarminData(userId: string) {
  // Similar ao syncUserData do Whoop
  const activities = await fetchGarminActivities(userId, startDate, endDate)
  const validated = validateData(activities)
  const normalized = validated.map(a => normalizeGarminActivity(a, userId))
  await saveWorkoutMetrics(normalized, userId)
}
\`\`\`

### Passo 6: Atualizar Cron Job

\`\`\`typescript
// app/api/cron/sync-all/route.ts
const platforms = ['whoop', 'garmin', 'strava']

for (const platform of platforms) {
  await syncPlatformData(userId, platform)
}
\`\`\`

---

## Checklist de Deploy

### Pré-Deploy

- [ ] Testar localmente com dados reais
- [ ] Executar todos os scripts SQL em staging
- [ ] Validar variáveis de ambiente
- [ ] Verificar rate limits e quotas
- [ ] Atualizar documentação

### Deploy

- [ ] Fazer backup do banco de dados
- [ ] Executar migrations SQL em produção
- [ ] Deploy da aplicação Next.js
- [ ] Verificar variáveis de ambiente em produção
- [ ] Configurar cron jobs no Vercel

### Pós-Deploy

- [ ] Testar fluxo OAuth completo
- [ ] Forçar sync manual de um usuário teste
- [ ] Verificar logs de sync no dashboard
- [ ] Monitorar taxa de sucesso por 24h
- [ ] Confirmar cron jobs executando

---

## Contatos de Suporte

**Whoop API:**
- Email: developer-support@whoop.com
- Docs: https://developer.whoop.com

**Supabase:**
- Dashboard: https://supabase.com/dashboard
- Support: https://supabase.com/support

**Vercel:**
- Dashboard: https://vercel.com/dashboard
- Support: https://vercel.com/help
