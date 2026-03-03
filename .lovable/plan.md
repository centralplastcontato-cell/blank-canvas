

## Problema

No editor de arte, a seção "Textos prontos" mostra **todos** os presets de todas as campanhas (Carnaval, Volta às Aulas, Dia das Mães, etc.) misturados. Quando o tema é "Volta às Aulas", os textos de Carnaval não deveriam aparecer — ou pelo menos o tema atual deveria ser destacado e mostrado primeiro.

## Solução

Reorganizar o popover de "Textos prontos" para:

1. **Mostrar primeiro os presets do tema atual** (`campaignType`) com destaque visual (fundo colorido, badge "Tema atual")
2. **Separar os demais temas** em uma seção colapsada "Outros temas" para não poluir a interface
3. Se `campaignType` não corresponder a nenhum preset, manter o comportamento atual

## Mudança

**Arquivo**: `src/components/campanhas/CampaignTextOverlayEditor.tsx` (linhas ~1388-1413)

- Dividir `Object.entries(CAMPAIGN_PRESETS)` em dois grupos: `currentPresets` (matching `campaignType`) e `otherPresets` (restante)
- Renderizar `currentPresets` primeiro com badge de destaque
- Renderizar `otherPresets` dentro de um `Collapsible` com label "Outros temas" (fechado por padrão)

