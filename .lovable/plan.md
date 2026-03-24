

# Correção: Desligar robô quando lead é marcado como "Perdido"

## Problema
Quando um lead é marcado como "perdido" (automático ou manual), o bot do WhatsApp continua ativo na conversa (`bot_enabled: true`, `bot_step` ativo). Se o lead enviar uma mensagem depois, o bot responde com todo o material de vendas novamente.

## Correções (4 arquivos)

### 1. Auto-Lost no `follow-up-check` (Edge Function)
**Arquivo:** `supabase/functions/follow-up-check/index.ts`
- Após a linha 1291 (update do lead para "perdido"), adicionar update em `wapi_conversations` para o lead correspondente:
  - `bot_enabled: false`
  - `bot_step: 'human_takeover'`
- Buscar a conversa pelo `lead_id` e atualizar

### 2. Guard no `wapi-webhook` (Edge Function)
**Arquivo:** `supabase/functions/wapi-webhook/index.ts`
- No início da função `processBotQualification` (linha ~1912, após settings check), adicionar verificação:
  - Se `conv.lead_id` existe, buscar o status do lead em `campaign_leads`
  - Se status é `'perdido'`, fazer log e retornar sem processar o bot
- Isso funciona como defesa em profundidade caso o auto-lost não tenha desabilitado o bot

### 3. Mudança manual no `LeadDetailSheet`
**Arquivo:** `src/components/admin/LeadDetailSheet.tsx`
- Na função `handleSave`, após o update do lead (linha ~230), verificar se o novo status é `'perdido'`
- Se sim, buscar `wapi_conversations` pelo `lead_id` e atualizar `bot_enabled: false`, `bot_step: 'human_takeover'`

### 4. Mudança manual via `ConversationStatusActions`
**Arquivo:** `src/components/whatsapp/ConversationStatusActions.tsx`
- Na função `handleStatusChange`, após o update do lead (linha ~141), verificar se `newStatus === 'perdido'`
- Se sim, atualizar `wapi_conversations` com `bot_enabled: false`, `bot_step: 'human_takeover'` usando `conversation.id`

### 5. Mudança via Kanban/Table (Admin.tsx e CentralAtendimento.tsx)
**Arquivos:** `src/pages/Admin.tsx`, `src/pages/CentralAtendimento.tsx`
- Nos handlers inline de status change (onde fazem `supabase.from("campaign_leads").update`), adicionar a mesma lógica: se `newStatus === 'perdido'`, desabilitar bot na conversa vinculada

## Detalhes Técnicos

Query para desabilitar o bot:
```sql
UPDATE wapi_conversations 
SET bot_enabled = false, bot_step = 'human_takeover' 
WHERE lead_id = :lead_id
```

Guard no webhook:
```typescript
// No início de processBotQualification, após settings check:
if (conv.lead_id) {
  const { data: linkedLead } = await supabase
    .from('campaign_leads')
    .select('status')
    .eq('id', conv.lead_id)
    .single();
  if (linkedLead?.status === 'perdido') {
    console.log(`[Bot] Lead ${conv.lead_id} is perdido, skipping bot`);
    return;
  }
}
```

