# Como Verificar Dados de HRV no Supabase

## Passos para executar o script SQL

1. **Acesse o Supabase Dashboard**
   - Vá para https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione o projeto "Prime Human"

2. **Abra o SQL Editor**
   - No menu lateral esquerdo, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute as queries**
   - Copie e cole as queries do arquivo `check-hrv-data.sql`
   - Execute uma por vez para ver os resultados
   - **IMPORTANTE**: Na query #5, substitua `'USER_ID_AQUI'` pelo ID real do usuário

## O que verificar em cada query

### Query 1: Usuários Atletas
- Verifica quais usuários têm role='athlete'
- Anote o `id` do usuário que você quer verificar

### Query 2: Conexões Whoop
- Verifica se há conexão ativa com Whoop
- Veja o `last_sync_at` para saber quando foi a última sincronização
- `connection_status` deve estar ativo

### Query 3: Recovery Metrics (dados brutos)
- Mostra os dados brutos de HRV vindos do Whoop
- Coluna `hrv_rmssd` deve ter valores (normalmente entre 20-100ms)
- Se estiver NULL ou 0, não há dados do Whoop

### Query 4: Daily Summaries (dados agregados)
- Mostra os dados agregados por dia
- Coluna `avg_hrv_rmssd` deve ter valores
- Se estiver NULL, o processo de agregação não rodou ou não há dados

### Query 5: Dados dos últimos 7 dias (usuário específico)
- **SUBSTITUA** `'USER_ID_AQUI'` pelo ID do usuário
- Mostra exatamente os dados que o dashboard usa
- Deve ter pelo menos 1 registro nos últimos 7 dias

### Query 6: Estatísticas Gerais
- Visão geral dos dados de HRV
- `records_with_hrv` vs `records_without_hrv`
- `avg_hrv_value` deve estar entre 20-100 (valores normais)

### Query 7: Valores Suspeitos
- Procura valores de HRV < 1 (suspeitos)
- Se houver resultados, pode indicar problema na conversão de unidades

### Query 8: Comparação Raw vs Agregado
- Compara dados brutos com agregados
- Útil para debug

## Possíveis Problemas e Soluções

### Problema 1: Nenhum dado em `recovery_metrics`
**Causa**: Whoop não sincronizou ou conexão inativa
**Solução**: 
- Verificar se a conexão Whoop está ativa (Query 2)
- Clicar em "Sync Whoop" no dashboard
- Verificar logs de erro na API

### Problema 2: Dados em `recovery_metrics` mas não em `daily_summaries`
**Causa**: Job de agregação não rodou
**Solução**: 
- Executar manualmente: `npm run aggregate`
- Verificar se o cron job está configurado

### Problema 3: HRV com valores muito pequenos (< 1)
**Causa**: Problema na conversão de unidades (segundos vs milissegundos)
**Solução**: 
- Verificar o código de sync do Whoop
- HRV deve estar em milissegundos (ms)

### Problema 4: HRV = NULL mas recovery_score tem valor
**Causa**: Whoop pode não ter dados de HRV para aquele dia
**Solução**: 
- Normal em alguns casos (usuário não usou o Whoop durante o sono)
- Verificar se há dados em outros dias

## Próximos Passos

Após executar as queries, compartilhe os resultados para análise:
1. Quantos registros aparecem em cada tabela?
2. Quais são os valores de `avg_hrv_rmssd` nos últimos 7 dias?
3. Há algum erro ou valor suspeito?
