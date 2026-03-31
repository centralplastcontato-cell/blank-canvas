

## Plano: Incluir datas na variável {{forma_pagamento}}

### O que muda

A variável `{{forma_pagamento}}` passará a incluir as datas de pagamento, ficando mais completa. Exemplo:

**Antes:** `Entrada: R$ 1.500 (PIX) | Saldo: R$ 3.500 (Cartão) | 1x`

**Depois:** `Entrada: R$ 1.500 (PIX) em 01/04/2026 | Saldo: R$ 3.500 (Cartão) em 15/05/2026 | 1x`

### Alterações técnicas

**1. `src/components/contracts/EventContractDialog.tsx` (linhas 74-80)**
- No trecho que monta `paymentDesc`, adicionar a data formatada (DD/MM/YYYY) após cada valor:
  - Entrada: append `em ${formatDate(pd.entrada_data)}` se existir
  - Saldo: append `em ${formatDate(pd.saldo_data)}` se existir

**2. `src/components/contracts/ContractGenerator.tsx`**
- Mesma lógica no gerador legado, se ele monta `forma_pagamento` de forma similar.

Apenas 2 arquivos editados, sem migrations.

