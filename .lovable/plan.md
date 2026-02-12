

# Historico Completo do Chat na Transferencia de Leads

## Problema Identificado

Atualmente, quando um lead e transferido:
- Apenas o `responsavel_id` do lead e atualizado na tabela `campaign_leads`
- A conversa (`wapi_conversations`) permanece vinculada ao `instance_id` original
- As mensagens (`wapi_messages`) permanecem vinculadas ao `conversation_id` original
- Se o usuario que recebeu a transferencia nao tem acesso a mesma instancia/unidade, ele **nao consegue ver a conversa nem o historico**

## Solucao Proposta

Ao transferir um lead, verificar se o usuario destino tem acesso a mesma instancia. Se nao tiver, **mover a conversa para uma instancia que o usuario destino tenha acesso**, mantendo todas as mensagens intactas (pois as mensagens sao vinculadas ao `conversation_id`, nao ao `instance_id`).

### Alteracoes em `src/components/whatsapp/WhatsAppChat.tsx`

Na funcao `handleTransferLead`, adicionar logica para:

1. **Buscar as instancias do usuario destino** -- consultar `wapi_instances` filtrando pelas unidades permitidas do usuario destino (via `user_permissions` com prefixo `leads.unit.`)
2. **Verificar se o usuario destino tem acesso a instancia atual da conversa** -- comparar o `instance_id` da conversa com as instancias acessiveis
3. **Se nao tiver acesso**, atualizar o `instance_id` da conversa (`wapi_conversations`) para uma instancia que o usuario destino tenha acesso
4. **Atualizar o `company_id` das mensagens** se necessario (caso a transferencia seja entre empresas diferentes)

### Fluxo da Transferencia Atualizado

```text
Transferir Lead
      |
      v
Atualizar campaign_leads.responsavel_id
      |
      v
Buscar instancias do usuario destino
      |
      v
Usuario destino tem acesso a instancia atual?
    /     \
  Sim      Nao
   |        |
   v        v
  Fim    Buscar instancia do usuario destino
            |
            v
         Atualizar wapi_conversations.instance_id
         para instancia do destino
            |
            v
           Fim
```

### Detalhes Tecnicos

**Passo 1**: Buscar permissoes de unidade do usuario destino:
- Consultar `user_permissions` com `permission LIKE 'leads.unit.%'` para o `selectedTransferUserId`
- Se tiver `leads.unit.all`, tem acesso a tudo
- Caso contrario, extrair os slugs das unidades (ex: `leads.unit.centro` -> `centro`)

**Passo 2**: Buscar instancias acessiveis:
- Consultar `wapi_instances` filtrando por `unit IN (unidades_do_usuario_destino)` e `company_id` da empresa atual

**Passo 3**: Mover a conversa:
- `UPDATE wapi_conversations SET instance_id = <nova_instancia> WHERE id = <conversation_id>`
- As mensagens (`wapi_messages`) nao precisam ser movidas pois sao vinculadas ao `conversation_id`

**Passo 4**: Atualizar a unidade do lead:
- `UPDATE campaign_leads SET unit = <unidade_nova_instancia> WHERE id = <lead_id>`

### Caso Especial

Se o usuario destino tiver permissao `leads.unit.all` ou ja tiver acesso a mesma instancia, nenhuma movimentacao de conversa e necessaria -- o comportamento atual ja funciona.

### Resultado Esperado

Apos a transferencia, o usuario destino abre o WhatsApp, ve a conversa na sua instancia/unidade e tem acesso ao **historico completo de mensagens** sem perda de dados.

