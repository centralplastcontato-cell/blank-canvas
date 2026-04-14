

# Adicionar Confirmação ao Excluir Sub-Pagamento

## Situação Atual

O botão de excluir sub-pagamento **já existe** (linha 875 do `EventFinancialTab.tsx`) e a função `deletePartialPayment` **já funciona** no hook. Porém, ao clicar no ícone de lixeira, a exclusão acontece imediatamente sem nenhuma confirmação.

## O que será feito

Adicionar um `AlertDialog` de confirmação antes de executar a exclusão, mostrando o valor do sub-pagamento e pedindo confirmação. Após exclusão, o saldo é recalculado automaticamente (isso já acontece no hook existente).

### Mudança única — `EventFinancialTab.tsx`

1. Adicionar estado `deleteEntryTarget` para controlar qual entry está sendo confirmado para exclusão
2. Trocar o `onClick` direto do botão de lixeira para abrir o `AlertDialog` com os dados do entry
3. Renderizar um `AlertDialog` com:
   - Título: "Excluir pagamento parcial?"
   - Descrição: "Valor: R$ X,XX — Esta ação não pode ser desfeita. O saldo da parcela será recalculado."
   - Botões: "Cancelar" e "Excluir"
4. No "Excluir", chamar `financial.deletePartialPayment(id)` (que já faz recálculo + timeline + toast)

### Arquivo afetado

| Arquivo | Mudança |
|---------|---------|
| `src/components/financial/EventFinancialTab.tsx` | Estado + AlertDialog de confirmação antes de deletar entry |

Nenhuma mudança no hook, banco de dados ou outros componentes — tudo já está pronto, falta apenas a confirmação visual.

