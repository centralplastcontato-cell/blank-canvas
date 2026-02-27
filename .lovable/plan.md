

## Criar Lead Manualmente pelo Chat do WhatsApp

### O que sera feito
Um botao "Novo Contato" na interface do chat que permite o usuario criar um lead do zero, informando nome e telefone. O contato aparecera na lista de conversas como qualquer outro, porem sem mensagens. Todas as funcionalidades ficam disponiveis: enviar mensagem, ativar bot, classificar status, etc.

### Fluxo do usuario
1. Na lista de conversas, o usuario clica no botao "+" ou "Novo Contato"
2. Abre um dialog pedindo: **Nome** e **Telefone (WhatsApp)**
3. Ao confirmar, o sistema:
   - Verifica se ja existe conversa com esse telefone na instancia selecionada
   - Cria o registro em `campaign_leads` (status "novo", campaign_id "manual")
   - Cria o registro em `wapi_conversations` vinculado ao lead
   - O contato aparece no topo da lista de conversas
   - O usuario pode iniciar conversa, ativar bot, etc.

### Detalhes tecnicos

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

1. **Novos estados** (~linha 246):
   - `showCreateContactDialog: boolean`
   - `newContactName: string`
   - `newContactPhone: string`
   - `isCreatingContact: boolean`

2. **Funcao `handleCreateContact`**:
   - Normaliza o telefone (remove caracteres nao-numericos)
   - Verifica duplicata: busca `wapi_conversations` pela instancia + `contact_phone`
   - Se ja existe, mostra toast informando e seleciona a conversa existente
   - Se nao existe:
     - Insere em `campaign_leads` via `insertSingleWithCompany` (name, whatsapp, unit, status: "novo", campaign_id: "manual", campaign_name: "Criado Manualmente")
     - Insere em `wapi_conversations` (instance_id, remote_jid: `{phone}@s.whatsapp.net`, contact_phone, contact_name, lead_id, company_id, bot_enabled: false)
     - Registra em `lead_history` (action: "Lead criado manualmente")
     - Adiciona a conversa ao estado local e a seleciona automaticamente
   - Fecha o dialog e limpa os campos

3. **Botao na UI** - Adicionar um botao "+" ao lado da barra de busca na lista de conversas (tanto mobile quanto desktop), que abre o dialog

4. **Dialog de criacao** - Um `Dialog` simples com:
   - Input para Nome (obrigatorio, min 2 caracteres)
   - Input para Telefone com mascara (obrigatorio, formato brasileiro)
   - Botoes Cancelar e Criar
   - Validacao basica antes de submeter

### O que NAO muda
- Nenhuma migration necessaria (usa tabelas existentes `campaign_leads` e `wapi_conversations`)
- Nenhuma edge function nova
- O contato criado funciona identicamente a qualquer outro: pode receber mensagens, ter bot ativado, ser transferido, etc.

