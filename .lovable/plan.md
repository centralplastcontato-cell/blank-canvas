

## Nova pagina "Leads" no Hub

Criar uma pagina dedicada no portal Hub para visualizar os leads de todos os buffets em uma unica interface, com filtros inteligentes e paginacao.

### Visao geral

Uma nova rota `/hub/leads` acessivel pela sidebar do Hub, onde o administrador pode consultar leads de qualquer empresa filha, com busca, filtros por empresa/status/periodo e paginacao server-side.

### Etapas

#### 1. Criar pagina `src/pages/HubLeads.tsx`

Nova pagina usando `HubLayout` que:
- Busca leads paginados de `campaign_leads` para todas empresas filhas (child companies)
- Filtros: empresa, status, busca por nome/telefone, periodo (date range)
- Paginacao server-side (50 leads por pagina) com contagem total
- Tabela responsiva mostrando: nome, telefone, empresa, status, unidade, data de criacao, responsavel
- Badge colorido por status usando os mesmos `LEAD_STATUS_LABELS` e `LEAD_STATUS_COLORS` do CRM
- No mobile, exibe cards em vez de tabela (similar ao LeadCard existente)

#### 2. Adicionar rota no `App.tsx`

Nova rota:
```text
/hub/leads -> HubLeads
```

#### 3. Adicionar item na sidebar do Hub

Novo item no menu `HubSidebar.tsx`:
```text
{ title: "Leads", url: "/hub/leads", icon: Users }
```

Posicionado logo apos "Painel Hub".

#### 4. Adicionar item no menu mobile do Hub

Atualizar `HubMobileMenu.tsx` com o mesmo item "Leads".

### Detalhes tecnicos

**Busca de dados:**
- Query paginada em `campaign_leads` com `.in("company_id", companyIds)` e `.range(from, to)`
- Join com `companies` para nome da empresa (ou lookup em mapa pre-carregado)
- Join com `profiles` via `responsavel_id` para nome do responsavel
- Filtros aplicados server-side via `.eq()`, `.ilike()`, `.gte()/.lte()` no Supabase
- Contagem total via `{ count: "exact", head: true }` para a paginacao

**Componentes reutilizados:**
- `LEAD_STATUS_LABELS`, `LEAD_STATUS_COLORS` de `src/types/crm.ts`
- `HubDashboardFilters` como referencia de estilo (mas filtros proprios para esta pagina)
- `Badge` para status
- `Table` components do shadcn

**Paginacao:**
- 50 registros por pagina
- Componente de paginacao com primeira/anterior/proxima/ultima
- Exibicao "Mostrando X-Y de Z leads"

**Filtros da pagina:**
- Busca por nome/telefone (debounced)
- Select de empresa (todas ou especifica)
- Select de status (todos ou especifico)
- Date range picker (periodo de criacao)
- Botao limpar filtros

**Arquivos criados/alterados:**
1. `src/pages/HubLeads.tsx` (novo)
2. `src/App.tsx` (nova rota)
3. `src/components/hub/HubSidebar.tsx` (novo item menu)
4. `src/components/hub/HubMobileMenu.tsx` (novo item menu)

Nenhuma alteracao no banco de dados necessaria - os dados ja existem em `campaign_leads`.

