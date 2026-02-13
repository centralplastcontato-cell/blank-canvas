

# Alterar Funil para "% do total"

## O que sera feito
Substituir a metrica "% do anterior" por "% do total" no funil de conversao, usando o total de leads como base de calculo para todas as etapas.

## Alteracoes

### Arquivo: `src/components/inteligencia/FunilTab.tsx`

- Remover o calculo de conversao baseado na etapa anterior (linhas 46-51)
- Substituir por um texto que mostra "X% do total" usando `total` (que ja existe no codigo) como base
- A nota so aparece quando `idx > 0` (a primeira etapa nao precisa, pois e o proprio total)
- Texto resultante: ex. "32% do total"

### Detalhes tecnicos

Trecho atual (linhas 46-51):
```typescript
let conversionNote = '';
if (idx > 0 && idx < FUNNEL_STEPS.length - 1) {
  const prevCount = counts[FUNNEL_STEPS[idx - 1]] || 0;
  if (prevCount > 0) {
    const convRate = ((count / prevCount) * 100).toFixed(0);
    conversionNote = `${convRate}% do anterior`;
  }
}
```

Sera substituido por:
```typescript
let conversionNote = '';
if (idx > 0) {
  const convRate = ((count / total) * 100).toFixed(0);
  conversionNote = `${convRate}% do total`;
}
```

Nota: a variavel `total` ja existe (linha 30: `const total = data.length || 1`), entao nenhuma nova variavel e necessaria.

