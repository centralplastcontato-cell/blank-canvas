

## Plano: Truncar nomes longos nos materiais para corrigir overflow mobile

### Problema
Nomes longos de materiais (ex: "Combo Aventura Kids! Fechando o pacote Ave...") empurram os botões de ação (switch, editar, excluir) para fora da tela no mobile. A linha inteira cresce além do viewport.

### Causa raiz
O container externo do item (linha 96) não tem `overflow-hidden`, permitindo que o conteúdo extrapole a largura da tela.

### Correção (1 arquivo)

**`src/components/whatsapp/settings/SalesMaterialsSection.tsx`**
- Adicionar `overflow-hidden` no div externo do `SortableMaterialItem` (linha 96)
- Isso garante que o `truncate` no nome do material (linha 120) funcione corretamente em conjunto com `min-w-0 flex-1` (linha 119), e os botões `shrink-0` (linha 131) permaneçam visíveis e fixos à direita

