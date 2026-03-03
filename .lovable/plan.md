

## Stickers/Emojis Posicionaveis e Filtros na Foto Base

### 1. Stickers/Emojis Posicionaveis

Adicionar uma nova camada de "stickers" ao editor, permitindo ao usuario colocar emojis decorativos (balao, bolo, confete, estrela, coracao, etc.) em qualquer posicao da imagem, com drag-to-reposition igual aos textos.

**Funcionalidades:**
- Biblioteca de ~20 emojis tematicos para buffets infantis (festa, baloes, bolo, presentes, estrelas, coracoes, fogos, confete, etc.)
- Cada sticker e arrastavel livremente no canvas (mesmo sistema de drag dos textos)
- Controle de tamanho por sticker (slider de escala)
- Botao "+" para adicionar stickers, botao "X" para remover cada um
- Maximo de 5 stickers simultaneos para nao poluir a arte
- Renderizacao no canvas usando `ctx.fillText()` com emoji (funciona nativamente no Canvas com fontes de emoji do sistema)

**Estado novo:**
```text
interface Sticker {
  id: string
  emoji: string
  x: number      // 0-1 ratio
  y: number      // 0-1 ratio
  size: number   // slider 20-120px no canvas
}
stickers: Sticker[]  (estado no componente)
```

**Emojis disponiveis:**
Organizados em categorias:
- Festa: 🎈 🎉 🎊 🎁 🎂 🧁
- Decoracao: ⭐ 🌟 ✨ 💫 🎀 🎯
- Coracoes: ❤️ 💛 💜 🩷 🧡
- Natureza: 🌺 🌈 ☀️ 🦋

**UI:** Nova secao "Stickers" na sidebar de controles, com grid de emojis clicaveis. Ao clicar, adiciona o sticker no centro da imagem. O usuario arrasta para posicionar.

---

### 2. Filtros na Foto Base

Adicionar controles de brilho, contraste e escurecimento da foto base, aplicados antes dos textos/stickers. Isso permite ao usuario ajustar a foto para melhorar a legibilidade do texto.

**Funcionalidades:**
- **Brilho** (slider -50 a +50, padrao 0)
- **Contraste** (slider -50 a +50, padrao 0)
- **Escurecer** (slider 0 a 80, padrao 0 - overlay preto com opacidade)

**Implementacao tecnica:**
- Aplicar `ctx.filter` do Canvas com `brightness()` e `contrast()` ao desenhar a imagem base
- Para "escurecer": desenhar um `fillRect` preto com opacidade variavel sobre a imagem, antes dos textos
- Os filtros sao aplicados na funcao `renderCanvas` entre o desenho da imagem e a chamada do template

**UI:** Nova secao "Ajustes da foto" na sidebar, com 3 sliders (brilho, contraste, escurecer) e botao "Resetar" para voltar aos valores padrao.

---

### Detalhes Tecnicos

**Arquivo a modificar:** `src/components/campanhas/CampaignTextOverlayEditor.tsx`

**Mudancas no renderCanvas:**

```text
1. Desenhar imagem base com ctx.filter = `brightness(X) contrast(Y)`
2. Resetar ctx.filter
3. Se escurecer > 0, desenhar fillRect preto com opacidade
4. Chamar RENDER_MAP[template](...) (textos)
5. Para cada sticker: ctx.font = `${size}px serif`; ctx.fillText(emoji, x, y)
```

**Mudancas no drag:**
- Extender o sistema de drag para detectar proximidade com stickers alem de text layers
- Stickers usam coordenadas absolutas (x, y em ratio 0-1), sem preset de posicao

**Novos estados no componente:**
```text
// Filtros
const [brightness, setBrightness] = useState(0)      // -50 a +50
const [contrast, setContrast] = useState(0)           // -50 a +50
const [darken, setDarken] = useState(0)               // 0 a 80

// Stickers
const [stickers, setStickers] = useState<Sticker[]>([])
```

**Nova secao na sidebar UI (ordem):**
1. Template (existente)
2. **Ajustes da foto** (NOVO - brilho, contraste, escurecer)
3. Posicao do texto (existente)
4. Cor de destaque (existente)
5. Textos prontos (existente)
6. **Stickers** (NOVO - grid de emojis + lista de adicionados)
7. Card central / Layers (existente)

**Dependencias no renderCanvas:**
- Adicionar `brightness`, `contrast`, `darken`, `stickers` nas dependencias do `useCallback`

**Icones Lucide a importar:** `Sun`, `Contrast`, `Moon`, `Smile` (ou `Sticker`)

