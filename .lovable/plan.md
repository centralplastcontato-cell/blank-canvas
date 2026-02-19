
## Transformação Visual: HUD / Central Tática

### Objetivo
Transformar o `PublicPartyControl` de um painel flat para um painel com profundidade real — camadas, luz e contraste — mantendo a identidade da marca. A estrutura de layout (100dvh, flex-col, overflow-hidden) já está correta e não será alterada.

---

### O que será alterado (apenas `src/pages/PublicPartyControl.tsx`)

---

#### 1. FUNDO — Iluminação central radial

Substituir o gradiente linear simples por um radial-gradient que cria sensação de luz vindo do centro, com escuridão nas bordas:

```
background: radial-gradient(ellipse 80% 60% at 50% 30%, #1a1f3e 0%, #0d1117 60%, #060810 100%)
```

Adicionar um pseudo-overlay com textura noise via SVG data-uri inline para criar a leve textura de superfície.

---

#### 2. HEADER — Bloco destacado com brilho

O header passará de um simples div com padding para um painel destacado:

- `background`: `linear-gradient(180deg, rgba(30,35,65,0.95) 0%, rgba(15,20,40,0.90) 100%)`
- `border`: `1px solid rgba(139,92,246,0.25)` nas laterais + bottom
- `box-shadow`: externa forte `0 8px 32px rgba(0,0,0,0.6)` + inset leve `inset 0 1px 0 rgba(255,255,255,0.06)`
- Linha luminosa fina abaixo: `border-bottom: 1px solid rgba(139,92,246,0.35)` com `box-shadow: 0 1px 8px rgba(139,92,246,0.3)`

---

#### 3. KPI CARDS — Profundidade máxima

Cada KPI card receberá tratamento completo de profundidade:

- `background`: gradiente forte específico por cor (ex. verde: `linear-gradient(145deg, rgba(16,185,129,0.25) 0%, rgba(5,150,105,0.05) 100%)`)
- `border`: `1px solid <cor com 0.5 alpha>`
- `box-shadow externa`: `0 8px 24px <cor glow>` + `0 2px 8px rgba(0,0,0,0.4)`
- `box-shadow inset`: `inset 0 1px 0 rgba(255,255,255,0.08)`
- Número: `text-2xl` (de `text-base`) com glow de texto via `text-shadow`
- Ícone emoji: aumentar para `text-xl` acima do número

---

#### 4. CARDS DOS MÓDULOS — Botão físico com luz

Cada card de módulo passará a ter:

- `border-radius`: `rounded-2xl` (de `rounded-xl`)
- `background`: gradiente com bordas mais escuras simulando profundidade  
  `linear-gradient(145deg, rgba(cor,0.22) 0%, rgba(cor,0.04) 100%)`
- Brilho superior: linha inset no topo `inset 0 1px 0 rgba(255,255,255,0.10)`
- `box-shadow externa`: `0 8px 20px <cor glow>, 0 2px 6px rgba(0,0,0,0.5)`
- Emoji: `text-2xl` (de `text-xl`)
- Hover: `scale(1.03)` + glow intensificado via filter
- Active: `scale(0.97)`
- Disabled: `opacity-30` (mais rebaixado que o atual)

---

#### 5. STATUS BADGES — Pontos luminosos pulsantes

- **OK (verde)**: ponto com `box-shadow: 0 0 6px rgba(52,211,153,0.8)` + `animate-pulse`
- **Pendência (âmbar)**: ponto âmbar pulsando com glow `0 0 8px rgba(251,191,36,0.9)`
- **Crítico (vermelho)**: glow vermelho suave `0 0 8px rgba(239,68,68,0.7)` + pulse

---

#### 6. BOTTOM NAV — Elevação e separação

- `background`: `linear-gradient(180deg, rgba(8,12,25,0.98) 0%, rgba(5,8,18,1) 100%)`
- `border-top`: `1px solid rgba(139,92,246,0.2)` com `box-shadow: 0 -4px 20px rgba(0,0,0,0.5)`
- Aba ativa: pill de fundo `rgba(139,92,246,0.2)` + borda `rgba(139,92,246,0.4)`
- Indicador ativo: linha com glow `box-shadow: 0 0 8px #7c3aed`

---

### Técnico

**Arquivo editado**: `src/pages/PublicPartyControl.tsx` (único arquivo)

**Estratégia**: todas as mudanças são de estilo inline (`style={}`) e classes Tailwind. Nenhuma mudança na lógica, nos hooks ou na estrutura de dados. O layout de `100dvh` com `flex-col` e `overflow-hidden` permanece intacto.

**Compatibilidade**: `box-shadow` com `inset` + `external` combinados em uma única propriedade, separados por vírgula — funciona em todos os browsers modernos (iOS Safari incluído).
