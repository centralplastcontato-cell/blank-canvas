

## Desconto no formulário de evento

### Problema atual
O buffet precisa aplicar descontos diretamente no formulário da festa, mas hoje não existe esse campo. O único recurso de desconto está na aba financeira (EventFinancialTab), que é separada e posterior ao cadastro do evento.

### Solução

Adicionar campos de desconto no **EventFormDialog**, na seção de Pagamento, com as seguintes capacidades:

1. **Tipo de desconto**: fixo (R$) ou percentual (%)
2. **Valor do desconto**: campo numérico
3. **Base de cálculo**: opção para o buffet escolher se o desconto incide sobre:
   - **Valor do pacote apenas** (sem opcionais)
   - **Valor total** (pacote + opcionais)
4. **Motivo** (opcional): campo texto livre para registrar o porquê do desconto

### Cálculo do grandTotal

Hoje: `grandTotal = total_value + optionalsSubtotal`

Novo:
```text
Se base = "pacote":
  descontoValor = tipo == "percentage" ? (total_value * valor / 100) : valor
  grandTotal = (total_value - descontoValor) + optionalsSubtotal

Se base = "total":
  subtotal = total_value + optionalsSubtotal
  descontoValor = tipo == "percentage" ? (subtotal * valor / 100) : valor
  grandTotal = subtotal - descontoValor
```

O saldo devedor e parcelas continuam sendo recalculados automaticamente a partir do novo `grandTotal`.

### Detalhes técnicos

**Arquivo 1: `src/components/agenda/EventFormDialog.tsx`**
- Adicionar campos à interface `EventFormData`:
  - `discount_type?: 'fixed' | 'percentage' | null`
  - `discount_value?: number | null`
  - `discount_base?: 'pacote' | 'total' | null` (default: `'total'`)
  - `discount_reason?: string | null`
- Atualizar `EMPTY` com os defaults (todos `null`)
- Atualizar cálculo de `grandTotal` para considerar o desconto
- Na seção de Pagamento, entre "Valor da festa / Valor total" e "Forma de pagamento", adicionar um bloco de desconto com:
  - Toggle ou botão "+ Aplicar Desconto" para revelar os campos (manter a UI limpa)
  - Select tipo (R$ / %), input valor, select base (Pacote / Total), input motivo
  - Exibição do valor calculado do desconto e o novo total
- Persistir os campos no `payment_details` JSONB ou diretamente no `EventFormData` (que já é salvo como JSONB em `company_events`)

**Arquivo 2: `src/components/financial/EventFinancialTab.tsx`**
- Ao fazer auto-sync, considerar o desconto já embutido no `total_value` salvo (pois o `grandTotal` com desconto já é o que é persistido como `total_value`)
- Nenhuma mudança estrutural necessária, pois o valor final já vem calculado

**Arquivo 3: Contratos (`template-resolver.ts`)**
- Adicionar variável `{{desconto}}` para uso em contratos, mostrando o desconto aplicado

### UI proposta

Na seção Pagamento, após os campos de valor:

```text
┌──────────────────────────────────────────┐
│ Valor da festa: R$ 7.525,00              │
│ + Opcionais:    R$ 0,00                  │
│                                          │
│ [+ Aplicar Desconto]                     │
│ ┌──────────────────────────────────────┐ │
│ │ Tipo: [R$ ▾]  Valor: [325,00]       │ │
│ │ Incide sobre: [Valor total ▾]       │ │
│ │ Motivo: [Cortesia aniversário]      │ │
│ │ Desconto: -R$ 325,00               │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Valor total: R$ 7.200,00                │
└──────────────────────────────────────────┘
```

### Impacto
- Desconto fica registrado nos dados do evento para auditoria
- O `total_value` salvo já reflete o valor com desconto
- Parcelas e saldo devedor se ajustam automaticamente
- Financeiro recebe o valor correto sem necessidade de ajuste manual
- Dados históricos não são afetados

