
## Permitir renomear grupos no chat WhatsApp

### Problema
Grupos aparecem com nomes como "Grupo 120363424482346954" (o ID do grupo) e nao tem opcao de renomear. O popover do grupo so mostra favoritar e excluir.

### Solucao
Adicionar funcionalidade de edicao de nome no popover de grupo, reutilizando a mesma logica que ja existe para contatos nao qualificados (salvar em `wapi_conversations.contact_name`).

### Alteracoes em `src/components/whatsapp/LeadInfoPopover.tsx`

**1. Adicionar botao de edicao no GROUP VIEW (linhas 301-340)**

Substituir o nome fixo do grupo por um campo editavel, igual ao que ja existe para leads/contatos:
- Ao lado do nome do grupo, adicionar um botao de editar (icone Pencil)
- Ao clicar, trocar para um Input com botoes de confirmar/cancelar
- Ao salvar, atualizar `wapi_conversations.contact_name` e chamar `onLeadNameChange`

**2. Atualizar a funcao `saveLeadName`**

A funcao ja trata o caso de contato nao qualificado (linhas 232-267) que faz `update({ contact_name })` em `wapi_conversations`. Esse mesmo caminho sera usado para grupos, sem necessidade de mudanca na logica de save - apenas garantir que o fluxo de edicao do grupo chame `saveLeadName()`.

**3. Atualizar `startEditingName`**

Ajustar para tambem funcionar com grupos, inicializando `editedName` com o `contact_name` atual do grupo.

### Detalhes tecnicos

O GROUP VIEW (linhas 301-345) sera atualizado para:
- Mostrar o nome atual com um botao Pencil ao lado
- No modo edicao: Input + botoes Check/X (mesmo padrao visual dos outros modos)
- A logica de save ja existe no bloco `else` da funcao `saveLeadName` (linha 232) que atualiza apenas `wapi_conversations.contact_name`
- `handleKeyDown` (Enter/Escape) ja esta implementado e sera reutilizado
