# Anotações internas: ponte entre Modal da Festa e Card do Pré-Festa

## Contexto

Hoje já existe:
- Campo `internal_notes` em `company_events` (textarea único), editável em **EventComplementaryTab** (modal da festa) e **EventSummaryPanel** (painel lateral).
- Componente `PreFestaInternalAnswers` que mostra os campos `internal: true` do template do pré-festa, dentro do card de respostas (sheet do `EventFormsStatusPanel`).

O que falta: enquanto o cliente **não** preencheu o pré-festa, esse `internal_notes` do modal precisa "migrar" visualmente para dentro do card do pré-festa assim que houver resposta — sem perder o conteúdo nem duplicar o lugar de edição.

## Decisões aprovadas
- **Campo no modal**: textarea único (já existe — `internal_notes`).
- **Migração**: ao aparecer no card do pré-festa, mostrar **duas subseções visualmente separadas**:
  1. *Anotações do cadastro da festa* (vindas de `company_events.internal_notes`)
  2. *Campos internos do pré-festa* (perguntas com `internal: true` do template)

Nada de novo no banco — reusamos colunas já existentes.

## Mudanças

### 1. `EventComplementaryTab.tsx` (modal da festa)
- Manter o textarea `internal_notes` como está.
- Adicionar uma legenda curta abaixo: *"Estas anotações ficam visíveis também no card do Pré-Festa quando o cliente preencher."*
- Aplicar visual amber (mesma identidade do bloco interno do pré-festa) para reforçar que é interno.

### 2. `PreFestaInternalAnswers.tsx`
- Aceitar 2 novas props opcionais:
  - `eventId: string`
  - `eventInternalNotes: string | null`
- Renderizar **duas subseções** dentro do mesmo card amber:
  - **Subseção A — "Anotações do cadastro da festa"**: textarea único bound a `eventInternalNotes`. Auto-save (debounce 1s) + botão Salvar persistindo em `company_events.internal_notes` via `supabase.from("company_events").update(...).eq("id", eventId)`.
  - **Subseção B — "Campos internos do pré-festa"**: renderização atual das perguntas `internal: true` (sem mudança de lógica).
- Se `internalQs.length === 0` **e** `eventInternalNotes` vazio, não renderiza nada (mantém comportamento atual).
- Se houver **só** uma das duas fontes, renderiza apenas a subseção correspondente (sem o título da outra).

### 3. `EventFormsStatusPanel.tsx`
- Buscar `internal_notes` do evento ao carregar (já temos `eventId`; adicionar select dedicado ou aproveitar fetch existente).
- Passar para `PreFestaInternalAnswers`:
  ```tsx
  <PreFestaInternalAnswers
    responseId={resp.id}
    answers={resp.answers}
    questions={viewingResponses.templateQuestions || []}
    eventId={eventId}
    eventInternalNotes={eventInternalNotes}
  />
  ```
- Atualizar a condição de renderização para também mostrar quando `eventInternalNotes` tiver conteúdo (não depender mais só de `hasInternalQuestions`).

## Comportamento resultante

```text
Antes do cliente preencher pré-festa:
  Modal da Festa → aba Complementar → "Anotações Internas" (textarea amber)
  Card do Pré-Festa → ainda não existe (sem resposta)

Depois do cliente preencher pré-festa:
  Modal da Festa → textarea continua editável (mesma fonte)
  Card do Pré-Festa (sheet de respostas) → bloco amber com:
     ┌─ Anotações do cadastro da festa ─────────┐
     │ [textarea com internal_notes do evento]  │
     ├─ Campos internos do pré-festa ───────────┤
     │ [pergunta interna 1]                     │
     │ [pergunta interna 2] ...                 │
     └──────────────────────────────────────────┘
```

Ambos os locais editam o **mesmo** campo `internal_notes` do evento, então qualquer alteração reflete nos dois sem duplicar dado.

## Arquivos afetados
- `src/components/agenda/PreFestaInternalAnswers.tsx` (adicionar subseção do evento)
- `src/components/agenda/EventFormsStatusPanel.tsx` (buscar e passar `eventInternalNotes`)
- `src/components/agenda/EventComplementaryTab.tsx` (legenda explicativa + visual amber leve)

Sem migração de banco e sem novas RLS — `company_events` já tem políticas de update por `company_id`.
