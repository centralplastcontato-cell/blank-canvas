

## Plano: Enviar contrato gerado via WhatsApp

### Problema
Após gerar um contrato, não existe forma de enviá-lo ao lead diretamente pela plataforma via WhatsApp. O usuário precisa baixar e enviar manualmente.

### Solução
Adicionar um botão "Enviar via WhatsApp" em dois pontos:
1. **ContractDocumentViewer** (visualizador do contrato) — botão no toolbar
2. **GeneratedContractsList** (lista de contratos) — botão em cada card

O envio será feito como **mensagem de texto formatada** com o conteúdo do contrato (já renderizado), usando a Edge Function `wapi-send` existente. O sistema localizará automaticamente a conversa do lead e a instância conectada.

### Fluxo
1. Usuário clica "Enviar via WhatsApp"
2. Sistema busca o lead vinculado ao contrato (via `lead_id` ou `event_id` → `campaign_leads`)
3. Busca o telefone do lead e a instância/conversa ativa
4. Envia o contrato como mensagem de texto formatada via `wapi-send`
5. Registra no audit log como `contract_sent_whatsapp`

### Alterações

**1. `ContractDocumentViewer.tsx`**
- Adicionar prop opcional `contractId`, `leadId`, `companyId`
- Adicionar botão "WhatsApp" no toolbar (ícone verde) ao lado de "Imprimir"
- Handler que busca telefone do lead, instância conectada e envia via `wapi-send`

**2. `GeneratedContractsList.tsx`**
- Adicionar botão "WhatsApp" em cada card de contrato (ao lado de Visualizar/Histórico)
- Mesma lógica de envio

**3. Lógica de envio (shared helper)**
- Criar helper `sendContractViaWhatsApp(companyId, leadId, contractContent, contractName)` em `contractAuditHelpers.ts`
- Busca telefone do lead em `campaign_leads`
- Busca instância conectada em `wapi_instances`
- Busca conversa existente em `wapi_conversations`
- Formata o contrato como texto limpo (strip HTML/markdown)
- Envia via `supabase.functions.invoke("wapi-send")`
- Registra audit log

**4. Atualizar `EventDetailSheet.tsx` / `EventContractDialog.tsx`**
- Passar `leadId` e `companyId` para o `ContractDocumentViewer` quando aberto

### O que NÃO muda
- Nenhuma alteração na infraestrutura do WhatsApp
- Usa apenas `wapi-send` existente (leitura + envio)
- Contratos sem lead vinculado simplesmente não mostram o botão

