# Múltiplas formas de pagamento por festa

Permitir que uma festa seja dividida em **N blocos de pagamento**, cada um com sua própria forma, número de parcelas, valor e datas — por ex.: R$ 5.000 boleto 5x + R$ 5.000 cartão 5x (antecipado ou não), ou 3+ blocos misturando PIX, boleto e cartão.

## Princípios

- **Compatibilidade total** com festas já cadastradas: o modelo atual (Entrada + Saldo) continua funcionando e é migrado automaticamente para 1 ou 2 blocos.
- **Mesma lógica financeira já validada**: cada bloco gera suas `event_payments` reutilizando a engine atual (taxas de cartão, antecipado vs não-antecipado com `prazo_recebimento_dias`, parcelas líquidas mensais, `card_installments`, `parcelas_details` para boleto/PIX).
- **Selective sync preservado**: parcelas já pagas nunca são apagadas — apenas as pendentes são recriadas quando o usuário edita os blocos (regra já existente).
- **Sem mudar a aba Financeiro**: as parcelas continuam aparecendo como `event_payments` normais, com a coluna de status, baixa, parcial, etc. Só muda como elas são geradas no formulário do evento.

## Etapas (uma por vez, com validação visual no fim de cada)

### Etapa 1 — Modelo de dados e migração

- Adicionar coluna `payment_blocks jsonb` em `company_events` (array de blocos).
- Cada bloco: `{ id, label?, valor, forma, parcelas, parcelas_details?, card_installments?, antecipado_snapshot?, card_operator_id? }`.
- Backfill automático: para eventos existentes, gerar `payment_blocks` derivado de `entrada_* + saldo_*` (1 ou 2 blocos).
- Manter as colunas antigas por enquanto (fallback de leitura) — remoção fica para uma etapa futura.

### Etapa 2 — UI: editor de blocos no EventFormDialog

Substituir a seção "Entrada / Saldo" por uma lista de blocos:

```text
[ Bloco 1 ]  Valor R$ 5.000,00   Forma: Boleto   Parcelas: 5
             └ vencimentos: 1º 10/06, 2º 10/07, ...

[ Bloco 2 ]  Valor R$ 5.000,00   Forma: Cartão   Parcelas: 5
             └ Operadora: Stone (não antecipado, 30d)
             └ líquido por parcela: R$ 970,00

[ + Adicionar forma de pagamento ]

Total dos blocos: R$ 10.000,00  ✓ (bate com o total da festa)
```

- Validação em tempo real: soma dos blocos = total da festa (com mensagem clara se diferir).
- Botão "Dividir em 2 partes iguais" como atalho para o caso comum.
- Mostrar resumo de taxas/líquido por bloco (cartão) e datas geradas (boleto/PIX), igual ao que hoje aparece para Entrada/Saldo.

### Etapa 3 — Geração de parcelas a partir dos blocos

- Reescrever a função que cria `event_payments` para iterar sobre `payment_blocks` em vez de Entrada+Saldo.
- Para cada bloco, reusar exatamente o código atual:
  - Cartão antecipado / débito → 1 parcela líquida.
  - Cartão não antecipado → `splitNonAntecipadoInstallments` (já existe em `src/lib/cardFees.ts`).
  - Boleto / PIX / dinheiro → N parcelas via `parcelas_details`.
- Stamp `payment_method`, `card_installments`, `card_operator_id`, taxas — tudo como hoje.
- Notes nas parcelas: `"Bloco 2/2 — Cartão 5x Stone (parcela 3/5)"` para rastreabilidade.

### Etapa 4 — Selective sync e edição

- Ao editar os blocos de uma festa já existente, aplicar a mesma regra atual: parcelas com `status = paid` ficam intactas; pendentes são recriadas conforme os blocos novos.
- Se o usuário remove um bloco que já tem parcelas pagas, mostrar aviso claro e bloquear a exclusão (ou exigir confirmação que mantém o histórico).

### Etapa 5 — Compatibilidade e leitura

- Hooks de leitura (`useEventFinancial`, painéis de resumo, contratos, PDFs) passam a ler de `payment_blocks` quando existir; caem no modelo antigo (`entrada_* / saldo_*`) caso contrário.
- Variáveis de contrato (`{{forma_pagamento}}`, `{{parcelas}}`, etc.) ganham suporte a listar múltiplos blocos.

### Etapa 6 — Limpeza (opcional, futura)

- Após validação em produção, remover os campos antigos `entrada_*` / `saldo_*` e os caminhos de fallback.

## Detalhes técnicos

- Tipo TS central em `src/types/payment-blocks.ts` reutilizado por EventFormDialog, EventFinancialTab e hooks.
- Reuso de `calcCardFee` e `splitNonAntecipadoInstallments` em `src/lib/cardFees.ts` — nenhuma duplicação.
- Migração com `ALTER TABLE company_events ADD COLUMN payment_blocks jsonb` + backfill SQL idempotente.
- Sem impacto em RLS (mesma tabela, mesmo `company_id`).

## Fora de escopo

- Mudanças na aba Financeiro / dashboard / relatórios — continuam consumindo `event_payments` normalmente.
- Pagamentos parciais dentro de uma parcela — já existem e continuam funcionando.
- Integração com gateway de cartão real — fora do escopo desta feature.
