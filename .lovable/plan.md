

## Plano: Redesign do banner "Lead quer tirar dúvidas"

### Mudanças

**1. Layout mais compacto**
- Remover exibição da unidade
- Botão "Abrir Chat" menor (icon-only ou `size="xs"`)
- Ícone do círculo menor (w-8 h-8)
- Padding reduzido (`py-2` em vez de `py-3`)

**2. Painel expandível com informações do lead**
- Ao clicar no banner (área do nome/título), expande uma seção abaixo com:
  - **Dados do lead**: nome, telefone, status no CRM, data de criação
  - **Última mensagem**: preview da última mensagem enviada pelo lead no WhatsApp
- Toggle com chevron para abrir/fechar
- Dados buscados do `campaign_leads` (via `conversation_id` → `wapi_conversations.lead_id`) e `wapi_messages` (última mensagem `from_me = false`)

**3. Fluxo de dados**
- Quando o banner aparece, faz fetch lazy (só ao expandir) de:
  - `wapi_conversations` pelo `conversation_id` → pega `lead_id`
  - `campaign_leads` pelo `lead_id` → nome, status, created_at
  - `wapi_messages` filtrado por `conversation_id`, `from_me = false`, order `timestamp desc`, limit 1 → conteúdo da última mensagem

### Arquivo alterado
| Arquivo | Mudança |
|---|---|
| `src/components/admin/QuestionsAlertBanner.tsx` | Layout compacto + painel expansível com dados do lead e última mensagem |

