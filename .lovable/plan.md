

# Plano: Corrigir envio de formulário criando conversa duplicada

## Problema
Quando um formulário é enviado via WhatsApp (nas abas "Formulários" e "Informações Complementares" do evento), o sistema **não passa o `conversationId`** para a edge function `wapi-send`. Isso faz com que a função `findOrCreateConversation` procure a conversa usando a instância selecionada + telefone. Se a conversa original está em outra instância, ou se o formato do telefone difere ligeiramente, uma **nova conversa é criada** em vez de usar a existente.

## Causa raiz
- `EventFormsStatusPanel.tsx` (linha 488): envia `{ action, phone, message, instanceId }` sem `conversationId`
- `EventComplementaryTab.tsx` (linha 386): mesmo problema
- `SendBotDialog.tsx` (linha 116): mesmo problema
- Nenhum desses componentes consulta `wapi_conversations` para buscar a conversa existente do lead

## Solução
Antes de enviar, buscar a conversa existente do lead na tabela `wapi_conversations` usando o `lead_id` (mais confiável) ou o telefone normalizado, e passar o `conversationId` + `companyId` no body do `wapi-send`.

## Alterações

### 1. Criar helper reutilizável `findExistingConversation` (`src/lib/whatsappConversationHelper.ts`)
Função utilitária que:
- Recebe `leadId` (opcional) e `phone`
- Busca em `wapi_conversations` primeiro por `lead_id`, depois por `contact_phone` (com variantes de normalização brasileira)
- Retorna `{ conversationId, instanceId, companyId }` ou `null`

### 2. Atualizar `EventFormsStatusPanel.tsx`
- Importar o helper
- Antes de enviar, chamar `findExistingConversation(leadId, lead.whatsapp)`
- Se encontrar conversa existente, passar `conversationId` e `companyId` no body
- Usar o `instanceId` da conversa encontrada (evita mismatch de instância)

### 3. Atualizar `EventComplementaryTab.tsx`
- Mesma lógica: buscar conversa existente antes de enviar via `sendFormToHost`
- Passar `conversationId` no body do `wapi-send`

### 4. Atualizar `SendBotDialog.tsx`
- Para cada convidado, buscar conversa existente pelo telefone
- Passar `conversationId` quando encontrado

### Arquivos
- **Novo**: `src/lib/whatsappConversationHelper.ts`
- **Modificados**: `EventFormsStatusPanel.tsx`, `EventComplementaryTab.tsx`, `SendBotDialog.tsx`

### Detalhes técnicos
- A prioridade é buscar por `lead_id` (campo direto em `wapi_conversations`), pois é o match mais confiável
- Fallback por telefone com normalização (com/sem 9° dígito, com/sem DDI 55)
- Se nenhuma conversa for encontrada, o comportamento atual (criar nova) é mantido como fallback
- A instância da conversa existente é preferida sobre a instância genérica selecionada

