

## Calendario de Festas para Buffets

### Visao Geral
Nova aba "Agenda" no menu lateral, onde o buffet pode cadastrar, visualizar e gerenciar suas festas em um calendario mensal interativo.

### Funcionalidades Sugeridas

1. **Calendario Mensal Visual** - Visualizacao mes a mes com indicadores coloridos nos dias que tem festa agendada
2. **Cadastro de Festa** - Formulario para registrar: nome do cliente, data/horario, tipo de festa, numero de convidados, pacote/unidade, valor, observacoes, e vincular ao lead existente (opcional)
3. **Status da Festa** - Confirmada, Pendente, Cancelada (com cores diferentes no calendario)
4. **Detalhes ao Clicar** - Ao clicar em um dia, ver lista de festas daquele dia com detalhes rapidos
5. **Conflito de Horario** - Alerta visual quando duas festas estao no mesmo horario/unidade
6. **Filtro por Unidade** - Para buffets com mais de uma unidade, filtrar festas por local
7. **Resumo Mensal** - Card com total de festas no mes, receita prevista, festas confirmadas vs pendentes

### Detalhes Tecnicos

**Nova tabela: `company_events`**
- `id` (uuid, PK)
- `company_id` (uuid, NOT NULL) - isolamento multi-tenant
- `lead_id` (uuid, nullable) - vinculo opcional com lead existente
- `title` (text) - nome do cliente ou titulo da festa
- `event_date` (date, NOT NULL)
- `start_time` (time)
- `end_time` (time)
- `event_type` (text) - infantil, debutante, corporativo, etc.
- `guest_count` (integer)
- `unit` (text, nullable) - unidade do buffet
- `status` (text) - confirmado, pendente, cancelado
- `package_name` (text, nullable)
- `total_value` (numeric, nullable)
- `notes` (text, nullable)
- `created_by` (uuid) - usuario que cadastrou
- `created_at`, `updated_at` (timestamps)

RLS: mesmas politicas de isolamento por empresa ja usadas no projeto (`get_user_company_ids`).

**Nova rota: `/agenda`**
- Pagina `src/pages/Agenda.tsx` com layout identico ao das outras paginas (sidebar + conteudo)

**Novos componentes:**
- `src/components/agenda/AgendaCalendar.tsx` - calendario mensal usando o componente Calendar existente (react-day-picker) customizado para mostrar indicadores de festas
- `src/components/agenda/EventFormDialog.tsx` - dialog para criar/editar festa
- `src/components/agenda/EventDetailSheet.tsx` - sheet lateral com detalhes da festa
- `src/components/agenda/MonthSummaryCards.tsx` - cards de resumo mensal

**Menu:**
- Adicionar item "Agenda" no `AdminSidebar.tsx` e `MobileMenu.tsx` (icone: `CalendarDays`)
- Controlado pelo modulo `agenda` no `useCompanyModules` (opt-in, como inteligencia)

**Rota no App.tsx:**
- `<Route path="/agenda" element={<Agenda />} />`
