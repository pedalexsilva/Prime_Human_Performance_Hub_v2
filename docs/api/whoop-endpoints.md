# Whoop API - Guia de Endpoints

## Autenticação

Todos os endpoints da API Whoop requerem autenticação via OAuth 2.0 Bearer Token.

\`\`\`http
Authorization: Bearer {access_token}
\`\`\`

## Base URL

\`\`\`
https://api.prod.whoop.com
\`\`\`

## Rate Limits

- **100 requests por minuto** por usuário
- Headers de resposta incluem:
  - `X-RateLimit-Limit`: Total de requests permitidos
  - `X-RateLimit-Remaining`: Requests restantes
  - `X-RateLimit-Reset`: Timestamp de reset

**Handling Rate Limits:**
\`\`\`typescript
if (response.status === 429) {
  const resetTime = response.headers.get('X-RateLimit-Reset')
  // Aguardar até resetTime antes de nova tentativa
}
\`\`\`

## Endpoints

### 1. GET /v2/cycle

Retorna dados de ciclos de recuperação (Recovery).

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| start | ISO 8601 | Sim | Data/hora inicial |
| end | ISO 8601 | Sim | Data/hora final |
| nextToken | string | Não | Token para paginação |

**Exemplo de Request:**
\`\`\`http
GET /v2/cycle?start=2025-01-01T00:00:00Z&end=2025-01-08T00:00:00Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
\`\`\`

**Exemplo de Response:**
\`\`\`json
{
  "records": [
    {
      "id": "123456",
      "user_id": "78910",
      "created_at": "2025-01-07T08:00:00.000Z",
      "updated_at": "2025-01-07T09:30:00.000Z",
      "start": "2025-01-07T00:00:00.000Z",
      "end": "2025-01-07T23:59:59.999Z",
      "timezone_offset": "+00:00",
      "score_state": "SCORED",
      "score": {
        "strain": 12.456,
        "kilojoule": 10234.56,
        "average_heart_rate": 68,
        "max_heart_rate": 142
      },
      "recovery": {
        "score": 78,
        "user_calibrating": false,
        "hrv_rmssd_milli": 45.2,
        "spo2_percentage": 97.5,
        "resting_heart_rate": 52,
        "skin_temp_celsius": 33.4
      }
    }
  ],
  "next_token": null
}
\`\`\`

**Campos importantes:**

| Campo | Tipo | Descrição | Validação |
|-------|------|-----------|-----------|
| recovery.score | number | Score de recuperação 0-100 | 0 ≤ score ≤ 100 |
| recovery.hrv_rmssd_milli | number | HRV em milliseconds | > 0 |
| recovery.resting_heart_rate | number | Frequência cardíaca em repouso | 30-200 bpm |
| recovery.spo2_percentage | number | Saturação de oxigênio | 0-100% |
| recovery.skin_temp_celsius | number | Temperatura da pele | -10 a 50°C |

**Paginação:**
\`\`\`typescript
let allCycles = []
let nextToken = null

do {
  const url = nextToken 
    ? `/v2/cycle?start=${start}&end=${end}&nextToken=${nextToken}`
    : `/v2/cycle?start=${start}&end=${end}`
  
  const response = await fetch(url, { headers })
  const data = await response.json()
  
  allCycles.push(...data.records)
  nextToken = data.next_token
} while (nextToken)
\`\`\`

---

### 2. GET /v2/sleep

Retorna dados de sono.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| start | ISO 8601 | Sim | Data/hora inicial |
| end | ISO 8601 | Sim | Data/hora final |
| nextToken | string | Não | Token para paginação |

**Exemplo de Request:**
\`\`\`http
GET /v2/sleep?start=2025-01-01T00:00:00Z&end=2025-01-08T00:00:00Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
\`\`\`

**Exemplo de Response:**
\`\`\`json
{
  "records": [
    {
      "id": "654321",
      "user_id": "78910",
      "created_at": "2025-01-07T09:00:00.000Z",
      "updated_at": "2025-01-07T09:15:00.000Z",
      "start": "2025-01-06T23:30:00.000Z",
      "end": "2025-01-07T07:45:00.000Z",
      "timezone_offset": "+00:00",
      "nap": false,
      "score_state": "SCORED",
      "score": {
        "stage_summary": {
          "total_in_bed_time_milli": 29700000,
          "total_awake_time_milli": 1800000,
          "total_no_data_time_milli": 0,
          "total_light_sleep_time_milli": 14400000,
          "total_slow_wave_sleep_time_milli": 7200000,
          "total_rem_sleep_time_milli": 6300000,
          "sleep_cycle_count": 5,
          "disturbance_count": 12
        },
        "sleep_needed": {
          "baseline_milli": 28800000,
          "need_from_sleep_debt_milli": 1800000,
          "need_from_recent_strain_milli": 900000,
          "need_from_recent_nap_milli": -600000
        },
        "respiratory_rate": 14.2,
        "sleep_performance_percentage": 92,
        "sleep_consistency_percentage": 85,
        "sleep_efficiency_percentage": 94
      }
    }
  ],
  "next_token": null
}
\`\`\`

**Campos importantes:**

| Campo | Tipo | Descrição | Conversão |
|-------|------|-----------|-----------|
| nap | boolean | Indica se é uma sesta | Filtrar naps |
| score.stage_summary.total_in_bed_time_milli | number | Tempo total na cama (ms) | ÷ 60000 = minutos |
| score.stage_summary.total_light_sleep_time_milli | number | Sono leve (ms) | ÷ 60000 = minutos |
| score.stage_summary.total_slow_wave_sleep_time_milli | number | Sono profundo (ms) | ÷ 60000 = minutos |
| score.stage_summary.total_rem_sleep_time_milli | number | Sono REM (ms) | ÷ 60000 = minutos |
| score.stage_summary.total_awake_time_milli | number | Tempo acordado (ms) | ÷ 60000 = minutos |
| score.respiratory_rate | number | Taxa respiratória | 5-40 respirações/min |
| score.sleep_efficiency_percentage | number | Eficiência do sono | 0-100% |

**Filtrar Naps:**
\`\`\`typescript
const sleepRecords = data.records.filter(sleep => !sleep.nap)
\`\`\`

---

### 3. GET /v2/workout

Retorna dados de treinos e atividades.

**Parâmetros:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| start | ISO 8601 | Sim | Data/hora inicial |
| end | ISO 8601 | Sim | Data/hora final |
| nextToken | string | Não | Token para paginação |

**Exemplo de Request:**
\`\`\`http
GET /v2/workout?start=2025-01-01T00:00:00Z&end=2025-01-08T00:00:00Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
\`\`\`

**Exemplo de Response:**
\`\`\`json
{
  "records": [
    {
      "id": "987654",
      "user_id": "78910",
      "created_at": "2025-01-07T10:00:00.000Z",
      "updated_at": "2025-01-07T11:30:00.000Z",
      "start": "2025-01-07T08:00:00.000Z",
      "end": "2025-01-07T09:15:00.000Z",
      "timezone_offset": "+00:00",
      "sport_id": 1,
      "score_state": "SCORED",
      "score": {
        "strain": 14.2,
        "average_heart_rate": 145,
        "max_heart_rate": 182,
        "kilojoule": 3456.78,
        "percent_recorded": 100,
        "distance_meter": 10000,
        "altitude_gain_meter": 120,
        "altitude_change_meter": 115,
        "zone_duration": {
          "zone_zero_milli": 300000,
          "zone_one_milli": 1200000,
          "zone_two_milli": 1800000,
          "zone_three_milli": 900000,
          "zone_four_milli": 600000,
          "zone_five_milli": 300000
        }
      }
    }
  ],
  "next_token": null
}
\`\`\`

**Campos importantes:**

| Campo | Tipo | Descrição | Conversão |
|-------|------|-----------|-----------|
| sport_id | number | ID do tipo de atividade | Ver tabela de sports |
| score.strain | number | Strain score (esforço) | 0-21 scale |
| score.average_heart_rate | number | FC média | 30-220 bpm |
| score.max_heart_rate | number | FC máxima | 30-220 bpm |
| score.kilojoule | number | Energia gasta | × 0.239 = kcal |
| score.distance_meter | number | Distância em metros | ÷ 1000 = km |
| score.zone_duration.* | number | Tempo por zona (ms) | ÷ 60000 = min |

**Sport IDs (principais):**
\`\`\`typescript
const SPORT_TYPES = {
  1: 'Running',
  16: 'Cycling',
  71: 'Swimming',
  52: 'Weightlifting',
  96: 'Yoga',
  // ... ver documentação completa
}
\`\`\`

**Cálculo de duração:**
\`\`\`typescript
const durationMinutes = Math.round(
  (new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60000
)
\`\`\`

**Conversão de calorias:**
\`\`\`typescript
const caloriesBurned = Math.round(workout.score.kilojoule * 0.239)
\`\`\`

---

## Códigos de Status HTTP

| Código | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| 200 | Sucesso | Processar dados |
| 400 | Bad Request | Validar parâmetros |
| 401 | Unauthorized | Refresh token |
| 404 | Not Found | Verificar endpoint |
| 429 | Rate Limit | Aguardar e retry |
| 500 | Server Error | Retry com backoff |
| 503 | Service Unavailable | Retry com backoff |

## Tratamento de Erros

**Exemplo de Response de Erro:**
\`\`\`json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "The access token is invalid or has expired"
  }
}
\`\`\`

**Implementação de Retry:**
\`\`\`typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        return await response.json()
      }
      
      // Retry em erros específicos
      if ([429, 500, 503].includes(response.status) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Erro não recuperável
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      
    } catch (error) {
      if (attempt === maxRetries) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
}
\`\`\`

## Best Practices

### 1. Janelas Temporais
\`\`\`typescript
// ✅ BOM: Janelas pequenas para evitar timeout
const DAYS = 7
const endDate = new Date()
const startDate = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000)

// ❌ EVITAR: Janelas muito grandes
const startDate = new Date('2020-01-01') // Muito tempo, pode timeout
\`\`\`

### 2. Paginação
\`\`\`typescript
// ✅ BOM: Sempre tratar paginação
let allRecords = []
let nextToken = null

do {
  const data = await fetchPage(nextToken)
  allRecords.push(...data.records)
  nextToken = data.next_token
} while (nextToken)
\`\`\`

### 3. Validação de Dados
\`\`\`typescript
// ✅ BOM: Validar antes de usar
if (cycle.recovery && 
    typeof cycle.recovery.score === 'number' &&
    cycle.recovery.score >= 0 && 
    cycle.recovery.score <= 100) {
  // Processar
}
\`\`\`

### 4. Rate Limiting
\`\`\`typescript
// ✅ BOM: Respeitar rate limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

for (const user of users) {
  await syncUserData(user.id)
  await delay(600) // 100 requests/min = 1 request a cada 600ms
}
\`\`\`

## Exemplos Completos

### Buscar Dados de um Atleta
\`\`\`typescript
async function fetchAthleteData(userId: string) {
  const endDate = new Date()
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  
  const token = await getValidToken(userId)
  
  const [cycles, sleep, workouts] = await Promise.all([
    fetchCycles(userId, startDate.toISOString(), endDate.toISOString()),
    fetchSleep(userId, startDate.toISOString(), endDate.toISOString()),
    fetchWorkouts(userId, startDate.toISOString(), endDate.toISOString())
  ])
  
  return { cycles, sleep, workouts }
}
\`\`\`

### Processar e Salvar Dados
\`\`\`typescript
async function processAndSaveData(userId: string, data: WhoopData) {
  // Validar
  const validatedData = await validateData(data)
  
  // Normalizar
  const normalized = {
    recovery: data.cycles.map(c => normalizeRecoveryMetrics(c, userId)),
    sleep: data.sleep.filter(s => !s.nap).map(s => normalizeSleepMetrics(s, userId)),
    workouts: data.workouts.map(w => normalizeWorkoutMetrics(w, userId))
  }
  
  // Salvar
  const result = await saveMetrics(
    normalized.recovery,
    normalized.sleep,
    normalized.workouts,
    userId
  )
  
  return result
}
\`\`\`

## Referências

- [Whoop Developer Portal](https://developer.whoop.com)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)
- [HTTP Status Codes](https://httpstatuses.com/)
