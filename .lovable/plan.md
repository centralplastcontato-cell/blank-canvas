

# Corrigir espaçamento do formulário EventFormDialog

## Problema
Os campos do formulário estão muito próximos uns dos outros no mobile -- os labels ficam encostados nos inputs do grupo anterior, prejudicando a legibilidade.

## Solução

Duas mudanças simples no `EventFormDialog.tsx`:

1. **Aumentar o espaçamento entre grupos de campos**: trocar `space-y-4` (16px) para `space-y-5` (20px) no form
2. **Adicionar gap interno entre Label e Input**: adicionar `space-y-1.5` (6px) em cada div que contém Label + Input, para que o label não fique colado no campo

### Arquivo editado

- `src/components/agenda/EventFormDialog.tsx`
  - Linha 179: `space-y-4` para `space-y-5`
  - Cada `<div>` dentro dos grids e campos individuais: adicionar `className="space-y-1.5"` para dar respiro entre label e input
  - Nos grids de 2 colunas (`grid grid-cols-2 gap-3`): manter o gap horizontal, mas cada coluna interna ganha `space-y-1.5`

Resultado: formulário com respiro visual adequado entre cada seção e entre labels e seus campos.
