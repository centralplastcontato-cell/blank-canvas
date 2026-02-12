

# Modulo Inteligencia -- Prompt Refinado e Adaptado ao Celebrei

## Resumo

Modulo 100% analitico (read-only sobre dados operacionais) que calcula score de leads, classifica temperatura, identifica abandono e exibe priorizacao em uma unica tela com 3 tabs.

---

## 1. Modulo Toggle (settings.enabled_modules)

Adicionar `inteligencia` ao sistema existente:

**useCompanyModules.ts** -- Adicionar ao `CompanyModules`:
```text
inteligencia: boolean  (default: false)
```

**MODULE_LABELS** -- Adicionar:
```text
inteligencia: { label: 'Inteligencia', description: 'Score de leads, priorizacao e analise de funil' }
```

**CompanyModulesDialog** -- Automaticamente inclui o novo toggle (ja itera sobre MODULE_LABELS).

**AdminSidebar** -- Adicionar item condicional:
```text
...(modules.inteligencia ? [{ title: "Inteligencia", url: "/inteligencia", icon: Brain }] : [])
```

---

## 2. Permissoes (permission_definitions)

Inserir na tabela `permission_definitions` (categoria "Inteligencia"):

| code | name | description |
|------|------|-------------|
| ic.view | Acessar Inteligencia | Permite visualizar o modulo Inteligencia |
| ic.export | Exportar Relatorios | Permite exportar dados de inteligencia |

Apenas 2 permissoes no MVP. `ic.open_chat` nao e necessario pois o botao "Abrir Chat" ja usa a navegacao existente para `/atendimento`.

---

## 3. Tabela `lead_intelligence` (separada)

Relacao 1:1 com `campaign_leads`. NAO altera a tabela de leads.

```text
CREATE TABLE public.lead_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES campaign_leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  temperature text NOT NULL DEFAULT 'frio',
  priority_flag boolean NOT NULL DEFAULT false,
  abandonment_type text,  -- 'inicial', 'pos_orcamento', 'pos_visita', 'inativo'
  intent_tags jsonb DEFAULT '[]'::jsonb,
  last_customer_message_at timestamptz,
  last_agent_message_at timestamptz,
  followup_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id)
);

-- Index para queries de priorizacao
CREATE INDEX idx_li_company_score ON lead_intelligence(company_id, score DESC);
CREATE INDEX idx_li_company_temp ON lead_intelligence(company_id, temperature);
```

**RLS**: Mesmas regras de `campaign_leads` -- usuarios veem dados de suas empresas.

---

## 4. Logica de Score (Database Function, NAO trigger)

Uma funcao `recalculate_lead_score(lead_id uuid)` chamada via RPC pelo frontend ou por trigger em `campaign_leads.status` e `lead_history`.

### Mapeamento real dos campos existentes:

**Pontuacao positiva (baseada em dados reais):**

| Condicao | Campo fonte | Pontos |
|----------|-------------|--------|
| bot_data->>'proximo_passo' = '1' (visita) | wapi_conversations.bot_data | +30 |
| status = 'orcamento_enviado' | campaign_leads.status | +20 |
| status = 'em_contato' (visita) | campaign_leads.status | +15 |
| bot_data->>'proximo_passo' = '2' (duvidas) | wapi_conversations.bot_data | +10 |
| bot_data->>'mes' IS NOT NULL (informou data) | wapi_conversations.bot_data | +10 |
| bot_data->>'convidados' IS NOT NULL | wapi_conversations.bot_data | +10 |
| bot_step = 'complete_final' (completou fluxo) | wapi_conversations.bot_step | +10 |
| status = 'aguardando_resposta' (negociando) | campaign_leads.status | +10 |

**Pontuacao negativa (baseada em timestamps e historico):**

| Condicao | Campo fonte | Pontos |
|----------|-------------|--------|
| 24h sem msg do cliente | last_customer_message_at | -10 |
| 48h sem msg do cliente | last_customer_message_at | -20 |
| Pos orcamento sem resposta 48h | status + timestamps | -15 |
| 2+ follow-ups sem resposta | lead_history (action = 'Follow-up automatico enviado') | -20 |
| status = 'perdido' | campaign_leads.status | score = 0 |
| status = 'fechado' | campaign_leads.status | score = 100 |

**Temperatura derivada do score:**
- 0-20: frio
- 21-40: morno
- 41-70: quente
- 71-100: pronto

