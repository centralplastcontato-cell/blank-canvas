

# Plano: Corrigir links de formulários com path incorreto

## Problema
O `EventFormsStatusPanel.tsx` gera links com paths incorretos que nao correspondem as rotas definidas no `App.tsx`, causando 404:

| Formulario | Path gerado (errado) | Rota real (App.tsx) |
|---|---|---|
| Pre-Festa | `/prefesta/...` | `/pre-festa/:slug/:slug` |
| Dados Complementares | `/dados-complementares/...` | `/contrato/:slug/:slug` |

O `EventComplementaryTab.tsx` tem os paths corretos (`pre-festa`, `contrato`). O problema esta apenas no `EventFormsStatusPanel.tsx`.

## Correcao

### Arquivo: `src/components/agenda/EventFormsStatusPanel.tsx`
Corrigir o array `FORM_TYPES` (linha 37-40):
- `prefesta` → mudar `publicPath` de `"prefesta"` para `"pre-festa"`
- `contrato` → mudar `publicPath` de `"dados-complementares"` para `"contrato"`

Sao apenas 2 strings a alterar. Nenhum outro arquivo precisa ser modificado.

