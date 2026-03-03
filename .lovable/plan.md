

## Reaplicar correção da janela de tempo no follow-up-check

### Problema
O código em `supabase/functions/follow-up-check/index.ts` linha 428 ainda usa `72 * 60 * 60 * 1000` fixo. A correção anterior não foi persistida.

### Correção
**Arquivo**: `supabase/functions/follow-up-check/index.ts` (linhas 427-429)

Substituir:
```typescript
const minTime = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago (max window)
const maxTime = new Date(now.getTime() - delayHours * 60 * 60 * 1000); // configured delay
```

Por:
```typescript
const lookbackHours = Math.max(delayHours * 2, 168); // 2x delay or 7 days minimum
const minTime = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);
const maxTime = new Date(now.getTime() - delayHours * 60 * 60 * 1000);
```

### Resultado esperado

| FU | Delay configurado | Janela antiga | Janela nova |
|----|-------------------|---------------|-------------|
| 1 | 72h | ~0 segundos | 72h |
| 2 | 144h | impossível | 144h |
| 3 | 216h | impossível | 216h |
| 4 | 288h | impossível | 288h |

Todos os follow-ups passam a funcionar corretamente independente do delay configurado.

