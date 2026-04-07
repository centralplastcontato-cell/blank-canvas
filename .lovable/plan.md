

## Plano: Corrigir Valores Bruto vs Líquido e Cálculo de Taxa de Cartão

### Problema Identificado

Existem 3 problemas inter-relacionados:

1. **Contrato mostra valor errado**: O `total_value` salvo no banco já é o valor COM desconto de cartão (líquido). Deveria salvar o valor BRUTO (R$ 6.890) para contratos e exibição ao cliente.

2. **Faturamento/Festas Fechadas mostra valor errado**: Na Agenda, "Faturamento Fechado no Mês" e os cards de festas usam `total_value` que hoje é o valor BRUTO (sem taxa de cartão). Mas no Financeiro, os pagamentos já são salvos com valor líquido. Há inconsistência — o valor exibido nas festas fechadas deveria refletir o valor do contrato (bruto), enquanto o financeiro trabalha com o líquido.

3. **EventFinancialTab calcula taxa errada**: Na linha 249, o número de parcelas para o cálculo da taxa é derivado do número de `event_payments` do tipo "parcela" — e não do número real de parcelas no cartão (que vem de `payment_details.entrada_parcelas` ou `payment_details.parcelas`). Resultado: exibe taxa de 1x (2.69%) ao invés de 5x (5.49%).

### Solução

**Princípio**: `total_value` no banco = valor BRUTO do contrato (R$ 6.890). Taxas de cartão são tratadas apenas no módulo financeiro como "valor não arrecadado".

#### 1. EventFinancialTab — Corrigir cálculo de taxa de cartão
**Arquivo**: `src/components/financial/EventFinancialTab.tsx`

- Buscar `payment_details` do evento para extrair `entrada_parcelas` e `parcelas` (parcelas do saldo no cartão).
- No `useMemo` do `cardFeeLoss`, usar esses valores reais ao invés de contar `event_payments`.
- Para entrada: usar `payment_details.entrada_parcelas`.
- Para saldo/parcela: usar `payment_details.parcelas`.

#### 2. EventFinancialTab — Exibir valor BRUTO na seção de taxa
**Arquivo**: `src/components/financial/EventFinancialTab.tsx`

- No card de "Taxas de Cartão", calcular o desconto sobre o valor BRUTO (que está em `payment_details.entrada_valor` e `payment_details.saldo_valor`), não sobre o `p.amount` que já é líquido.
- Exibir: "Entrada: R$ 6.890,00 × 5.49% = -R$ 378,26" (usando o bruto original).

#### 3. Garantir consistência no `total_value` salvo
**Arquivo**: `src/components/agenda/EventFormDialog.tsx`

- Confirmar que `grandTotal` (que vira `total_value`) é o valor BRUTO incluindo opcionais e descontos comerciais, mas SEM dedução de taxa de cartão. Hoje já funciona assim — o `grandTotal` não desconta taxa de cartão, apenas o `syncPaymentDetails` salva os pagamentos com valor líquido. Verificar e manter.

#### 4. Financeiro Dashboard — Manter valores líquidos nos pagamentos
**Arquivo**: `src/hooks/useFinanceiroDashboard.ts`

- Os `event_payments` já salvam valores líquidos (correto para bater com o banco).
- Sem alteração necessária aqui — o valor que vai pro banco já é o líquido.

### Resumo Visual

```text
┌──────────────────────────────────────────────┐
│ CONTRATO / AGENDA / FESTAS FECHADAS          │
│ → Exibe total_value = R$ 6.890 (BRUTO)       │
│   (valor do pacote + opcionais - desconto)   │
├──────────────────────────────────────────────┤
│ FINANCEIRO (event_payments)                  │
│ → Parcela salva = R$ 6.511,74 (LÍQUIDO)      │
│   (bruto - taxa cartão 5x)                  │
├──────────────────────────────────────────────┤
│ EventFinancialTab                            │
│ → Valor Total = R$ 6.890 (baseValue=bruto)   │
│ → Parcela mostrada = R$ 6.511,74 (líquido)   │
│ → Card: "Taxa 5x: 5.49% = -R$ 378,26"       │
│   (calculado sobre o BRUTO da payment_details)│
└──────────────────────────────────────────────┘
```

### Arquivos a alterar

1. **`src/components/financial/EventFinancialTab.tsx`** — Buscar `payment_details` do evento, corrigir cálculo do `cardFeeLoss` para usar parcelas reais e valores brutos.
2. **`src/hooks/useEventFinancial.ts`** — Sem alteração (já calcula summary sobre `baseValue` que é o bruto).

### Sem impacto em dados existentes
- O `total_value` salvo hoje já é o valor bruto (grandTotal no form). 
- Os `event_payments` já salvam o líquido.
- A correção é apenas na **exibição** da taxa no `EventFinancialTab`.

