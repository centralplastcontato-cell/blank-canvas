

## Correção: Lead (contato) nao esta sendo excluido junto com a conversa

### Problema Identificado

Quando voce clica em "Excluir", a conversa e as mensagens sao removidas com sucesso (apos as correcoes anteriores). Porem, o **lead do CRM** (o "contato") permanece no sistema.

Isso acontece porque o codigo so exclui o lead se ele estiver vinculado a conversa (variavel `linkedLead`). Se esse vinculo nao existir no momento da exclusao -- por exemplo, porque a conversa nao tem `lead_id` ou a busca automatica por telefone nao encontrou correspondencia -- o lead nao e removido.

### Solucao

Modificar a logica de exclusao para garantir que o lead seja encontrado e removido mesmo que `linkedLead` esteja vazio:

1. **Antes de excluir**, se `linkedLead` for null mas a conversa tiver `contact_phone`, buscar o lead correspondente na tabela `campaign_leads` pelo numero de telefone
2. Se encontrar um lead correspondente, exclui-lo junto com seu historico
3. Tambem verificar se a conversa tinha um `lead_id` original (antes do `update` que seta null) e usar esse ID diretamente

### Detalhes Tecnicos

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`

**Alteracao na funcao `handleDeleteLeadFromChat`:**

```
Antes do bloco if (linkedLead), adicionar:

1. Se linkedLead for null, verificar selectedConversation.lead_id
2. Se tiver lead_id, buscar o lead diretamente por ID
3. Se nao tiver lead_id, buscar por contact_phone na campaign_leads
4. Usar o lead encontrado para fazer a exclusao
```

Isso garante que mesmo quando a variavel de estado `linkedLead` nao foi preenchida (ex: a conversa foi selecionada rapidamente e o fetch nao completou), o lead sera localizado e removido antes de excluir a conversa.

**Nenhuma alteracao de banco de dados necessaria** -- apenas logica no frontend.