**abandonment_type derivado:**
- `inicial`: bot_step em ('welcome', 'nome', 'tipo') + 72h sem atividade
- `pos_orcamento`: status = 'orcamento_enviado' + 48h sem resposta
- `pos_visita`: status = 'em_contato' + 72h sem resposta
- `inativo`: qualquer status + 72h sem nenhuma mensagem

### Trigger para recalculo automatico:

```text
-- Trigger em campaign_leads AFTER UPDATE OF status
CREATE TRIGGER trg_recalc_score_on_status
AFTER UPDATE OF status ON campaign_leads
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_recalc_score();

-- Trigger em lead_history AFTER INSERT (para capturar follow-ups)
CREATE TRIGGER trg_recalc_score_on_history
AFTER INSERT ON lead_history
FOR EACH ROW
EXECUTE FUNCTION fn_trigger_recalc_score_from_history();
```

A funcao `fn_trigger_recalc_score()` chama internamente `recalculate_lead_score(NEW.id)`.

---

## 5. Tela Unica com 3 Tabs

**Rota**: `/inteligencia`
**Componente**: `src/pages/Inteligencia.tsx`
**Guard**: Verifica `modules.inteligencia` e `hasPermission('ic.view')`

### Tab 1: Prioridades

3 blocos visuais (cards agrupados):

**Atender Agora** (score > 60 OU proximo_passo = visita OU status = orcamento_enviado):
- Lista de leads com nome, score, temperatura (badge colorido), tempo sem resposta
- Botao "Abrir Chat" (navega para `/atendimento` com filtro)

**Em Risco** (abandonment_type != null E status nao e fechado/perdido):
- Leads com abandono detectado
- Mostra tipo de abandono e dias parado

**Frios** (score < 20 E status nao e fechado/perdido):
- Leads com baixa probabilidade

### Tab 2: Funil

Contagem por status existente (reutiliza LEAD_STATUS_LABELS):
```text
novo -> em_contato -> orcamento_enviado -> aguardando_resposta -> fechado
                                                                -> perdido
```
Barra visual mostrando conversao entre etapas e onde ha maior queda.

### Tab 3: Leads do Dia

Tabela com leads criados/atualizados hoje:
- Nome, Score, Temperatura, Status, Intencao (intent_tags), Tempo sem resposta
- Reutiliza componentes de `LeadsTable` onde possivel
- Botao exportar (se `ic.export`)

---

## 6. Regras de Seguranca

O modulo Inteligencia:
- PODE: Ler campaign_leads, wapi_conversations, lead_history (via JOINs no banco)
- PODE: Inserir/atualizar registros em lead_intelligence
- NAO PODE: Alterar campaign_leads, wapi_conversations, wapi_bot_settings, ou qualquer tabela operacional
- NAO PODE: Enviar mensagens ou disparar acoes

A funcao de score roda com SECURITY DEFINER para poder ler across tables.

---

## 7. Arquivos a Criar/Editar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela lead_intelligence, funcoes de score, triggers, permissoes |
| src/hooks/useCompanyModules.ts | Adicionar `inteligencia` |
| src/components/admin/AdminSidebar.tsx | Adicionar item menu condicional |
| src/pages/Inteligencia.tsx | Nova pagina com 3 tabs |
| src/components/inteligencia/PrioridadesTab.tsx | Tab de prioridades |
| src/components/inteligencia/FunilTab.tsx | Tab de funil |
| src/components/inteligencia/LeadsDoDiaTab.tsx | Tab de leads do dia |
| src/hooks/useLeadIntelligence.ts | Hook para buscar dados de lead_intelligence |
| src/App.tsx | Adicionar rota /inteligencia |

---

## 8. Performance

- Score recalculado APENAS por trigger (mudanca de status ou novo historico)
- Queries de listagem usam indice em (company_id, score DESC)
- Frontend usa React Query com staleTime de 60s
- Nao ha job periodico no MVP -- triggers sao suficientes
- Para o campo `last_customer_message_at`, populado via trigger em wapi_conversations quando nova mensagem chega (ou via batch inicial)

---

## 9. Sequencia de Implementacao

1. Migracao SQL (tabela + funcoes + triggers + permission_definitions)
2. useCompanyModules + AdminSidebar (toggle + menu)
3. Pagina /inteligencia com Tab Prioridades
4. Tab Funil + Tab Leads do Dia
5. Batch inicial para popular lead_intelligence dos leads existentes

Total estimado: 2-3 prompts de implementacao.

