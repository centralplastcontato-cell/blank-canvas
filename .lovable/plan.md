

## Permitir Mover Leads de Volta para "Novo"

### Problema
Atualmente existe um bloqueio intencional no Kanban que impede que leads sejam movidos de volta para o status "Novo" depois de saírem dele. Isso causa problemas quando um lead é movido por engano (como no seu caso).

### Solucao
Remover a restricao no componente `LeadsKanban.tsx` para permitir que leads voltem ao status "Novo" tanto por arrastar (drag-and-drop) quanto pelos botoes de seta (< >).

### Detalhes Tecnicos

**Arquivo: `src/components/admin/LeadsKanban.tsx`**

1. **Drag-and-drop** (linhas 76-80): Remover o bloco `if` que impede soltar leads na coluna "Novo"
2. **Botao de seta esquerda** (linhas 83-90): Alterar `getPreviousStatus` para permitir voltar ao index 0 ("novo"), mudando a condicao de `currentIndex > 1` para `currentIndex > 0`

Sao apenas 2 alteracoes pequenas no mesmo arquivo.

