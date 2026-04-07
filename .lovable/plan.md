

## Melhorias no fluxo de pagamento por cartão

### Resumo

Três alterações principais no tratamento de pagamentos via cartão:

1. **Parcelas na entrada por cartão** — permitir informar quantas parcelas o cartão foi passado na entrada (hoje assume sempre 1x), e calcular a taxa correta baseada na qtd de parcelas
2. **Cartão não gera parcelas no financeiro** — quando entrada ou saldo é "cartão", o auto-sync NÃO deve criar linhas individuais de parcelas no financeiro (o cliente já passou o cartão, independente de ser 1x ou 12x)
3. **Baixa com valor líquido** — ao dar baixa em pagamento por cartão, o valor exibido e registrado deve ser o valor LÍQUIDO (após desconto da taxa), não o bruto

---

### Detalhes técnicos

**Arquivo 1: `src/components/agenda/EventFormDialog.tsx`**

- Adicionar campo `entrada_parcelas` ao `PaymentDetails` interface (default: 1)
- Quando `entrada_forma === "cartao"`, mostrar campo de "Parcelas do cartão" (input numérico 1-12) abaixo da entrada
- O cálculo da taxa na entrada já existente passa a usar `taxa_credito_${entrada_parcelas}x` em vez de fixo `taxa_credito_1x`
- Persistir `entrada_parcelas` no `payment_details` JSONB

**Arquivo 2: `src/components/financial/EventFinancialTab.tsx` (auto-sync)**

- Na lógica de auto-sync (linhas 66-144), ao inserir rows: se `pd.entrada_forma === "cartao"`, criar a linha de entrada com o **valor líquido** (bruto - taxa) e NÃO criar parcelas
- Se `pd.saldo_forma === "cartao"`, criar UMA única linha de parcela com o **valor líquido** e NÃO desmembrar em múltiplas parcelas
- Ambas as linhas devem ter `payment_method: "cartao"` para que o sistema saiba que já é valor líquido

**Arquivo 3: `src/hooks/useFinanceiroDashboard.ts` (backfill)**

- Mesma lógica: ao backfill de `payment_details` onde forma é "cartao", inserir com valor líquido e como parcela única

**Arquivo 4: `src/components/financial/EventFinancialTab.tsx` (mark as paid dialog)**

- No diálogo de "Confirmar Pagamento" (linhas 502-537), quando o pagamento tem `payment_method` contendo "cartao", calcular e exibir o valor líquido
- O valor mostrado ao operador já deve ser o líquido para ele saber exatamente quanto vai entrar na conta bancária

**Arquivo 5: `src/hooks/useEventFinancial.ts` (markAsPaid)**

- Ao registrar o pagamento como pago, se for cartão, considerar que o `amount` já é líquido (pois foi inserido assim pelo auto-sync)

### Impacto

- Entrada por cartão passa a respeitar parcelas e taxa correta
- Financeiro não cria parcelas desnecessárias para pagamentos em cartão
- Operador vê o valor real que entra na conta ao dar baixa
- Dados históricos não são afetados (apenas novos eventos)

