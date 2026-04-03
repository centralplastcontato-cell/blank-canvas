

## Nova aba "Taxas de Cartão" — Cadastro de operadoras e integração financeira

### Resumo

Criar uma aba na página Operações para cadastrar operadoras de cartão com suas taxas por parcela (1x a 12x, débito e crédito). Essas taxas serão usadas automaticamente no cálculo financeiro das festas e no dashboard financeiro, mostrando quanto o buffet "perde" com as taxas.

### 1. Nova tabela no banco — `company_card_fees`

```sql
create table public.company_card_fees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade not null,
  operator_name text not null,
  antecipado boolean default false,
  taxa_debito numeric(5,2) default 0,
  taxa_credito_1x numeric(5,2) default 0,
  taxa_credito_2x numeric(5,2) default 0,
  taxa_credito_3x numeric(5,2) default 0,
  taxa_credito_4x numeric(5,2) default 0,
  taxa_credito_5x numeric(5,2) default 0,
  taxa_credito_6x numeric(5,2) default 0,
  taxa_credito_7x numeric(5,2) default 0,
  taxa_credito_8x numeric(5,2) default 0,
  taxa_credito_9x numeric(5,2) default 0,
  taxa_credito_10x numeric(5,2) default 0,
  taxa_credito_11x numeric(5,2) default 0,
  taxa_credito_12x numeric(5,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.company_card_fees enable row level security;

create policy "Users can manage own company card fees"
  on public.company_card_fees for all
  to authenticated
  using (company_id = any(public.get_user_company_ids(auth.uid())))
  with check (company_id = any(public.get_user_company_ids(auth.uid())));
```

### 2. Novo componente — `CardFeesManager.tsx`

Arquivo: `src/components/admin/CardFeesManager.tsx`

Interface CRUD similar ao `PackagesManager`:
- Lista de operadoras cadastradas em cards
- Dialog para criar/editar com campos:
  - Nome da operadora (ex: "Stone", "Cielo")
  - Toggle "Valor recebido antecipadamente?"
  - Campo % débito 1x
  - Campo % crédito 1x
  - Campos % crédito 2x a 12x (grid compacto 3 colunas)
- Botão excluir

### 3. Registrar aba em Formularios.tsx

Adicionar nova seção `"taxas_cartao"` com label "Taxas de Cartão" e ícone `CreditCard` no array `visibleSections`, renderizando `<CardFeesManager />`.

### 4. Integração com EventFormDialog — Cálculo na criação da festa

Quando a forma de pagamento for "cartao" (entrada ou saldo), buscar a operadora cadastrada da empresa e calcular automaticamente:
- **Taxa aplicada** = % correspondente ao número de parcelas selecionado
- **Valor líquido** = valor bruto − (valor bruto × taxa / 100)
- Exibir abaixo do campo de parcelas uma linha informativa: "Taxa Stone 12x: 12.5% → Desconto de R$ 800,00 | Líquido: R$ 5.600,00"

Se houver mais de uma operadora cadastrada, exibir um Select para escolher qual operadora se aplica àquele pagamento.

### 5. Integração com EventFinancialTab — Modal financeiro da festa

Na seção financeira do evento (sheet lateral), adicionar um bloco "Taxas de Cartão" abaixo do resumo que mostra:
- Operadora utilizada
- Taxa aplicada (%)
- Valor bruto vs. valor líquido
- **"Valor não arrecadado"** = diferença que a operadora desconta

### 6. Integração com Dashboard Financeiro (Financeiro.tsx)

Nos KPIs do dashboard, o "Total Recebido" já deve considerar o valor líquido (após descontar taxas de cartão) para pagamentos feitos em cartão. Isso garante que os números reflitam o que realmente entra na conta do buffet.

### Arquivos envolvidos

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/` | Nova migration criando `company_card_fees` |
| `src/integrations/supabase/types.ts` | Atualizar tipos (se manual) |
| `src/components/admin/CardFeesManager.tsx` | **Criar** — CRUD de operadoras |
| `src/pages/Formularios.tsx` | Adicionar aba "Taxas de Cartão" |
| `src/components/agenda/EventFormDialog.tsx` | Select de operadora + cálculo de taxa quando forma = cartão |
| `src/components/financial/EventFinancialTab.tsx` | Exibir bloco de taxas no modal financeiro |
| `src/hooks/useFinanceiroDashboard.ts` | Considerar taxas no cálculo dos KPIs |

