

## Permitir Edição de Nome em Contatos Não Qualificados

### Problema
Atualmente, o botão de editar nome (lápis) só aparece para leads já qualificados. Contatos não qualificados mostram o nome vindo do WhatsApp mas sem opção de alteração.

### Solução
Adicionar a funcionalidade de edição de nome também na view de "Contato não qualificado" do popover de informações.

### Alterações

**Arquivo:** `src/components/whatsapp/LeadInfoPopover.tsx`

1. Na seção "Contato não qualificado" (unqualified view), adicionar o mesmo mecanismo de edição inline que já existe para leads qualificados
2. No header, onde hoje mostra apenas "Contato não qualificado", adicionar o nome do contato com o botão de lápis ao lado
3. Ao salvar, atualizar o campo `contact_name` na tabela `wapi_conversations` (já que não existe registro em `campaign_leads`)
4. Chamar o callback `onLeadNameChange` para atualizar a UI em tempo real

### Detalhes Técnicos

Na view de contato não qualificado, transformar a seção de "Dados do Contato" para incluir edição inline:

```text
Antes:
  [icone erro] Contato não qualificado
               Clique em um status para classificar
  DADOS DO CONTATO
    Barbara (texto estático)

Depois:
  [icone erro] Contato não qualificado
               Clique em um status para classificar
  DADOS DO CONTATO
    Barbara [lápis]  (clicável para editar inline)
```

A lógica de salvar será semelhante à existente, mas atualizando apenas `wapi_conversations.contact_name` (sem tocar em `campaign_leads`, que não existe ainda).

