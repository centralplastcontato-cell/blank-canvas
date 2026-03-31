

## Plano: Adicionar variáveis de data da entrada e data do saldo no contrato

### O que muda para o usuário

O modelo de contrato poderá usar as variáveis `{{data_entrada}}` e `{{data_saldo}}` para exibir as datas de pagamento da entrada e do saldo, formatadas em DD/MM/YYYY.

### Alterações técnicas

**1. Template resolver — `src/lib/template-resolver.ts` + `supabase/functions/_shared/template-resolver.ts`**
- Adicionar `data_entrada` e `data_saldo` ao `VariableContext.contract`
- Adicionar os dois resolvers no `VARIABLE_CATALOG`:
  - `data_entrada`: retorna `ctx.contract?.data_entrada || ''`
  - `data_saldo`: retorna `ctx.contract?.data_saldo || ''`
- Adicionar ao `domainMap` como domain `'contract'`

**2. Contexto do contrato — `src/components/contracts/EventContractDialog.tsx`**
- No bloco `contract:` do `variableContext` (linha ~96-144), adicionar:
  - `data_entrada`: formatar `pd.entrada_data` de `yyyy-MM-dd` para `dd/MM/yyyy`
  - `data_saldo`: formatar `pd.saldo_data` de `yyyy-MM-dd` para `dd/MM/yyyy`

**3. Contract Generator — `src/components/contracts/ContractGenerator.tsx`**
- Mesma adição no mapeamento de variáveis para o gerador legado, se aplicável

**4. Sem migration** — os dados já estão salvos em `payment_details` JSON dentro de `company_events`

