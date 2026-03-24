

## Plano: Distribuição de Leads entre "Vendas 1" e "Vendas 2" com Controle de Modo

### Conceito

Internamente, as duas instâncias WhatsApp da empresa passam a se chamar **Vendas 1** (número antigo do Manchester) e **Vendas 2** (número atual do Trujillo). Ambas atendem a unidade Trujillo. Um seletor nas Configurações de WhatsApp permite escolher entre:

- **Automático (Round-Robin)** — alterna leads entre as duas instâncias
- **Apenas Vendas 1** — só o número antigo do Manchester recebe leads da LP
- **Apenas Vendas 2** — só o número atual do Trujillo recebe leads da LP

Leads já vinculados a uma instância continuam isolados nela (follow-ups, bot, mensagens automáticas).

---

### Etapa 1 — Banco de Dados

**1a. Adicionar coluna `lead_routing_mode` em `lp_bot_settings`**

```sql
ALTER TABLE lp_bot_settings 
  ADD COLUMN lead_routing_mode text NOT NULL DEFAULT 'auto';
-- Valores: 'auto' | 'vendas1' | 'vendas2'
```

**1b. Adicionar coluna `lead_routing_counter` em `lp_bot_settings`**

```sql
ALTER TABLE lp_bot_settings 
  ADD COLUMN lead_routing_counter integer NOT NULL DEFAULT 0;
```

Esse contador será incrementado a cada lead para alternar (par → Vendas 1, ímpar → Vendas 2).

**1c. Desativar a unidade Manchester em `company_units`** (via INSERT tool — UPDATE)

```sql
UPDATE company_units SET is_active = false WHERE name = 'Manchester' AND company_id = 'a0000000-0000-0000-0000-000000000001';
```

**1d. Renomear instâncias em `wapi_instances`** (via INSERT tool — UPDATE)

- Instância com unit = 'Manchester' → `unit = 'Vendas 1'`
- Instância com unit = 'Trujillo' → `unit = 'Vendas 2'`

**1e. Criar duas novas unidades em `company_units`** (ou renomear as existentes)

As unidades `Vendas 1` e `Vendas 2` precisam existir em `company_units` para que `wapi-send` resolva a instância pelo campo `unit`. Essas unidades serão internas (não aparecerão na LP para o cliente escolher — o lead ainda vê "Trujillo").

---

### Etapa 2 — Edge Function `submit-lead`

Após validar e antes de inserir/atualizar o lead, a função resolve qual instância receberá a mensagem:

1. Buscar `lp_bot_settings` para o `company_id` → ler `lead_routing_mode` e `lead_routing_counter`
2. Se `auto` → incrementar counter, par = 'Vendas 1', ímpar = 'Vendas 2'
3. Se `vendas1` → fixo 'Vendas 1'
4. Se `vendas2` → fixo 'Vendas 2'
5. Gravar a unidade resolvida no campo `unit` do lead (para que o CRM e o chat fiquem vinculados à instância correta)
6. Retornar a `resolved_unit` na resposta JSON para o frontend saber para qual instância enviar a welcome message

---

### Etapa 3 — Frontend: `LeadChatbot.tsx`

Ajustar o fluxo para:

1. O lead continua vendo "Trujillo" como unidade (UX não muda)
2. Após o `submit-lead`, ler a `resolved_unit` da resposta
3. Usar essa `resolved_unit` (ex: "Vendas 1") no `sendWelcomeMessage` ao invés do nome visível da unidade

Mudança localizada: ~5 linhas no `handleInputSubmit`.

---

### Etapa 4 — Configurações: Card de Distribuição de Leads

Adicionar um card na seção **LP Bot** (`LPBotSection`) ou **Automações** (`AutomationsSection`) com:

- Título: "Distribuição de Leads da Landing Page"
- Um `Select` com 3 opções:
  - `Automático (Round-Robin)` — valor `auto`
  - `Apenas Vendas 1` — valor `vendas1`  
  - `Apenas Vendas 2` — valor `vendas2`
- Salva em `lp_bot_settings.lead_routing_mode`

---

### Etapa 5 — Atualizar `get_lp_bot_settings_public`

Adicionar `lead_routing_mode` ao retorno da função SQL pública para que o frontend (se necessário) ou o `submit-lead` possam consultá-lo.

---

### Resumo de Arquivos Modificados

| Arquivo | Ação |
|---|---|
| Migration SQL | Adicionar 2 colunas em `lp_bot_settings` |
| `supabase/functions/submit-lead/index.ts` | Resolver routing mode + retornar `resolved_unit` |
| `src/components/landing/LeadChatbot.tsx` | Usar `resolved_unit` da resposta no envio da welcome |
| `src/components/whatsapp/settings/LPBotSection.tsx` | Adicionar card de seleção de modo |
| DB function `get_lp_bot_settings_public` | Incluir `lead_routing_mode` no retorno |
| Data updates (INSERT tool) | Renomear instâncias, desativar Manchester, criar unidades internas |

### O que NÃO muda

- Estrutura de `wapi_instances`, `wapi_conversations`, `wapi_messages`
- Lógica de follow-up, bot, conexão — tudo continua isolado por instância
- A LP para o cliente final — ele continua vendo "Trujillo"

