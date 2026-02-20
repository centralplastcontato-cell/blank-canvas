
## Redesign Visual do Onboarding de Buffets

### Problema Identificado

O formulário atual de onboarding tem os campos flutuando diretamente no fundo cinza da página (`bg-background`), sem:
- Cards que agrupem e delimitem os campos visualmente
- Separação clara entre grupos de informação
- Contraste suficiente entre fundo e inputs
- Hierarquia visual clara (o `StepHeader` se perde no mesmo plano dos inputs)

### Solução: Layout em Cartão Elevado com Fundo Diferenciado

**Estratégia geral:**

1. Fundo da página: tom levemente colorido/gradiente (ex: `bg-gradient-to-br from-primary/5 to-background`) para criar contraste com os cards
2. Cada passo renderizado dentro de um card branco elevado (`bg-card shadow-md rounded-2xl p-5`) ao invés de diretamente na página cinza
3. O `StepHeader` (emoji + título + subtítulo) fica fora do card, flutuando acima — criando clara hierarquia visual
4. Dentro do card, os campos agrupados por subseções quando faz sentido (ex: no Step 1, "Localização" agrupa Cidade+Estado+Endereço separado de "Online" que agrupa Instagram+Site), cada subgrupo com um pequeno título `text-xs uppercase tracking-wider text-muted-foreground`
5. Inputs com fundo branco puro (`bg-background`) dentro do card, gerando contraste claro
6. Borda do card com `border border-border/60` para delimitação suave
7. Header sticky com visual mais premium: logotipo da empresa maior, nome da empresa + número do passo + barra de progresso visual com bolinhas de etapas numeradas

### Mudanças Técnicas

**Arquivo único:** `src/pages/Onboarding.tsx`

**Mudanças por componente:**

**`StepHeader`** — Permanece fora do card, com emoji maior e tipografia mais generosa:
```tsx
function StepHeader({ emoji, title, subtitle }) {
  return (
    <div className="mb-4 px-1">
      <span className="text-4xl">{emoji}</span>
      <h2 className="text-2xl font-bold text-foreground mt-2">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
```

**`FieldGroup`** — Passa a ser um card elevado que envolve os campos:
```tsx
function FieldGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-5">
      {children}
    </div>
  );
}
```

**Subgrupos dentro dos steps** — Separadores visuais com título pequeno para agrupar campos relacionados:
```tsx
function FieldSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 border-b border-border/40 pb-1">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
```

**Fundo da página** — Gradiente sutil ao invés de fundo cinza chapado:
```tsx
<div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
```

**Step 1** reorganizado em 2 subseções:
- "Sobre o buffet" → Nome do buffet
- "Localização" → Cidade + Estado + Endereço
- "Presença online" → Instagram + Site

**Step 2** reorganizado em 2 subseções:
- "Responsável" → Nome + Cargo
- "Contato" → Telefone + E-mail + Contato secundário

**Step 5** reorganizado em 2 subseções:
- "Números de WhatsApp" → números
- "Operação" → Atendentes + Horário + Múltiplas unidades

**Header** — Indicador de progresso por bolinha/steps ao invés de barra simples:
```
● ● ● ○ ○ ○ ○    (step 3 de 7)
```
(Mantendo a barra de progresso mas adicionando numeração de passos por bolinhas preenchidas/vazias)

### Resultado Visual Esperado

```text
┌─────────────────────────────────┐
│  [Logo]  Castelo da Diversão    │
│  ● ● ● ○ ○ ○ ○  Passo 3 de 7  │
└─────────────────────────────────┘

🏰
Identidade do Buffet
Conte-nos sobre o seu espaço de festas

┌─ Card branco elevado ───────────┐
│  SOBRE O BUFFET                 │
│  ─────────────────              │
│  Nome do buffet *               │
│  [________________]             │
│                                 │
│  LOCALIZAÇÃO                    │
│  ─────────────                  │
│  Cidade *        Estado         │
│  [__________]  [___]            │
│  Endereço completo              │
│  [__________________________]   │
│                                 │
│  PRESENÇA ONLINE                │
│  ─────────────────              │
│  Instagram                      │
│  [@________________]            │
│  Site (opcional)                │
│  [__________________________]   │
└─────────────────────────────────┘
```

Nenhuma mudança de banco de dados ou lógica. Apenas visual.
