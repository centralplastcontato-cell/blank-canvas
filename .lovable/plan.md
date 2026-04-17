

## Problema

Na imagem do cliente:
- **Valor Total:** R$ 4.972,00 (valor da festa)
- **Recebido (líquido):** R$ 4.960,84 (já com taxa descontada)
- **Pendente:** R$ 11,16 ← **ERRADO**

O cliente **já pagou tudo** (R$ 400 entrada + R$ 4.572 em 10x = R$ 4.972). Mas o sistema está calculando:

```
Pendente = Valor Total (4.972) − Recebido líquido (4.960,84) = 11,16
```

Ou seja, o sistema trata a **taxa da maquininha (R$ 399,32)** como se fosse uma dívida do cliente. Não é — é custo do buffet.

## Causa raiz

Em `useEventFinancial.ts` (linha 163):
```
pendingAmount = totalAmount − receivedAmount
```
Onde `receivedAmount` soma o **valor líquido** das parcelas pagas no cartão (já descontada a taxa). Resultado: a taxa "vaza" para o pendente do cliente.

## Solução

Separar dois conceitos hoje misturados:

1. **Pendente do cliente** = o que ele ainda deve → deve usar **valor bruto** das parcelas pagas (o que o cliente efetivamente pagou na maquininha).
2. **Recebido líquido (caixa)** = o que entrou no banco → continua usando o valor com taxa descontada.
3. **Taxas de cartão** = card "Valor não arrecadado" já existe e mostra isso corretamente.

### Mudança técnica (1 arquivo)

Em `src/hooks/useEventFinancial.ts`, no cálculo do summary:

- Para parcelas **pagas no cartão**, usar `gross_amount` (valor bruto) ao calcular o **Pendente**.
- Manter `amount` (líquido) no card **Recebido**.
- O card **Taxas de Cartão** continua mostrando a diferença (já funciona).

Resultado na tela do cliente Tania/Kaleb:
- Valor Total: R$ 4.972,00
- Recebido: R$ 4.960,84 (caixa)
- **Pendente: R$ 0,00** ✅
- Status: **Pago** ✅
- Taxas de Cartão: −R$ 399,32 (informativo)

### Compatibilidade com dados antigos

Parcelas antigas (sem `gross_amount` preenchido) → fallback para `amount`. Não quebra nada.

### Arquivo tocado
- `src/hooks/useEventFinancial.ts` (apenas o bloco de cálculo do `summary`, ~10 linhas)

