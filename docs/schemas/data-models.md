# Schemas de Dados - Documentação

## Diagrama ER (Entity-Relationship)

\`\`\`mermaid
erDiagram
    users ||--o{ device_connections : has
    users ||--o{ recovery_metrics : generates
    users ||--o{ sleep_metrics : generates
    users ||--o{ workout_metrics : generates
    users ||--o{ sync_logs : has
    users ||--o{ data_validation_errors : has
    users ||--o{ doctor_patient_relationships : "patient in"
    users ||--o{ doctor_patient_relationships : "doctor in"
    device_connections ||--o{ sync_logs : triggers
    
    users {
        uuid id PK
        text email UK
        text role
        timestamptz created_at
    }
    
    device_connections {
        uuid id PK
        uuid user_id FK
        text platform UK
        text access_token
        text refresh_token
        timestamptz token_expires_at
        timestamptz last_sync_at
        boolean initial_sync_completed
        boolean is_active
    }
    
    recovery_metrics {
        uuid id PK
        uuid user_id FK
        text source_platform
        date metric_date UK
        numeric recovery_score
        numeric hrv_rmssd
        integer resting_heart_rate
        numeric spo2_percentage
        numeric skin_temp_celsius
        jsonb raw_data
    }
    
    sleep_metrics {
        uuid id PK
        uuid user_id FK
        text source_platform
        date metric_date UK
        timestamptz sleep_start
        timestamptz sleep_end
        integer total_sleep_minutes
        integer light_sleep_minutes
        integer deep_sleep_minutes
        integer rem_sleep_minutes
        integer awake_minutes
        numeric sleep_efficiency_percentage
        numeric respiratory_rate
        integer disturbance_count
        jsonb raw_data
    }
    
    workout_metrics {
        uuid id PK
        uuid user_id FK
        text source_platform
        text workout_id UK
        date metric_date
        timestamptz workout_start
        timestamptz workout_end
        integer duration_minutes
        numeric strain_score
        integer average_heart_rate
        integer max_heart_rate
        integer calories_burned
        numeric distance_meters
        jsonb zone_durations
        jsonb raw_data
    }
    
    sync_logs {
        uuid id PK
        uuid user_id FK
        text platform
        timestamptz sync_started_at
        timestamptz sync_completed_at
        text status
        integer records_synced
        integer validation_errors
        text error_message
    }
\`\`\`

## Tabelas Detalhadas

### users

Tabela de usuários da plataforma (gerida pelo Supabase Auth).

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| email | TEXT | NOT NULL, UNIQUE | Email do usuário |
| role | TEXT | NOT NULL | 'athlete', 'doctor', 'admin' |
| full_name | TEXT | | Nome completo |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de criação |

**Índices:**
\`\`\`sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
\`\`\`

**RLS Policies:**
\`\`\`sql
-- Usuários veem seu próprio perfil
CREATE POLICY "Users view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Médicos veem perfis de seus pacientes
CREATE POLICY "Doctors view patient profiles" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM doctor_patient_relationships
      WHERE doctor_id = auth.uid()
      AND patient_id = users.id
      AND status = 'active'
    )
  );
\`\`\`

---

### device_connections

Armazena conexões OAuth com plataformas externas (Whoop, Strava, Garmin).

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| id | UUID | PK, DEFAULT gen_random_uuid() | ID único |
| user_id | UUID | FK users(id), NOT NULL | Dono da conexão |
| platform | TEXT | NOT NULL | 'whoop', 'strava', 'garmin' |
| access_token | TEXT | NOT NULL | Token encriptado (TEXT) |
| refresh_token | TEXT | NOT NULL | Refresh token encriptado (TEXT) |
| token_expires_at | TIMESTAMPTZ | NOT NULL | Quando o token expira |
| last_sync_at | TIMESTAMPTZ | | Última sincronização |
| initial_sync_completed | BOOLEAN | DEFAULT false | Primeira sync concluída? |
| is_active | BOOLEAN | DEFAULT true | Conexão ativa? |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de criação |

**Constraints:**
\`\`\`sql
UNIQUE(user_id, platform)  -- Um user, uma conexão por plataforma
\`\`\`

**Índices:**
\`\`\`sql
CREATE INDEX idx_device_connections_user ON device_connections(user_id);
CREATE INDEX idx_device_connections_platform ON device_connections(platform);
CREATE INDEX idx_device_connections_active ON device_connections(user_id, is_active);
CREATE INDEX idx_device_connections_last_sync ON device_connections(last_sync_at DESC);
\`\`\`

**Funções SQL Relacionadas:**
- `save_whoop_tokens(user_id, access_token, refresh_token, expires_in)`
- `get_whoop_tokens(user_id, encryption_key)`
- `update_whoop_refresh_token(user_id, new_access, new_refresh, expires_in)`
- `validate_token_integrity(user_id, encryption_key)`

---

### recovery_metrics

Dados de recuperação diária (HRV, RHR, Recovery Score).

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| id | UUID | PK | ID único |
| user_id | UUID | FK users(id), NOT NULL | Atleta |
| source_platform | TEXT | NOT NULL | 'whoop', 'garmin', etc. |
| metric_date | DATE | NOT NULL | Data da métrica |
| recovery_score | NUMERIC(5,2) | CHECK (>= 0 AND <= 100) | Score 0-100 |
| hrv_rmssd | NUMERIC(8,2) | CHECK (> 0) | HRV em ms |
| resting_heart_rate | INTEGER | CHECK (>= 30 AND <= 200) | RHR em bpm |
| spo2_percentage | NUMERIC(5,2) | CHECK (>= 0 AND <= 100) | SpO2 % |
| skin_temp_celsius | NUMERIC(5,2) | | Temperatura da pele °C |
| raw_data | JSONB | | Dados originais da API |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Quando foi inserido |

**Constraints:**
\`\`\`sql
UNIQUE(user_id, source_platform, metric_date)
\`\`\`

**Índices:**
\`\`\`sql
CREATE INDEX idx_recovery_user_date ON recovery_metrics(user_id, metric_date DESC);
CREATE INDEX idx_recovery_platform ON recovery_metrics(source_platform);
CREATE INDEX idx_recovery_score ON recovery_metrics(recovery_score);
\`\`\`

**Queries Comuns:**
\`\`\`sql
-- Últimos 7 dias de um atleta
SELECT * FROM recovery_metrics
WHERE user_id = 'xxx'
  AND metric_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY metric_date DESC;

-- Média de recovery score (30 dias)
SELECT AVG(recovery_score) as avg_recovery
FROM recovery_metrics
WHERE user_id = 'xxx'
  AND metric_date >= CURRENT_DATE - INTERVAL '30 days';
\`\`\`

---

### sleep_metrics

Dados de sono (estágios, eficiência, qualidade).

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| id | UUID | PK | ID único |
| user_id | UUID | FK users(id), NOT NULL | Atleta |
| source_platform | TEXT | NOT NULL | Origem dos dados |
| metric_date | DATE | NOT NULL | Data do sono |
| sleep_start | TIMESTAMPTZ | | Início do sono |
| sleep_end | TIMESTAMPTZ | | Fim do sono |
| total_sleep_minutes | INTEGER | CHECK (>= 0) | Total de sono |
| light_sleep_minutes | INTEGER | CHECK (>= 0) | Sono leve |
| deep_sleep_minutes | INTEGER | CHECK (>= 0) | Sono profundo |
| rem_sleep_minutes | INTEGER | CHECK (>= 0) | Sono REM |
| awake_minutes | INTEGER | CHECK (>= 0) | Tempo acordado |
| sleep_efficiency_percentage | NUMERIC(5,2) | CHECK (>= 0 AND <= 100) | Eficiência % |
| respiratory_rate | NUMERIC(5,2) | CHECK (>= 5 AND <= 40) | Resp/min |
| disturbance_count | INTEGER | CHECK (>= 0) | Nº de interrupções |
| raw_data | JSONB | | Dados brutos |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de inserção |

**Constraints:**
\`\`\`sql
UNIQUE(user_id, source_platform, metric_date)
\`\`\`

**Índices:**
\`\`\`sql
CREATE INDEX idx_sleep_user_date ON sleep_metrics(user_id, metric_date DESC);
CREATE INDEX idx_sleep_efficiency ON sleep_metrics(sleep_efficiency_percentage);
\`\`\`

**Queries Comuns:**
\`\`\`sql
-- Qualidade de sono (última semana)
SELECT 
  metric_date,
  total_sleep_minutes,
  sleep_efficiency_percentage,
  disturbance_count
FROM sleep_metrics
WHERE user_id = 'xxx'
  AND metric_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY metric_date DESC;

-- Média de sono profundo (30 dias)
SELECT AVG(deep_sleep_minutes) as avg_deep_sleep
FROM sleep_metrics
WHERE user_id = 'xxx'
  AND metric_date >= CURRENT_DATE - INTERVAL '30 days';
\`\`\`

---

### workout_metrics

Dados de treinos e atividades físicas.

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| id | UUID | PK | ID único |
| user_id | UUID | FK users(id), NOT NULL | Atleta |
| source_platform | TEXT | NOT NULL | Origem |
| workout_id | TEXT | NOT NULL | ID externo do workout |
| metric_date | DATE | NOT NULL | Data do treino |
| workout_start | TIMESTAMPTZ | | Início |
| workout_end | TIMESTAMPTZ | | Fim |
| duration_minutes | INTEGER | CHECK (> 0) | Duração em minutos |
| strain_score | NUMERIC(5,2) | CHECK (>= 0 AND <= 21) | Strain (Whoop) |
| average_heart_rate | INTEGER | CHECK (>= 30 AND <= 220) | FC média |
| max_heart_rate | INTEGER | CHECK (>= 30 AND <= 220) | FC máxima |
| calories_burned | INTEGER | CHECK (>= 0) | Calorias |
| distance_meters | NUMERIC(10,2) | CHECK (>= 0) | Distância |
| zone_durations | JSONB | | Tempo por zona FC |
| raw_data | JSONB | | Dados originais |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Inserção |

**Constraints:**
\`\`\`sql
UNIQUE(user_id, source_platform, workout_id)
\`\`\`

**Índices:**
\`\`\`sql
CREATE INDEX idx_workout_user_date ON workout_metrics(user_id, metric_date DESC);
CREATE INDEX idx_workout_strain ON workout_metrics(strain_score);
\`\`\`

**Queries Comuns:**
\`\`\`sql
-- Treinos da última semana
SELECT 
  workout_start,
  duration_minutes,
  strain_score,
  calories_burned
FROM workout_metrics
WHERE user_id = 'xxx'
  AND metric_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY workout_start DESC;

-- Total de calorias (mês)
SELECT SUM(calories_burned) as total_calories
FROM workout_metrics
WHERE user_id = 'xxx'
  AND metric_date >= CURRENT_DATE - INTERVAL '30 days';
\`\`\`

---

### sync_logs

Registos de sincronizações (sucesso/falha).

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| id | UUID | PK | ID único |
| user_id | UUID | FK users(id), NOT NULL | Usuário sincronizado |
| platform | TEXT | NOT NULL | Plataforma |
| sync_started_at | TIMESTAMPTZ | NOT NULL | Início da sync |
| sync_completed_at | TIMESTAMPTZ | | Fim da sync |
| status | TEXT | NOT NULL | 'success', 'failed', 'partial' |
| records_synced | INTEGER | DEFAULT 0 | Total de registos |
| validation_errors | INTEGER | DEFAULT 0 | Erros de validação |
| error_message | TEXT | | Mensagem de erro |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp |

**Índices:**
\`\`\`sql
CREATE INDEX idx_sync_logs_user ON sync_logs(user_id, created_at DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status, created_at DESC);
CREATE INDEX idx_sync_logs_platform ON sync_logs(platform);
\`\`\`

**Queries de Monitoramento:**
\`\`\`sql
-- Taxa de sucesso (7 dias)
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'success')::NUMERIC / 
    COUNT(*)::NUMERIC * 100,
    2
  ) as success_rate
FROM sync_logs
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Tempo médio de sincronização
SELECT 
  AVG(EXTRACT(EPOCH FROM (sync_completed_at - sync_started_at))) as avg_duration_seconds
FROM sync_logs
WHERE status = 'success'
  AND sync_completed_at IS NOT NULL;
\`\`\`

---

### data_validation_errors

Erros de validação de dados (Zod).

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| id | UUID | PK | ID único |
| user_id | UUID | FK users(id), NOT NULL | Usuário afetado |
| platform | TEXT | NOT NULL | Origem dos dados |
| data_type | TEXT | NOT NULL | 'cycle', 'sleep', 'workout' |
| error_message | TEXT | | Mensagem de erro Zod |
| raw_data | JSONB | | Dados que falharam |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp |

**Índices:**
\`\`\`sql
CREATE INDEX idx_validation_errors_user ON data_validation_errors(user_id);
CREATE INDEX idx_validation_errors_date ON data_validation_errors(created_at DESC);
CREATE INDEX idx_validation_errors_type ON data_validation_errors(data_type);
\`\`\`

**Queries de Análise:**
\`\`\`sql
-- Erros mais comuns (últimos 7 dias)
SELECT 
  data_type,
  error_message,
  COUNT(*) as occurrences
FROM data_validation_errors
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY data_type, error_message
ORDER BY occurrences DESC
LIMIT 10;
\`\`\`

---

## Relacionamentos

### doctor_patient_relationships

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| doctor_id | UUID | FK users(id) |
| patient_id | UUID | FK users(id) |
| status | TEXT | 'active', 'inactive' |
| created_at | TIMESTAMPTZ | Data de atribuição |

**Constraint:**
\`\`\`sql
UNIQUE(doctor_id, patient_id)
CHECK(doctor_id != patient_id)
\`\`\`

---

## Migrações

### Ordem de Execução

1. `001_create_core_schema.sql` - Tabelas base
2. `002_create_metrics_tables.sql` - Tabelas de métricas
3. `005_create_sync_logs.sql` - Logs
4. `008_create_token_functions.sql` - Funções de tokens
5. `010_data_validation_errors.sql` - Erros de validação
6. `012_fix_sync_logs_rls.sql` - RLS fixes
7. `014_fix_device_connections_rls.sql` - RLS fixes
8. `015_complete_token_management.sql` - Token management

### Rollback

Em caso de necessidade de rollback, executar na ordem inversa:
\`\`\`sql
DROP TABLE IF EXISTS data_validation_errors;
DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS workout_metrics;
DROP TABLE IF EXISTS sleep_metrics;
DROP TABLE IF EXISTS recovery_metrics;
DROP TABLE IF EXISTS device_connections;
-- ...
\`\`\`

---

## Performance

### Tamanho Estimado

| Tabela | Registos/atleta/mês | Tamanho/registo | Total/atleta/mês |
|--------|---------------------|-----------------|------------------|
| recovery_metrics | 30 | 500 bytes | 15 KB |
| sleep_metrics | 30 | 600 bytes | 18 KB |
| workout_metrics | 15 | 700 bytes | 10.5 KB |
| sync_logs | 120 | 300 bytes | 36 KB |
| **Total** | | | **~80 KB/atleta/mês** |

**Projeção para 1000 atletas/ano:**
- 1000 atletas × 80 KB/mês × 12 meses = **960 MB/ano**
- Com índices: ~1.5 GB/ano

### Otimizações Aplicadas

- Índices em colunas de query frequente
- JSONB para dados brutos (flexibilidade)
- Particionamento futuro por `metric_date` (quando > 10M registos)
- Limpeza automática de logs antigos

---

## Backup e Recovery

### Estratégia de Backup

\`\`\`sql
-- Backup de dados críticos
pg_dump --table=device_connections \
        --table=recovery_metrics \
        --table=sleep_metrics \
        --table=workout_metrics \
        mydatabase > backup_$(date +%Y%m%d).sql
\`\`\`

### Restore
\`\`\`sql
psql mydatabase < backup_20250110.sql
\`\`\`

**Nota:** Supabase faz backups automáticos diários.
