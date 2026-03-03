

## Overlay de Texto com HTML Canvas sobre Artes de Campanha

### Conceito

Apos a IA gerar a arte visual (composicao com foto + logo + moldura), o usuario podera adicionar textos programaticamente usando HTML Canvas. Isso garante tipografia perfeita, sem erros de ortografia ou alucinacoes da IA.

### Fluxo do Usuario

```text
[IA gera arte visual] --> [Abre editor de texto Canvas] --> [Configura titulo, subtitulo, CTA] --> [Salva imagem final com texto]
```

1. Apos `handleComposeArt` retornar a imagem, em vez de salvar direto, abre um **editor de texto overlay**
2. O usuario configura:
   - **Titulo** (ex: "PROMOCAO DE ABRIL")
   - **Subtitulo** (ex: "10% OFF em todos os pacotes")
   - **CTA** (ex: "Garanta sua vaga!")
   - **Posicao** de cada texto (topo, centro, rodape)
   - **Cor** do texto (presets + seletor)
   - **Tamanho** (P, M, G)
3. O Canvas renderiza a imagem de fundo + textos em tempo real como preview
4. Ao clicar "Salvar", o Canvas exporta como PNG, faz upload pro Storage e salva na galeria
5. O usuario tambem pode pular essa etapa e salvar sem texto (botao "Salvar sem texto")

### Arquitetura Tecnica

**1. Novo componente `CampaignTextOverlayEditor.tsx`**

Componente principal que recebe a `imageUrl` gerada pela IA e permite adicionar textos:

- Usa um `<canvas>` para renderizar a imagem de fundo + textos sobrepostos
- Estado local para cada campo de texto:
  ```text
  textLayers: [
    { id, content, position ('top'|'center'|'bottom'), color, fontSize ('sm'|'md'|'lg'), bold }
  ]
  ```
- Tres slots pre-definidos: Titulo (topo), Subtitulo (centro), CTA (rodape)
- Cada slot tem uma faixa semi-transparente escura por tras para garantir legibilidade
- Preview em tempo real: cada mudanca re-renderiza o canvas
- Botoes: "Salvar com texto" (exporta canvas como PNG) e "Salvar sem texto" (usa imagem original)

**2. Fluxo de renderizacao do Canvas**

```text
1. Carregar imagem base (new Image() + crossOrigin)
2. Desenhar imagem no canvas (dimensao fixa 1080x1080 para WhatsApp)
3. Para cada textLayer com conteudo:
   a. Calcular posicao Y baseado em position (top=15%, center=50%, bottom=85%)
   b. Desenhar faixa semi-transparente (fillRect com rgba)
   c. Configurar font (Impact/Montserrat, bold, tamanho)
   d. Desenhar texto centralizado (fillText + strokeText para outline)
4. canvas.toBlob() --> upload para Storage --> salvar URL
```

**3. Integracao com `CampaignContextStep.tsx`**

- Apos `handleComposeArt` gerar a imagem com sucesso, em vez de salvar direto no draft, abrir o `CampaignTextOverlayEditor` passando a URL gerada
- O editor retorna a URL final (com ou sem texto) via callback `onSave(finalUrl)`
- O callback atualiza `draft.imageUrl` e salva na galeria (`campaign_images`)
- Adicionar estado `textEditorOpen` e `pendingArtUrl` para controlar o fluxo

**4. Fonte tipografica**

- Usar fontes web-safe que funcionam no Canvas: `"Impact", "Arial Black", sans-serif` para titulos impactantes
- Alternativa premium: carregar `Montserrat` (ja disponivel via Google Fonts) com `FontFace` API antes de renderizar
- Fallback garantido para que o canvas nunca fique sem fonte

**5. Presets de cor**

Oferecer 6-8 presets rapidos + input de cor customizada:
- Branco (#FFFFFF) - padrao
- Amarelo (#FFD700)
- Vermelho (#FF3333)
- Verde (#00CC66)
- Azul (#3399FF)
- Rosa (#FF69B4)
- Preto (#000000)

### Arquivos a Criar/Modificar

1. **CRIAR** `src/components/campanhas/CampaignTextOverlayEditor.tsx` -- Componente Canvas com editor de texto, preview em tempo real, e exportacao PNG
2. **MODIFICAR** `src/components/campanhas/CampaignContextStep.tsx` -- Integrar o editor apos a geracao de arte: abrir overlay editor em vez de salvar direto

### Resultado

O usuario gera a arte visual com IA (foto + logo + moldura) e depois adiciona textos com tipografia perfeita via Canvas. Pode configurar titulo, subtitulo e CTA com posicao, cor e tamanho. O resultado final e uma arte profissional completa, pronta para WhatsApp, com zero risco de texto errado.

