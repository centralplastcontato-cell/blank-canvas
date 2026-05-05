
## Problema

Hoje, ao lançar um pagamento no cartão (ex: R$ 5.000 em 10x), a plataforma cria **uma única parcela líquida** independentemente da operadora antecipar ou não. Para buffets que **não antecipam** (ex: cliente da Celebrei), isso impede o controle de recebimento mês a mês conforme a operadora deposita.

## Solução

Quando a operadora estiver com `antecipado = false`, gerar **N parcelas mensais** automaticamente, cada uma já com o valor líquido (taxa diluída) e a data correta de recebimento conforme o prazo da operadora.

## Mudanças

### 1. Banco — `company_card_fees`
Adicionar coluna nova:
- `prazo_recebimento_dias` (integer, default 30) — quantos dias após a venda cai a 1ª parcela; as demais somam +30 dias cada.

### 2. UI — `CardFeesManager` (Admin → Taxas de Cartão)
- Quando o switch "Recebimento antecipado" estiver **desligado**, mostrar campo novo: **"Prazo de recebimento da 1ª parcela (dias)"** com default 30.
- Texto explicativo: "Cada parcela seguinte será recebida 30 dias após a anterior."

### 3. Lógica de criação de parcela — `PaymentFormDialog.tsx` + handler do submit
Ao submeter um pagamento de cartão de crédito parcelado:

- Se operadora `antecipado = true` → comportamento atual (1 parcela líquida na data informada). **Sem mudança.**
- Se operadora `antecipado = false` e `installments > 1` → em vez de criar 1 `event_payments`, criar **N rows**:
  - `valor por parcela = (gross × (1 - taxa%/100)) / N` (arredondamento na última para fechar a soma)
  - `due_date` da parcela 1 = data da venda + `prazo_recebimento_dias`
  - `due_date` das parcelas 2..N = parcela 1 + 30 dias × (i-1)
  - Mesmas flags de cartão (operator_id, installments, fee_percent, gross_amount) replicadas em todas
  - `notes` automático: "Parcela 1/10 — Cartão 10x sem antecipação"

### 4. Standalone revenues (dashboard financeiro)
Mesmo comportamento aplicado ao fluxo de receita avulsa que já usa `calcCardFee` no `PaymentFormDialog`.

### 5. Edição/recálculo
- Ao editar uma parcela do grupo, **não** propagar para as outras (cada uma é independente, igual ao fluxo de parcelamento atual de eventos).
- Sync seletiva existente já preserva parcelas pagas — nada a fazer.

## Detalhes técnicos

- A coluna nova é nullable com default 30, então operadoras existentes seguem funcionando.
- O cálculo `calcCardFee` em `src/lib/cardFees.ts` ganha um helper novo `splitInstallments(calc, startDate, prazoDias)` que retorna `Array<{ amount, due_date }>` — usado tanto no event side quanto no standalone.
- Não mexe em nada do flag `antecipado=true` (comportamento atual preservado, conforme você pediu).

## Resultado esperado

Cliente Celebrei lança R$ 5.000 em 10x na Stone (sem antecipação, prazo 30 dias):
→ sistema cria **10 parcelas de ~R$ 482**, vencendo em 30, 60, 90... dias.
→ ele dá baixa em cada uma conforme o extrato da operadora.
