

# Pré-reserva: Nova Funcionalidade na Agenda de Festas

## Resumo

Adicionar um sistema completo de pré-reserva de datas na Agenda de Festas, com tabela dedicada, indicador visual rosa no calendario, modal de criacao/edicao, painel lateral integrado, conversao em festa oficial, automacao de vencimento via WhatsApp, e permissoes granulares.

---

## 1. Banco de Dados

### Nova tabela `pre_reservations`

```sql
CREATE TABLE public.pre_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES campaign_leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  event_date date NOT NULL,
  unit text,
  reservation_days integer NOT NULL DEFAULT 3,
  reservation_start_at timestamptz NOT NULL DEFAULT now(),
  reservation_expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','convertida','expirada','cancelada')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  converted_event_id uuid REFERENCES company_events(id) ON DELETE SET NULL,
  cancellation_reason text,
  last_automation_sent_at timestamptz,
  customer_response_status text, -- 'positiva','negativa',null
  customer_response_text text,
  customer_response_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pre_reservations ENABLE ROW LEVEL SECURITY;
```

RLS policies usando `get_user_company_ids(auth.uid())` para SELECT/INSERT/UPDATE/DELETE para usuarios autenticados.

Trigger `updated_at` automatico.

### Novas permissoes

Inserir na tabela `permission_definitions`:
- `prereserva.criar` - Criar pre-reserva
- `prereserva.editar` - Editar pre-reserva
- `prereserva.cancelar` - Cancelar pre-reserva
- `prereserva.converter` - Converter em festa
- `prereserva.automacoes` - Configurar automacoes

### Tabela de settings de automacao

```sql
CREATE TABLE public.pre_reservation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  is_enabled boolean DEFAULT false,
  send_on_last_day boolean DEFAULT true,
  hours_before_expiry integer DEFAULT 10,
  expiry_message text DEFAULT 'Ola {{nome}} ...',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

## 2. Frontend -- Componentes Novos

### `src/components/agenda/PreReservationFormDialog.tsx`
Modal de criacao/edicao com campos: nome, telefone, data, unidade, observacoes, duracao (select 1-7 dias), busca de lead (autocomplete buscando `campaign_leads` por nome/telefone). Calcula `reservation_expires_at` automaticamente.

### `src/components/agenda/PreReservationDetailSheet.tsx`
Sheet lateral com detalhes da pre-reserva, acoes rapidas: editar, cancelar (com motivo), converter em festa (abre `EventFormDialog` pre-preenchido), abrir lead vinculado (navega para CRM).

### `src/components/whatsapp/settings/PreReservationAutomationSection.tsx`
Secao de configuracao dentro de Automacoes do WhatsApp: toggle ativar/desativar, textarea editavel com variaveis (`{{nome}}`, `{{data_festa}}`, `{{data_validade}}`, `{{unidade}}`), select de quando enviar (ultimo dia / X horas antes).

---

## 3. Frontend -- Alteracoes em Arquivos Existentes

### `src/pages/Agenda.tsx`
- Adicionar state `preReservations` e fetch da tabela `pre_reservations` no mesmo `useEffect` de eventos
- Botao "Pre-reserva" ao lado de "Nova Festa" no header (desktop e mobile)
- No painel lateral do dia selecionado: listar pre-reservas do dia apos os eventos, com borda/badge rosa
- Passar `preReservations` para `AgendaCalendar`

### `src/components/agenda/AgendaCalendar.tsx`
- Aceitar nova prop `preReservations` (array com `id`, `event_date`, `status`)
- Adicionar cor `bg-pink-400` ao `STATUS_DOT` map para pre-reservas
- No `DayContent`, renderizar bolinha rosa para pre-reservas ativas do dia (separada dos eventos)

### `src/components/agenda/AgendaListView.tsx`
- Aceitar e renderizar pre-reservas na listagem, com badge rosa "Pre-reserva"

### `src/components/whatsapp/settings/AutomationsSection.tsx`
- Adicionar tab/secao condicional para pre-reserva linkando ao novo `PreReservationAutomationSection`

### `src/components/whatsapp/settings/index.ts`
- Exportar `PreReservationAutomationSection`

---

## 4. Edge Function -- Automacao de Vencimento

### `supabase/functions/pre-reservation-expiry/index.ts`
Cron function (manual setup) que:
1. Busca pre-reservas ativas com `reservation_expires_at` proximo (ultimo dia ou X horas)
2. Busca settings da empresa
3. Resolve variaveis do template
4. Envia mensagem via `wapi-send` ao cliente
5. Registra no `lead_history` ("mensagem_prereserva_enviada")
6. Atualiza `last_automation_sent_at`
7. Auto-expira pre-reservas vencidas (status -> 'expirada')

---

## 5. Historico do Lead

Registrar no `lead_history` (tabela ja existente) acoes como:
- "pre_reserva_criada"
- "pre_reserva_convertida"
- "pre_reserva_expirada"
- "pre_reserva_cancelada"
- "prereserva_automacao_enviada"

---

## 6. Conversao em Festa

Ao clicar "Converter em festa" no detail sheet:
- Abre `EventFormDialog` pre-preenchido (nome, data, unidade, lead_id)
- Apos salvar, atualiza pre-reserva: `status = 'convertida'`, `converted_event_id = novoEventoId`
- Registra no historico do lead

---

## Arquivos Afetados (resumo)

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabelas + RLS + permissoes |
| `src/pages/Agenda.tsx` | Fetch + UI pre-reservas |
| `src/components/agenda/AgendaCalendar.tsx` | Bolinha rosa |
| `src/components/agenda/AgendaListView.tsx` | Items rosa na lista |
| `src/components/agenda/PreReservationFormDialog.tsx` | **NOVO** - Modal criar/editar |
| `src/components/agenda/PreReservationDetailSheet.tsx` | **NOVO** - Sheet detalhes |
| `src/components/whatsapp/settings/PreReservationAutomationSection.tsx` | **NOVO** - Config automacao |
| `src/components/whatsapp/settings/AutomationsSection.tsx` | Adicionar secao |
| `src/components/whatsapp/settings/index.ts` | Export |
| `supabase/functions/pre-reservation-expiry/index.ts` | **NOVO** - Edge function cron |

