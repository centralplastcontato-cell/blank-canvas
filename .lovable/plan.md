

## Correcao do Responsivo - Hub Materiais

### Problema
Os cards de materiais estao sendo cortados na borda direita no mobile. Botoes mostram texto truncado ("Enviar a...", "Substitui...") e o conteudo extrapola a tela. A imagem 4 (Planeta Divertido) mostra o layout correto desejado, com cards ocupando toda a largura e texto dos botoes visivel.

### Causa raiz
O componente `SidebarInset` com `flex-1` nao limita a largura adequadamente no mobile. Falta `min-w-0` no container flex filho, fazendo com que o conteudo empurre alem da tela. Alem disso, o `MaterialCard` pode ter o texto do nome do material forçando largura excessiva.

### Solucao

**Arquivo: `src/pages/HubMateriais.tsx`**

1. Adicionar `min-w-0` ao container principal para garantir que o flex child respeite os limites do pai
2. Garantir que o grid de cards nao use 2 colunas em telas pequenas (manter `sm:grid-cols-2` em vez de aplicar em breakpoints menores)
3. No `MaterialCard`, adicionar `overflow-hidden` ao Card para evitar estouro, e garantir que o nome do material use `truncate` corretamente
4. Garantir que o botao de upload tenha texto que caiba na largura

**Mudancas especificas:**

- Container raiz: `space-y-4 overflow-hidden` -> `space-y-4 min-w-0 overflow-hidden`
- Grid de filtros: adicionar `min-w-0` para evitar que o Select expanda alem do limite
- `MaterialCard` (`Card`): adicionar `overflow-hidden min-w-0` 
- Botao de upload: texto responsivo - "Enviar" no mobile vs "Enviar arquivo" em telas maiores, usando `<span className="hidden sm:inline">` para o texto completo

Essas correcoes vao garantir que todos os cards, independente da empresa selecionada, respeitem a largura da tela no mobile, exatamente como na imagem 4.

