

## Acoes Rapidas + Motivos de Perda + Observacoes no Modal de Lead

### O que sera adicionado ao `FollowUpLeadDetailSheet`

Tres novas secoes entre o botao WhatsApp e o Resumo IA:

**1. Acoes Rapidas (grid 2 colunas)**
- **Reativar lead** (icone RefreshCw, verde) — muda status para `em_contato`, registra no historico
- **Tentei contato** (icone PhoneCall, azul) — registra tentativa no historico

**2. Motivo da Perda (grid 2 colunas, estilo rose/vermelho)**
- **Achou caro** (icone DollarSign)
- **Nao tinha a data** (icone CalendarX)
- **Fechou no concorrente** (icone Users)
- **Sem interesse** (icone XCircle)
- **Numero errado** (icone PhoneOff)
- **Vai retornar depois** (icone Clock)

Cada botao registra a acao em `lead_history` (ex: `"Motivo perda: Achou caro"`) com `company_id` do lead, e aparece imediatamente na timeline.

**3. Observacoes (textarea + botao Salvar)**
- Campo editavel com valor inicial de `lead.observacoes`
- Salva no `campaign_leads.observacoes` via update
- Toast de confirmacao

### Alteracoes tecnicas

**Arquivo:** `src/components/inteligencia/FollowUpLeadDetailSheet.tsx`

1. Adicionar `company_id` na query do lead (`campaign_leads`)
2. Adicionar estados: `observacoes`, `savingObs`, `actionLoading`
3. Funcao `handleQuickAction(label, changeStatus?)`:
   - Insere em `lead_history` com `company_id`, `action: label`
   - Se `changeStatus`, atualiza `campaign_leads.status`
   - Prepend no array `history` local
   - Toast
4. Funcao `handleSaveObservacoes()`:
   - Update `campaign_leads.observacoes`
   - Toast
5. Adicionar prop `onUpdate?: () => void` para notificar `FollowUpsTab` quando o lead for reativado (removido da lista)

**Arquivo:** `src/components/inteligencia/FollowUpsTab.tsx`

6. Passar `onUpdate={loadFollowUpData}` ao `FollowUpLeadDetailSheet`

### Layout visual

```text
┌─────────────────────────────┐
│  [Header: Nome + Status]    │
├─────────────────────────────┤
│  Score / Temperatura        │
│  Phone / Data / Mes / etc   │
│  [Abrir conversa WhatsApp]  │
│                             │
│  ── Acoes Rapidas ────────  │
│  [Reativar]  [Tentei cont.] │
│                             │
│  ── Motivo da Perda ──────  │
│  [Achou caro] [Sem data]   │
│  [Concorrente][Sem interes.]│
│  [Num. errado][Vai retornar]│
│                             │
│  ── Observacoes ──────────  │
│  [textarea................] │
│  [Salvar observacoes]       │
│                             │
│  ── Resumo IA ────────────  │
│  ── Historico (N) ────────  │
│  • Motivo perda: Achou caro │
│  • Follow-up #3 enviado     │
│  • ...                      │
└─────────────────────────────┘
```

