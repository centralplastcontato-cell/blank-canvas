

## Correção: Coluna "Auto-Perdido" sempre vazia

### Problema
Bug de string mismatch no `FollowUpsTab.tsx`. O array `followUpActions` usa `"Lead marcado como perdido automaticamente"` mas a edge function `follow-up-check` grava no banco como `"Lead movido para perdido automaticamente"`. O filtro SQL nunca retorna esses registros, resultando em 0 leads na coluna Auto-Perdido.

Dados no banco confirmam: existem 60 registros com a ação `"Lead movido para perdido automaticamente"`.

### Plano

**Arquivo:** `src/components/inteligencia/FollowUpsTab.tsx`

1. Na linha ~132, alterar a string no array `followUpActions`:
   - De: `"Lead marcado como perdido automaticamente"`
   - Para: `"Lead movido para perdido automaticamente"`

2. Na linha ~158, alterar a condição de detecção do fuNumber=5:
   - De: `ev.action.includes("perdido automaticamente")`  
   - Para: `ev.action.includes("perdido automaticamente")` (esta parte já funciona com ambas as strings, mas garantir consistência)

Essa é uma correção de uma única linha que resolve o problema por completo.

