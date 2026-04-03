

## Ocultar detalhes de parcelas quando forma = Cartão

Compreendi perfeitamente. Quando o pagamento do **saldo** é no cartão, o cliente passa uma única vez e o parcelamento é feito pela operadora — não faz sentido exibir valor e data de cada parcela individualmente. O mesmo vale para a **entrada** no cartão.

### O que muda

**Arquivo:** `src/components/agenda/EventFormDialog.tsx`

**1. Seção de Saldo — Detalhes das parcelas (linhas ~1458-1525)**

Adicionar condição: o bloco "Detalhes das parcelas" só renderiza se `payment.saldo_forma !== "cartao"`. Quando for cartão, manter o campo de quantidade de parcelas (ex: "12x") mas esconder a expansão com valores e datas individuais.

**2. Seção de Entrada — mesma lógica**

A entrada normalmente não tem parcelas expandidas, mas caso haja alguma lógica futura, garantir que `entrada_forma === "cartao"` também não expanda detalhes.

### Lógica concreta

```text
Antes:
  {(payment.parcelas ?? 0) >= 1 && ( <DetalhesExpandidos /> )}

Depois:
  {(payment.parcelas ?? 0) >= 1 && payment.saldo_forma !== "cartao" && ( <DetalhesExpandidos /> )}
```

Também ocultar os botões "Mesmo dia" / "Dias diferentes" quando for cartão, já que não se aplicam.

### Resultado

- Cartão selecionado → usuário vê apenas o campo "Parcelas" (ex: 12x) sem expandir linhas de valor/data
- Qualquer outra forma (PIX, Boleto, Dinheiro, Transferência) → comportamento atual mantido com detalhes expandidos

Apenas 1 arquivo editado, alteração de ~2 linhas de condição.

