
# Reformulacao do Modal "Nova Festa" - Layout Premium 2 Colunas

## Resumo

Transformar o modal de 350px com campos empilhados em um formulario premium de 720px com layout em 2 colunas, secoes visuais agrupadas e footer fixo. **1 arquivo alterado, zero mudancas funcionais.**

## Arquivo: `src/components/agenda/EventFormDialog.tsx`

### 1. DialogContent - Largura e Estrutura

- De `max-w-[350px] max-h-[90vh] overflow-y-auto p-5`
- Para `max-w-[720px] max-h-[90vh] p-0 gap-0 overflow-hidden`
- Body scrollavel separado do footer (overflow-y-auto no body, footer fixo fora do scroll)
- Mobile: `max-w-[95vw]` com fallback para 1 coluna

### 2. Header Premium

- Padding `px-7 pt-7 pb-4`
- Titulo `text-xl font-bold`
- Subtitulo discreto: "Preencha os dados do evento"

### 3. Secoes Visuais com Separadores

Agrupar campos em 3 blocos visuais com titulo de secao (`text-xs uppercase tracking-widest text-muted-foreground`) e separador:

**Secao 1 - Dados do Cliente** (full width)
- Nome do cliente (full width)
- Vincular Lead do CRM (full width)

**Secao 2 - Data e Horario** (grid 2 colunas no desktop)
- Coluna esquerda: Data (Dia/Mes/Ano)
- Coluna direita: Status
- Coluna esquerda: Horario inicio
- Coluna direita: Horario fim

**Secao 3 - Informacoes da Festa** (grid 2 colunas no desktop)
- Coluna esquerda: Tipo de festa
- Coluna direita: Convidados
- Coluna esquerda: Unidade
- Coluna direita: Pacote
- Coluna esquerda: Valor total
- Coluna direita: Template de Checklist (se disponivel)
- Observacoes (full width, span 2 colunas)

### 4. Footer Fixo

- Fora do scroll area
- `border-t border-border/50 bg-muted/30 px-7 py-4`
- Botao "Cancelar" outline a esquerda
- Botao "Criar Festa" primario a direita, maior (`px-8`)

### 5. Responsividade Mobile

- Grid 2 colunas: `grid grid-cols-1 md:grid-cols-2 gap-4`
- No mobile (<768px): tudo empilha em 1 coluna automaticamente
- Observacoes: `md:col-span-2` para ocupar largura total

### 6. Refinamentos Visuais

- Labels: `text-sm font-medium text-foreground/80`
- Secao headers: icone pequeno + texto uppercase
- Padding do body scrollavel: `px-7 py-5`
- Espacamento entre secoes: `space-y-6` com `Separator` entre blocos

## Secao Tecnica

### Estrutura do JSX resultante

```text
DialogContent (max-w-[720px], p-0, overflow-hidden)
  +-- DialogHeader (px-7 pt-7 pb-4)
  +-- div.overflow-y-auto.max-h-[calc(90vh-180px)] (body scrollavel)
  |     +-- Secao "Dados do Cliente" (full width)
  |     +-- Separator
  |     +-- Secao "Data e Horario" (grid md:grid-cols-2)
  |     +-- Separator
  |     +-- Secao "Informacoes da Festa" (grid md:grid-cols-2)
  +-- div.border-t (footer fixo com botoes)
```

### Classes-chave

- Body: `overflow-y-auto px-7 py-5 space-y-6`
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4`
- Full-width fields: `md:col-span-2`
- Section label: `text-[11px] uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-2 mb-3`
- Footer: `flex justify-end gap-3 px-7 py-4 border-t border-border/40 bg-muted/20`

### Impacto

- 1 arquivo modificado
- Zero mudancas de logica ou estado
- Zero componentes novos
- Apenas reestruturacao de layout e classes CSS
