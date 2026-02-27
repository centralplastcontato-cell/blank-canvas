

## Corrigir Chatbot da LP + Resgatar 36 Leads Orfaos

### Resumo

O chatbot da Landing Page dinamica pula a pergunta de unidade e salva `unit = "Castelo da Diversao"` (nome da empresa). Isso impede o envio da mensagem de boas-vindas via WhatsApp, pois nao existe instancia vinculada a esse nome. 36 leads ficaram orfaos. A correcao envolve 3 partes:

1. Corrigir o chatbot para perguntar a unidade quando a empresa tem multiplas
2. Criar edge function para resgatar os 36 leads orfaos (todos para Trujillo)
3. Corrigir dados no banco (`company_onboarding.multiple_units`)

---

### Parte 1: Corrigir o Chatbot

**`src/pages/DynamicLandingPage.tsx`**
- Adicionar fetch de `company_units` (ativas, excluindo unidades internas como "Trabalhe Conosco") em paralelo com onboarding e bot settings
- Adicionar campo `unitNames: string[]` ao estado `LPData`
- Passar `unitOptions={data.unitNames}` como nova prop ao `LeadChatbot`

**`src/components/landing/LeadChatbot.tsx`**
- Adicionar prop `unitOptions?: string[]` na interface `LeadChatbotProps`
- No `useEffect` inicial (modo dinamico): se `unitOptions` tiver 2+ itens, mostrar pergunta de unidade (com "As duas" no final) como step 0, em vez de pular direto para o mes
- Se `unitOptions` tiver 0-1 itens, manter comportamento atual (pula unidade, usa `companyName`)
- Adicionar `case 0` no `handleOptionSelect` do modo dinamico para tratar selecao de unidade e avancar para o mes
- No `sendWelcomeMessage`: quando unidade = "As duas" no modo dinamico, enviar para todas as unidades (igual ao modo Castelo default, iterando sobre `unitOptions`)

O fluxo dinamico passara de:
```text
welcome -> month(step 1) -> day -> guests(step 2) -> capture(step 3)
```
Para (quando ha multiplas unidades):
```text
welcome -> unit(step 0) -> month(step 1) -> day -> guests(step 2) -> capture(step 3)
```

---

### Parte 2: Edge Function de Resgate

**`supabase/functions/rescue-orphan-leads/index.ts`** (novo arquivo)
- Endpoint POST protegido por autenticacao (verifica admin via `is_admin`)
- Busca leads com filtros rigorosos:
  - `company_id = 'a0000000-0000-0000-0000-000000000001'`
  - `unit = 'Castelo da Diversao'`
  - Sem `wapi_conversations` vinculada (`NOT EXISTS`)
- Para cada lead orfao:
  - Atualiza `campaign_leads.unit` para `'Trujillo'`
  - Envia mensagem de boas-vindas via `wapi-send` (action: `send-text`, unit: `Trujillo`, lpMode: true)
  - Registra em `lead_history` a acao de resgate
- Retorna relatorio JSON com total resgatado e eventuais erros

**`supabase/config.toml`**
- Adicionar `[functions.rescue-orphan-leads]` com `verify_jwt = false`

---

### Parte 3: Correcao de Dados

Usando o insert tool (nao migracao):
- `UPDATE company_onboarding SET multiple_units = true WHERE company_id = 'a0000000-0000-0000-0000-000000000001'`

---

### Sequencia de Execucao

1. Editar `LeadChatbot.tsx` (adicionar prop `unitOptions` e logica de step 0)
2. Editar `DynamicLandingPage.tsx` (fetch de `company_units` e passar prop)
3. Criar edge function `rescue-orphan-leads`
4. Atualizar `config.toml`
5. Deploy da edge function
6. Corrigir `company_onboarding.multiple_units` via insert tool
7. Executar a edge function para resgatar os 36 leads

