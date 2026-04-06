

## Plano: Adicionar "Retirada / Entrega" na Agenda de Visitas

### Contexto
Clientes que ja tem festa fechada precisam agendar horarios para trazer ou retirar itens no buffet (bebidas, lembrancinhas, toalhas, etc). Hoje isso fica solto. A ideia e agregar essa funcionalidade na pagina de Visitas, com um novo tipo de agendamento separado das visitas comerciais.

### O que muda

**1. Banco de dados** (migration)
- Adicionar coluna `visit_type TEXT DEFAULT 'visita'` na tabela `lead_visits`
  - Valores: `'visita'` (padrao, comportamento atual) e `'retirada_entrega'`
- Adicionar coluna `event_id UUID REFERENCES company_events(id)` na tabela `lead_visits` (opcional, para vincular ao evento/festa)
- Adicionar coluna `items_description TEXT` para descrever o que sera entregue/retirado

**2. Interface - Pagina de Visitas** (`src/pages/Visitas.tsx`)
- Adicionar um novo botao "Retirada / Entrega" ao lado do botao "Nova Visita" no header
- O botao abre o mesmo dialog de criacao, mas com `visit_type = 'retirada_entrega'` e campos adaptados:
  - Busca de lead (igual hoje)
  - Campo opcional para vincular a um evento existente do lead (select com festas do lead)
  - Data e horario
  - Campo "O que sera entregue/retirado" (textarea)
  - Sem campos de qualificacao comercial (pacote, interesse, etc)
- No calendario, usar dot de cor diferente (ex: roxo) para diferenciar entregas de visitas
- Nos cards do dia, mostrar um indicador visual (icone de caixa/pacote) para entregas
- Nos filtros, adicionar filtro por tipo (Todos / Visitas / Retirada-Entrega)

**3. Componente QuickVisitDialog** (`src/components/whatsapp/QuickVisitDialog.tsx`)
- Nao alterar -- este continua sendo so para visitas rapidas do chat

**4. Detail Sheet da visita**
- Quando for tipo `retirada_entrega`, mostrar os campos relevantes (itens, evento vinculado) em vez da qualificacao comercial
- Esconder o botao "Fechou na Visita" para entregas (nao faz sentido)

**5. Relatórios**
- O PDF/XLSX de visitas incluira uma coluna "Tipo" para diferenciar

### Resumo das alteracoes por arquivo

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | +3 colunas em `lead_visits` |
| `src/pages/Visitas.tsx` | Botao novo, dialog adaptado, filtro por tipo, dots diferenciados, detail adaptado |
| `src/lib/generateVisitasPDF.ts` | Coluna "Tipo" no relatorio |

### Identidade visual
- Visitas comerciais: icone MapPin, dots coloridos por status (como hoje)
- Retirada/Entrega: icone Package, dot roxo (`bg-violet-500`), badge "Entrega" em violet

