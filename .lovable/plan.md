

## Plan: Tornar o cabeçalho da conversa expansível no mobile

### O que será feito

No chat mobile, o bloco do cabeçalho da conversa (nome do contato + ícones de ação + painel de status) será envolvido em um `Collapsible`. Quando recolhido, apenas a linha principal (voltar, avatar, nome, info, fechar) permanece visível — os ícones de ação (Row 2) e o painel de status ficam ocultos, liberando espaço para as mensagens.

### Implementação

**Arquivo**: `src/components/whatsapp/WhatsAppChat.tsx`

1. Adicionar estado `isChatHeaderCollapsed` (inicia como `false`, expandido)
2. A Row 1 (back + avatar + nome + botões info/fechar) permanece **sempre visível** — é o trigger
3. Adicionar um pequeno chevron na Row 1 para indicar que é expansível
4. Envolver a Row 2 (ícones de ação) e o painel de status (linhas ~4649-4764) em `CollapsibleContent`
5. Quando recolhido: só aparece o nome do contato com chevron
6. Quando expandido: layout atual sem mudanças
7. Usar animação `animate-accordion-down/up` do `CollapsibleContent`

### Escopo

- Apenas o bloco mobile (dentro do `selectedConversation` mobile, linhas ~4573-4764)
- Desktop não é afetado
- O `Collapsible` já está importado no arquivo

