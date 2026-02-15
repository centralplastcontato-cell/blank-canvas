

## Controlar quando a IA gera o insight (janelas de horario + atualizacao manual)

### Problema atual
Toda vez que o usuario abre a pagina do Resumo do Dia, a edge function chama a OpenAI e gera um novo insight. Se for meia-noite (dia virou), o insight sai vazio e irrelevante porque ainda nao ha dados no dia novo.

### Solucao
A IA so gera o insight automaticamente em **3 janelas de horario** (12h, 17h e 22h BRT). Fora desses horarios, mostra o ultimo insight salvo. O botao "Atualizar" continua funcionando para forcar uma geracao manual a qualquer momento.

### Como funciona

1. **Nova coluna `ai_generated_at`** na tabela `daily_summaries` para registrar quando o ultimo insight foi gerado
2. **Logica de janelas na edge function**:
   - Ao carregar a pagina, a function calcula metricas e timeline ao vivo (como ja faz)
   - Para o insight da IA, verifica: ja existe um insight salvo para hoje?
     - Se sim, verifica se estamos numa nova janela (12h/17h/22h) que ainda nao foi coberta pelo ultimo `ai_generated_at`
     - Se nao estamos numa nova janela, retorna o insight salvo (sem chamar OpenAI)
   - Se o usuario passar `force_refresh: true`, sempre regenera (botao "Atualizar")
3. **Botao "Atualizar" no front-end** passa `force_refresh: true` para forcar a geracao

### Resultado para o usuario
- Abre a pagina as 00:16? Ve metricas zeradas mas **nenhum insight vazio da IA** (mostra "Nenhum insight gerado ainda" ou o ultimo do dia anterior)
- Abre ao meio-dia? IA gera automaticamente o primeiro insight do dia
- Abre as 18h? Ve o insight das 17h (gerado automaticamente quando alguem abriu a pagina naquela janela)
- Quer forcar? Clica "Atualizar" a qualquer momento

### Detalhes tecnicos

**Migracao SQL:**
```sql
ALTER TABLE daily_summaries ADD COLUMN ai_generated_at timestamptz;
```

**Edge function `daily-summary/index.ts`:**
- Novo parametro no body: `force_refresh` (boolean, opcional)
- Definir janelas: `[12, 17, 22]` (horas BRT)
- Antes de chamar OpenAI, buscar `ai_generated_at` do registro existente
- Logica:
  - Se `force_refresh === true` -> gerar
  - Se nao existe `ai_summary` para hoje -> verificar se hora atual >= 12 BRT, se sim gerar
  - Se ja existe `ai_summary`, calcular qual janela mais recente ja passou (ex: se sao 18h, janela = 17h) e comparar com `ai_generated_at`. Se `ai_generated_at` < janela, regenerar
  - Caso contrario: retornar `ai_summary` salvo sem chamar OpenAI
- Ao persistir, salvar `ai_generated_at: new Date().toISOString()` junto

**Front-end `ResumoDiarioTab.tsx`:**
- Botao "Atualizar" chama `fetchSummary(selectedDate, true)` passando force
- Carga inicial chama `fetchSummary(selectedDate)` sem force (usa cache inteligente)

**Hook `useDailySummary.ts`:**
- `fetchSummary` recebe parametro opcional `forceRefresh?: boolean`
- Passa `force_refresh: true` no body quando solicitado

