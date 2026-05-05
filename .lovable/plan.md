## Objetivo

Salvar o percentual da taxa da operadora no momento em que a parcela/entrada é registrada, para que o painel "Taxas de Cartão / Perdas" e o cálculo do Pendente sempre usem a taxa **da época** — não a taxa atual da operadora (que pode ter mudado).

## Boa notícia

As colunas necessárias **já existem** em `event_payments`:
- `card_fee_percent numeric`
- `card_operator_id uuid`
- `card_installments integer`
- `gross_amount numeric`

Não precisa migration de schema. O trabalho é só no frontend.

## Mudanças

### 1) `src/components/agenda/EventFormDialog.tsx` — congelar no `payment_details`

No `handleSubmit` e no auto-save, ao normalizar o `payment` antes de gravar em `company_events.payment_details`, adicionar:

- `entrada_taxa_percent` — percentual da operadora na hora, conforme método (crédito Nx → `taxa_credito_Nx`; débito → `taxa_debito`)
- `saldo_taxa_percent` — idem para o saldo
- `card_operator_id` e `card_operator_name` — qual operadora estava ativa

Aplicar tanto no `handleSubmit` (linhas ~1112-1122) quanto no auto-save (linhas ~1379-1388).

### 2) `src/components/financial/EventFinancialTab.tsx` — gravar nas parcelas auto-criadas

No bloco de auto-sync (`useEffect` linhas ~120-243) que cria as `event_payments` a partir do `payment_details`, popular nas linhas inseridas:
- `card_fee_percent` (do snapshot salvo no `payment_details`, com fallback à taxa atual)
- `card_operator_id`
- `card_installments`
- `gross_amount` (valor bruto antes da taxa)

Assim cada `event_payment` carrega seu próprio "selo" da taxa da época.

### 3) `src/components/financial/EventFinancialTab.tsx` — usar a taxa congelada no painel

No `useMemo cardFeeLoss` (linhas 600-666), trocar a leitura de `cardFees[0][taxa_credito_Nx]` por:

1. **Prioridade 1:** percentual congelado em `paymentDetails.entrada_taxa_percent` / `saldo_taxa_percent`
2. **Prioridade 2 (fallback legado):** taxa atual da operadora (comportamento de hoje), para eventos antigos que não tinham snapshot

Mostrar a operadora pelo nome congelado em `paymentDetails.card_operator_name` quando existir.

### 4) Compatibilidade com registros legados

Eventos antigos sem os campos congelados continuam funcionando exatamente como hoje (fallback à taxa atual). Não há quebra de dados — apenas eventos **novos** (e edições futuras de eventos antigos) passam a ter o snapshot.

## Resultado para a Cleitne

- Aumentar a taxa da Infinite hoje **não altera mais** a perda exibida nem o Pendente de festas antigas.
- Festas novas registram automaticamente a taxa do momento.
- Não precisa mais criar "Infinite 2" só para preservar histórico (continua sendo uma opção válida se quiser separar relatórios por operadora).

## Detalhes técnicos

```text
payment_details (jsonb em company_events) — adiciona:
├── card_operator_id        ← snapshot
├── card_operator_name      ← snapshot
├── entrada_taxa_percent    ← snapshot (numérico, ex.: 4.5)
└── saldo_taxa_percent      ← snapshot

event_payments — popula colunas existentes:
├── card_fee_percent        ← já existe
├── card_operator_id        ← já existe
├── card_installments       ← já existe
└── gross_amount            ← já existe
```

Sem migration. Sem mudança em RLS. Sem impacto em outras telas.
