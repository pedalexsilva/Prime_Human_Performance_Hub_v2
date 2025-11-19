# Sistema de Sincronização Whoop - Documentação Técnica

## Visão Geral

O Sistema de Sincronização Whoop é responsável por conectar atletas à plataforma Whoop, obter dados biométricos via API REST, normalizar e armazenar esses dados no PostgreSQL, e disponibilizá-los para médicos através de dashboards interativos.

## Arquitetura do Sistema

\`\`\`mermaid
graph TB
    A[Atleta] -->|OAuth2| B[Whoop API]
    B -->|Access Token| C[Token Manager]
    C -->|Encrypted Storage| D[(Supabase PostgreSQL)]
    E[Cron Job] -->|Scheduled| F[Sync Service]
    G[Doctor Dashboard] -->|Manual Trigger| F
    F -->|Fetch Data| B
    F -->|Validate| H[Zod Schemas]
    H -->|Normalize| I[Data Normalizer]
    I -->|Upsert| D
    D -->|Query| J[Dashboard UI]
    F -->|Log| K[Sync Logs]
    K -->|Monitor| L[Sync Monitoring Dashboard]
\`\`\`

## Componentes Principais

### 1. Autenticação OAuth2 (`lib/whoop/oauth.ts`)

**Fluxo de Autorização:**

\`\`\`mermaid
sequenceDiagram
    participant A as Atleta
    participant F as Frontend
    participant API as API Route
    participant W as Whoop API
    participant DB as Database

    A->>F: Clica "Conectar Whoop"
    F->>API: GET /api/auth/whoop/authorize
    API->>W: Redirect com client_id
    W->>A: Página de Login Whoop
    A->>W: Autoriza acesso
    W->>API: Callback com code
    API->>W: POST /oauth/token (trocar code por tokens)
    W->>API: access_token + refresh_token
    API->>DB: Salvar tokens encriptados
    API->>F: Redirect para dashboard
\`\`\`

**Endpoints:**
- `GET /api/auth/whoop/authorize` - Inicia fluxo OAuth
- `GET /api/auth/whoop/callback` - Recebe código de autorização

### 2. Gestão de Tokens (`lib/whoop/tokens.ts`)

**Funcionalidades:**
- Armazenamento seguro com encriptação AES-256 (pgcrypto)
- Validação automática de expiração
- Refresh automático quando token expira em < 5 minutos
- Verificação de integridade de dados

**Funções SQL:**
\`\`\`sql
-- Salvar tokens encriptados
save_whoop_tokens(p_user_id, p_access_token, p_refresh_token, p_expires_in)

-- Obter tokens descriptografados
get_whoop_tokens(p_user_id, p_encryption_key)

-- Atualizar refresh token
update_whoop_refresh_token(p_user_id, p_new_access_token, p_new_refresh_token, p_expires_in)

-- Validar integridade de tokens
validate_token_integrity(p_user_id, p_encryption_key)
\`\`\`

**Segurança:**
- Tokens nunca são armazenados em plain text
- Chave de encriptação via variável de ambiente `WHOOP_ENCRYPTION_KEY`
- RLS (Row Level Security) ativado na tabela `device_connections`

### 3. Cliente API Whoop (`lib/whoop/api.ts`)

**Endpoints Whoop utilizados:**

| Endpoint | Método | Descrição | Dados Retornados |
|----------|--------|-----------|------------------|
| `/v2/cycle` | GET | Ciclos de recuperação | HRV, RHR, Recovery Score |
| `/v2/sleep` | GET | Dados de sono | Estágios, eficiência, qualidade |
| `/v2/workout` | GET | Treinos e atividades | Strain, calorias, zonas de FC |

**Retry Logic:**
- Máximo 3 tentativas
- Exponential backoff: 1s, 2s, 4s
- Retry em: 429 (rate limit), 500, 503 (server error)
- Não retry em: 401 (unauthorized), 404 (not found)

**Exemplo de uso:**
\`\`\`typescript
// Buscar dados dos últimos 7 dias
const endDate = new Date()
const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

const { cycles, sleep, workouts } = await fetchAllData(
  userId,
  startDate.toISOString(),
  endDate.toISOString()
)
\`\`\`

### 4. Validação de Dados (`lib/whoop/schemas.ts` + `validator.ts`)

**Schemas Zod:**

\`\`\`typescript
// Recovery Metrics
{
  recovery_score: z.number().min(0).max(100),
  hrv_rmssd_milli: z.number().positive(),
  resting_heart_rate: z.number().min(30).max(200),
  spo2_percentage: z.number().min(0).max(100).nullable(),
  skin_temp_celsius: z.number().min(-10).max(50).nullable()
}

// Sleep Metrics
{
  total_in_bed_time_milli: z.number().positive(),
  sleep_performance_percentage: z.number().min(0).max(100).nullable(),
  respiratory_rate: z.number().min(5).max(40).nullable()
}

// Workout Metrics
{
  strain: z.number().min(0).max(21),
  average_heart_rate: z.number().min(30).max(220),
  max_heart_rate: z.number().min(30).max(220)
}
\`\`\`

**Processo de validação:**
1. Receber dados brutos da API
2. Validar cada registro com schema Zod
3. Filtrar registros inválidos
4. Registrar erros em `data_validation_errors` table
5. Retornar apenas dados válidos para inserção

### 5. Normalização de Dados (`lib/whoop/normalizer.ts`)

**Transformações aplicadas:**

| Dado Original | Transformação | Dado Final |
|---------------|---------------|------------|
| milliseconds | / 60000 | minutes |
| kilojoules | * 0.239 | calories |
| milli (HRV) | / 1000 | seconds |
| ISO timestamp | parse | Date object |

**Exemplo - Sleep Normalization:**
\`\`\`typescript
{
  // Input: Whoop Sleep API
  total_in_bed_time_milli: 28800000,
  light_sleep_duration_milli: 12000000,
  
  // Output: Normalized
  total_sleep_minutes: 480, // 28800000 / 60000
  light_sleep_minutes: 200  // 12000000 / 60000
}
\`\`\`

**Estrutura de Upsert:**
- **recovery_metrics**: UNIQUE (user_id, source_platform, metric_date)
- **sleep_metrics**: UNIQUE (user_id, source_platform, metric_date)
- **workout_metrics**: UNIQUE (user_id, source_platform, workout_id)

### 6. Serviço de Sincronização (`lib/whoop/sync.ts`)

**Fluxo completo:**

\`\`\`mermaid
flowchart TD
    A[Iniciar Sync] --> B{Primeira sync?}
    B -->|Sim| C[Buscar 15 dias]
    B -->|Não| D[Buscar 7 dias]
    C --> E[Validar Token]
    D --> E
    E -->|Token válido| F[Fetch Whoop API]
    E -->|Token inválido| G[Tentar Refresh]
    G -->|Sucesso| F
    G -->|Falha| H[Marcar conexão inativa]
    H --> I[Registrar erro]
    F --> J[Validar com Zod]
    J --> K[Normalizar dados]
    K --> L[Upsert no DB]
    L --> M[Gerar Daily Summaries]
    M --> N[Verificar Alertas]
    N --> O[Atualizar Metadata]
    O --> P{Primeira sync?}
    P -->|Sim| Q[Auto-atribuir Médico]
    P -->|Não| R[Registrar Log]
    Q --> R
    R --> S[Retornar Resultado]
    I --> S
\`\`\`

**Janelas temporais:**
- **Primeira sincronização**: 15 dias históricos
- **Sincronizações subsequentes**: 7 dias (overlap para garantir dados)

**Metadata atualizada:**
\`\`\`typescript
{
  last_sync_at: NOW(),
  initial_sync_completed: true,
  is_active: true
}
\`\`\`

## Tabelas do Banco de Dados

### device_connections
\`\`\`sql
CREATE TABLE device_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'whoop', 'strava', 'garmin'
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  last_sync_at TIMESTAMPTZ,
  initial_sync_completed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
\`\`\`

### recovery_metrics
\`\`\`sql
CREATE TABLE recovery_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source_platform TEXT NOT NULL,
  metric_date DATE NOT NULL,
  recovery_score NUMERIC(5,2),
  hrv_rmssd NUMERIC(8,2),
  resting_heart_rate INTEGER,
  spo2_percentage NUMERIC(5,2),
  skin_temp_celsius NUMERIC(5,2),
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_platform, metric_date)
);
\`\`\`

### sleep_metrics
\`\`\`sql
CREATE TABLE sleep_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source_platform TEXT NOT NULL,
  metric_date DATE NOT NULL,
  sleep_start TIMESTAMPTZ,
  sleep_end TIMESTAMPTZ,
  total_sleep_minutes INTEGER,
  light_sleep_minutes INTEGER,
  deep_sleep_minutes INTEGER,
  rem_sleep_minutes INTEGER,
  awake_minutes INTEGER,
  sleep_efficiency_percentage NUMERIC(5,2),
  respiratory_rate NUMERIC(5,2),
  disturbance_count INTEGER,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_platform, metric_date)
);
\`\`\`

### workout_metrics
\`\`\`sql
CREATE TABLE workout_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source_platform TEXT NOT NULL,
  workout_id TEXT NOT NULL,
  metric_date DATE NOT NULL,
  workout_start TIMESTAMPTZ,
  workout_end TIMESTAMPTZ,
  duration_minutes INTEGER,
  strain_score NUMERIC(5,2),
  average_heart_rate INTEGER,
  max_heart_rate INTEGER,
  calories_burned INTEGER,
  distance_meters NUMERIC(10,2),
  zone_durations JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, source_platform, workout_id)
);
\`\`\`

### sync_logs
\`\`\`sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'
  records_synced INTEGER DEFAULT 0,
  validation_errors INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### data_validation_errors
\`\`\`sql
CREATE TABLE data_validation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'cycle', 'sleep', 'workout'
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

## Índices de Performance

\`\`\`sql
-- Consultas por usuário e data (mais comum)
CREATE INDEX idx_recovery_user_date ON recovery_metrics(user_id, metric_date DESC);
CREATE INDEX idx_sleep_user_date ON sleep_metrics(user_id, metric_date DESC);
CREATE INDEX idx_workout_user_date ON workout_metrics(user_id, metric_date DESC);

-- Queries de monitorização
CREATE INDEX idx_sync_logs_user_status ON sync_logs(user_id, status, created_at DESC);
CREATE INDEX idx_device_connections_active ON device_connections(user_id, is_active);

-- Análise de erros
CREATE INDEX idx_validation_errors_date ON data_validation_errors(created_at DESC);
\`\`\`

## Row Level Security (RLS)

### Políticas Aplicadas

**device_connections:**
\`\`\`sql
-- Usuários só veem suas próprias conexões
CREATE POLICY "Users view own connections" ON device_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Sistema pode gerenciar todas as conexões
CREATE POLICY "Service role full access" ON device_connections
  FOR ALL USING (auth.role() = 'service_role');
\`\`\`

**recovery_metrics, sleep_metrics, workout_metrics:**
\`\`\`sql
-- Atletas veem seus próprios dados
CREATE POLICY "Users view own metrics" ON recovery_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Médicos veem dados de seus pacientes
CREATE POLICY "Doctors view patient metrics" ON recovery_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_relationships dpr
      WHERE dpr.patient_id = recovery_metrics.user_id
      AND dpr.doctor_id = auth.uid()
      AND dpr.status = 'active'
    )
  );
\`\`\`

## Endpoints API

### POST /api/sync/whoop
Força sincronização manual para um usuário específico.

**Request:**
\`\`\`json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
\`\`\`

**Response (Sucesso):**
\`\`\`json
{
  "success": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "records": {
    "cycles": 7,
    "sleep": 7,
    "workouts": 3
  },
  "validationErrors": 0
}
\`\`\`

**Response (Token Inválido):**
\`\`\`json
{
  "success": false,
  "error": "INVALID_TOKEN",
  "message": "Token de acesso inválido ou corrompido. Reconexão necessária.",
  "requiresReauth": true
}
\`\`\`

### GET /api/cron/sync-whoop
Sincronização em lote (cron job).

**Headers:**
\`\`\`
Authorization: Bearer {CRON_SECRET}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "total": 25,
  "successful": 23,
  "failed": 2,
  "results": [
    {
      "userId": "...",
      "success": true,
      "records": { "cycles": 7, "sleep": 7, "workouts": 3 }
    }
  ]
}
\`\`\`

### GET /api/sync/stats?period=7d
Estatísticas de sincronização.

**Query Params:**
- `period`: 7d, 30d, 90d

**Response:**
\`\`\`json
{
  "successRate": 94.5,
  "totalSyncs": 245,
  "avgDurationSeconds": 3.2,
  "byPlatform": {
    "whoop": 200,
    "strava": 45
  },
  "recentErrors": [
    {
      "userId": "...",
      "error": "Rate limit exceeded",
      "timestamp": "2025-01-10T14:30:00Z"
    }
  ]
}
\`\`\`

### GET /api/sync/athletes
Lista status de sincronização de todos os atletas.

**Response:**
\`\`\`json
{
  "athletes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "João Silva",
      "platform": "whoop",
      "lastSync": "2025-01-10T08:00:00Z",
      "status": "success",
      "isActive": true,
      "recordsToday": 15
    }
  ]
}
\`\`\`

### GET /api/sync/trends?days=30
Dados para gráfico de tendências.

**Response:**
\`\`\`json
{
  "trends": [
    {
      "date": "2025-01-10",
      "successful": 23,
      "failed": 2
    }
  ]
}
\`\`\`

### POST /api/admin/reset-whoop-connection
Reset de conexão Whoop (admin only).

**Request:**
\`\`\`json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Conexão Whoop resetada. Usuário deve reconectar."
}
\`\`\`

## Monitoramento e Observabilidade

### Dashboard de Sincronização
**URL:** `/doctor/dashboard/sync-monitoring`

**Features:**
- KPIs em tempo real (taxa de sucesso, total syncs, tempo médio)
- Lista de atletas com status de sincronização
- Gráfico de tendências (30 dias)
- Logs de erros detalhados
- Botão de sincronização forçada por atleta
- Auto-refresh a cada 30 segundos

### Queries de Monitoramento

**Taxa de sucesso (últimos 7 dias):**
\`\`\`sql
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / 
    COUNT(*)::NUMERIC * 100, 
    2
  ) as success_rate
FROM sync_logs
WHERE created_at >= NOW() - INTERVAL '7 days';
\`\`\`

**Atletas sem sincronização (últimas 24h):**
\`\`\`sql
SELECT u.id, u.email, dc.last_sync_at
FROM users u
JOIN device_connections dc ON dc.user_id = u.id
WHERE dc.platform = 'whoop'
  AND dc.is_active = true
  AND (
    dc.last_sync_at IS NULL 
    OR dc.last_sync_at < NOW() - INTERVAL '24 hours'
  );
\`\`\`

**Erros mais frequentes:**
\`\`\`sql
SELECT 
  error_message, 
  COUNT(*) as occurrences
FROM sync_logs
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;
\`\`\`

## Variáveis de Ambiente

\`\`\`env
# Whoop OAuth
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_ENCRYPTION_KEY=32_character_encryption_key

# Cron Protection
CRON_SECRET=your_cron_secret

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# URLs
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
\`\`\`

## Troubleshooting

Ver: [docs/procedures/sync-procedures.md](./procedures/sync-procedures.md)

## Diagramas Adicionais

### Fluxo de Dados Completo
\`\`\`mermaid
graph LR
    A[Whoop API] -->|Raw JSON| B[API Client]
    B -->|Retry Logic| C{Valid Response?}
    C -->|No| B
    C -->|Yes| D[Zod Validator]
    D -->|Valid| E[Normalizer]
    D -->|Invalid| F[Error Log Table]
    E -->|Normalized| G[(PostgreSQL)]
    G -->|Aggregate| H[Daily Summaries]
    G -->|Monitor| I[Alert System]
    G -->|Query| J[Doctor Dashboard]
\`\`\`

## Referências

- [Whoop API Documentation](https://developer.whoop.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Zod Schema Validation](https://zod.dev/)
