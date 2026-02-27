

## Remover "Decoração temática inclusa" da LP do Castelo da Diversão

### Contexto
A LP dinâmica do Castelo da Diversão não tem `benefits_list` configurado no banco (está `null`), então usa o fallback hardcoded no componente `DLPOffer.tsx`. Esse fallback inclui "Decoração temática inclusa" que precisa ser removido.

A LP estática (`LandingPage.tsx`) usa o `campaignConfig.ts`, que já não contém esse item -- não precisa de alteração.

### Alteração necessária

**Arquivo: `src/components/dynamic-lp/DLPOffer.tsx`**
- Remover "Decoração temática inclusa" da lista de fallback `defaultBenefits` (linha 117)
- A lista ficará com 4 itens: Espaço completo, Monitores, Buffet completo, Brinquedos

Apenas 1 linha removida em 1 arquivo. Nenhuma migration necessária pois o banco já está `null` e usa esse fallback.

