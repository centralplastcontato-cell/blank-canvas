## Objetivo

Garantir que o nome editado pelo buffet (ex: "150526J Daniela/ Gael") seja a fonte da verdade, aparecendo em **todos os lugares** (chat, Kanban, CRM, relatórios) — e nunca seja sobrescrito pelo `pushName` do WhatsApp.

---

## Etapa 1 — Backfill seguro (105 leads)

**O que faz:** copia o nome do CRM (`campaign_leads.name`) para o chat (`wapi_conversations.contact_name`) **apenas** nos 105 casos onde é impossível o nome ter vindo do WhatsApp — ou seja, nomes que claramente foram digitados manualmente pelo buffet.

**Critérios de segurança (todos checados):**
- Nome contém `/` (ex: "Daniela/ Gael")
- Nome contém código alfanumérico (ex: "150526J", "P12-A")
- Nome tem mistura de letras + números no meio
- Nome contém `+` ou `-` separando partes

**Impacto:** chat passa a exibir o nome correto do buffet imediatamente. Os outros 1.937 casos ambíguos **não são tocados** (poderiam ser legítimos pushNames).

---

## Etapa 2 — Proteção contra sobrescrita futura

**2.1 — Webhook do WhatsApp (`wapi-webhook`)**
Mudar a lógica de atualização de `contact_name`: o `pushName` só preenche se o nome atual estiver **vazio, numérico ou for placeholder** (ex: "Lead WhatsApp"). Se o buffet já editou, o pushName é ignorado.

**2.2 — Edição manual no chat (LeadInfoPopover + WhatsAppChat)**
Quando o buffet edita o nome no chat, garantir que a alteração seja propagada para `campaign_leads.name` **mesmo quando o `linkedLead` ainda não foi carregado** (hoje há janela onde a sincronização falha).

**Resultado:** o nome editado pelo buffet vira a fonte única da verdade — aparece igual em chat, Kanban, CRM e relatórios.

---

## Ordem de execução

1. Rodar UPDATE da Etapa 1 (105 leads) — via insert-tool, sem migration
2. Ajustar `wapi-webhook` (Etapa 2.1)
3. Ajustar `LeadInfoPopover` + `WhatsAppChat` para garantir sync CRM ← chat (Etapa 2.2)
4. Validar com 2-3 leads de exemplo

Quer que eu siga?
