

## Correção: Parcela fantasma pendente por taxa de cartão não registrada no gross_amount

### Problema

Quando uma parcela de cartão é paga mas foi criada **antes** do sistema salvar o `gross_amount` corretamente (registro legado), o campo `gross_amount` é igual ao `amount` (valor líquido). O cálculo de `pendingAmount` usa `totalAmount - clientPaidGross`, e como o `gross_amount` do pagamento legado não reflete o valor bruto real, sobra um saldo fantasma (ex: R$ 127,35 na festa Tayná).

O painel de "Taxas de Cartão" calcula a perda corretamente (lendo de `payment_details`), mas essa informação não é usada para ajustar o pendente nos cards de resumo.

### Solução

Ajustar o `summary` na `EventFinancialTab.tsx` antes de passá-lo para `FinancialSummaryCards`, descontando do pendente a parcela de taxa de cartão que não está refletida no `gross_amount` dos pagamentos.

### Alteração técnica

**Arquivo:** `src/components/financial/EventFinancialTab.tsx`

Após o cálculo de `cardFeeLoss` (linha ~626) e antes do `return` (linha ~628), criar um `adjustedSummary`:

1. Calcular `alreadyAccountedFees` = soma de `(gross_amount - amount)` para todos os pagamentos pagos que têm `gross_amount > amount` (taxas já refletidas no cálculo do hook).
2. Calcular `unaccountedFees` = `cardFeeLoss.totalLoss - alreadyAccountedFees` (taxas que o painel mostra mas que o hook não conseguiu deduzir por falta de `gross_amount` correto).
3. Criar `adjustedSummary` com `pendingAmount = max(0, summary.pendingAmount - unaccountedFees)` e `status` recalculado.
4. Passar `adjustedSummary` para `<FinancialSummaryCards>` ao invés de `financial.summary`.

Isso corrige tanto registros legados quanto futuros cenários onde `gross_amount` possa não estar preenchido.

### Resultado esperado

Na festa da Tayná: Pendente mostrará R$ 0,00 e status "Pago", pois ambas as parcelas estão pagas e a diferença de R$ 127,35 é explicada pela taxa de cartão da entrada.

