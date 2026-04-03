

## Plan: New "Informações Complementares" Tab in Event Modal

### Overview
Add a second tab to the EventFormDialog modal. The first tab keeps everything as-is. The new tab consolidates internal/complementary data that never goes to contracts, plus form responses from Pre-Festa, Cardapio, and Contrato forms linked to the event.

### Architecture

```text
EventFormDialog
├── Tab 1: "Evento" (existing form, unchanged)
└── Tab 2: "Complementar" (new)
    ├── Observações Internas (moved from tab 1)
    ├── Formulário Pré-Festa
    │   ├── Status: Respondido / Não enviado
    │   ├── Respostas (if filled)
    │   └── Botão "Enviar para Anfitrião"
    ├── Formulário Cardápio
    │   ├── Status + Respostas
    │   └── Botão "Enviar para Anfitrião"
    └── Formulário Contrato (dados)
        ├── Status + Respostas
        └── Botão "Enviar para Anfitrião"
```

### Implementation Steps

**1. Create `EventComplementaryTab` component**
- New file: `src/components/agenda/EventComplementaryTab.tsx`
- Props: `eventId`, `companyId`, `companySlug`, `leadPhone`, `form` (for internal_notes), `setForm`
- On mount, fetches:
  - Active templates from `prefesta_templates`, `cardapio_templates`, `contrato_templates` for the company
  - Existing responses from `prefesta_responses`, `cardapio_responses`, `contrato_responses` filtered by `event_id`
- For each form type, renders a card showing:
  - Template name + status badge (Respondido/Pendente)
  - Collapsible response viewer (answers mapped to template questions)
  - "Enviar para Anfitrião" button that:
    - Constructs the public URL: `/{form-type}/{companySlug}/{templateSlug}` 
    - Sends via WhatsApp (wapi-send) to the lead's phone with the link
    - Also shows a "Copiar link" option
- Includes the "Observações internas da festa" textarea (removed from tab 1)

**2. Modify `EventFormDialog.tsx`**
- Import `Tabs, TabsList, TabsTrigger, TabsContent` from UI
- Wrap the form content area in a `Tabs` component with two tabs:
  - "Evento" (value `evento`) -- contains the existing form sections
  - "Complementar" (value `complementar`) -- renders `<EventComplementaryTab />`
- Remove the "Observações internas" section from tab 1 (it moves to tab 2)
- Tabs only appear when editing an existing event (`isEdit`); for new events, show only tab 1
- The form submit and footer buttons remain outside the tabs (shared)

**3. No database changes needed**
- All three response tables (`prefesta_responses`, `cardapio_responses`, `contrato_responses`) already have `event_id` FK to `company_events`
- Templates tables already exist with `slug`, `company_id`, `is_active`

### Technical Details

- The "Enviar para Anfitrião" button calls the existing `wapi-send` edge function with a message containing the form link
- Response display reuses the same answer-rendering logic from the existing pages (Cardapio.tsx, PreFesta.tsx, Contrato.tsx) -- simplified inline viewers
- The tab state defaults to "evento" so existing workflow is unchanged
- Responses on the Formulários page continue working as before (they query by `template_id`); the new tab queries by `event_id`, showing only event-specific responses

