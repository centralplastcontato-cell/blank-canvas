

## Apliques Decorativos para Buffet Infantil

Adicionar uma biblioteca de **apliques vetoriais** desenhados programaticamente no Canvas, inspirados nas artes profissionais de referencia. Esses apliques sao formas geometricas coloridas (ondas, splashes, molduras, banners, confetes) que transformam a foto em uma arte de agencia.

---

### O que sao os Apliques

Diferente dos stickers (emojis), os apliques sao **formas vetoriais desenhadas via Canvas API** que ocupam bordas e cantos da imagem, criando molduras e elementos decorativos profissionais. Baseado nas 10 imagens de referencia, os padroes mais recorrentes sao:

1. **Faixa Ondulada Topo** - onda colorida no topo (como nas artes amarelas/roxas)
2. **Faixa Ondulada Base** - onda colorida na base
3. **Splash Diagonal** - forma geometrica diagonal nos cantos (triangulos/curvas coloridas)
4. **Moldura Festiva** - borda decorativa com ondulacao ao redor de toda a imagem
5. **Confetes** - particulas coloridas espalhadas (circulos, retangulos, estrelas pequenas)
6. **Avioesinhos de Papel** - icone vetorial simples (aparece em varias artes)
7. **Baloes** - baloes vetoriais simples nos cantos
8. **Zigzag/Serrilhado** - borda serrilhada no topo ou base (estilo cupom/ingresso)
9. **Faixa de Texto** - ribbon/banner colorido atras do texto (retangulo com pontas)
10. **Circulos Decorativos** - circulos coloridos com borda nos cantos

---

### Como Funciona para o Usuario

1. Na sidebar esquerda (onde estao filtros e stickers), adicionar nova secao **"Apliques"**
2. Grid visual com preview de cada aplique (miniatura colorida)
3. Ao clicar, adiciona o aplique na imagem (toggle on/off)
4. **Cor do aplique** segue a cor de destaque escolhida (ou cor customizavel por aplique)
5. Maximo de 3-4 apliques simultaneos para nao poluir
6. Alguns apliques tem parametro de **posicao** (topo/base/esquerda/direita)

---

### Implementacao Tecnica

**Novo tipo:**
```text
interface Aplique {
  id: string
  type: ApliqueTipo
  color: string       // cor principal
  opacity: number     // 0-100
  position?: "top" | "bottom" | "left" | "right"
}

type ApliqueTipo = 
  "wave-top" | "wave-bottom" | "splash-corner" | 
  "confetti" | "zigzag-top" | "zigzag-bottom" |
  "circles" | "diagonal-stripes" | "frame-festive" | "ribbon"
```

**Arquivo a modificar:** `src/components/campanhas/CampaignTextOverlayEditor.tsx`

**Ordem de renderizacao no Canvas:**
```text
1. Foto base (com filtros de brilho/contraste/escurecer)
2. APLIQUES (novo - desenhados sobre a foto, antes dos textos)
3. Template de texto (oferta, escassez, etc)
4. Stickers/emojis
```

Os apliques sao renderizados entre a foto e os textos para que os textos fiquem sempre por cima.

**Funcoes de desenho (exemplos):**

- `drawWaveTop(ctx, size, color)` - curva bezier no topo, preenchida com cor solida
- `drawWaveBottom(ctx, size, color)` - curva bezier na base
- `drawSplashCorner(ctx, size, color, corner)` - triangulo/forma organica num canto
- `drawConfetti(ctx, size, colors)` - ~30 particulas randomicas (circulos e retangulos pequenos) com seed fixa para consistencia
- `drawZigzag(ctx, size, color, position)` - borda serrilhada
- `drawCirclesDecor(ctx, size, color)` - 3-5 circulos decorativos nos cantos
- `drawDiagonalStripes(ctx, size, color)` - listras diagonais coloridas nas bordas

**Cada funcao usa apenas Canvas 2D API nativa** (bezierCurveTo, arc, fillRect, etc.), sem imagens externas. Isso garante renderizacao consistente e leve.

**Seed para confetes:** Para que os confetes nao mudem a cada re-render, usar um valor de seed fixo por aplique (baseado no ID) para gerar posicoes pseudo-aleatorias.

---

### UI na Sidebar Esquerda

Nova secao entre "Stickers" e "Ajustes da foto":

```text
Sidebar Esquerda:
  1. Ajustes da foto (brilho, contraste, escurecer)
  2. Apliques (NOVO)
  3. Stickers
```

A secao mostra:
- Grid 2x2 com miniaturas dos apliques (icones representativos com Lucide ou mini-canvas)
- Cada aplique e um botao toggle (ativo/inativo)
- Ao ativar, mostra controle de cor (palette de cores) e opacidade (slider)
- Botao "Limpar todos" para remover todos os apliques

---

### Apliques Iniciais (10 tipos)

| Aplique | Descricao | Inspiracao |
|---------|-----------|------------|
| Onda Topo | Curva bezier colorida cobrindo ~15% superior | Arte amarela "Janeiro Especial" |
| Onda Base | Curva bezier colorida cobrindo ~15% inferior | Arte "Mega Promocao de Ferias" |
| Splash Canto | Forma organica em 1-2 cantos | Arte "Promoção Exclusiva" com confetes |
| Confetes | Particulas coloridas espalhadas | Arte "Oferta de Fim do Mes" |
| Zigzag Topo | Borda serrilhada no topo | Arte "Mega Promocao de Ferias" (verde) |
| Diagonal | Faixas diagonais coloridas nos cantos | Arte "Dia dos Pais" (listras) |
| Circulos | Circulos decorativos nos cantos | Arte "Super Promocao" |
| Moldura Simples | Borda interna com cantos arredondados | Varias artes |
| Pontos | Grid de pontos decorativos nas bordas | Estilo polka dots |
| Estrelas | Estrelas vetoriais pequenas espalhadas | Complemento festivo |

---

### Dependencias e Integracao

- Os apliques sao adicionados ao `renderCanvas` como nova etapa
- Estado `apliques: Aplique[]` no componente
- `useCallback` do `renderCanvas` recebe `apliques` nas dependencias
- Icone Lucide sugerido: `Shapes` ou `Palette` para a secao
- Nao requer nenhuma dependencia externa nova

### Estimativa

Modificacao apenas no arquivo `CampaignTextOverlayEditor.tsx`:
- ~10 funcoes de desenho de apliques (~200 linhas)
- UI da secao de apliques na sidebar (~80 linhas)
- Integracao no renderCanvas (~20 linhas)
- Total estimado: ~300 linhas adicionais

