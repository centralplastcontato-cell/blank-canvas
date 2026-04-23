

## Correção: Pendente de R$ 0,01 residual por arredondamento

### Problema

O ajuste de taxas de cartão em `EventFinancialTab.tsx` tem dois pontos que permitem centavos residuais:

1. **Linha 639**: Se `unaccountedFees <= 0.01`, retorna o summary original sem ajustar — mas isso significa que R$ 0,01 de diferença nunca é corrigido.
2. **Linha 648**: O `adjustedPending` não é arredondado, então diferenças de ponto flutuante (ex: 0.0099999) podem aparecer como R$ 0,01.

### Solução

No `useMemo` do `adjustedSummary`:

1. Remover o early-return `if (unaccountedFees <= 0.01)` — permitir que qualquer diferença seja processada.
2. Arredondar `adjustedPending` para 2 casas decimais com `Math.round(x * 100) / 100`.
3. Se o resultado for ≤ 0.01, forçar para 0 e marcar como "pago".

### Arquivo alterado

`src/components/financial/EventFinancialTab.tsx` — somente o bloco `adjustedSummary` (linhas 629–651).

### Resultado esperado

Festa da Tayná: Pendente mostrará R$ 0,00 e status "Pago", sem centavos residuais.

