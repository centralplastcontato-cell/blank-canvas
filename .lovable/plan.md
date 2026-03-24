

# Central de Gestão Financeira — Evolução da tela Financeiro

## Resumo
Transformar a tela `/financeiro` de um painel simples em uma central completa de gestão financeira com identificação completa dos lançamentos, separação de receitas, módulo de despesas e visão de resultado.

## 1. Nova tabela: `company_expenses` (migração)

```sql
CREATE TABLE public.company_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'outros',
  unit text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage expenses of their companies"
ON public.company_expenses FOR ALL TO authenticated
USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))))
WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));
```

Categorias: `fornecedor`, `freela`, `compras`, `manutencao`, `aluguel`, `outros`.
Status: `pago`, `pendente`.

## 2. Enriquecer query de pagamentos

A query atual busca `event_payments` + `company_events.title/lead_id` + `campaign_leads.name`. Expandir para também buscar:
- `company_events.event_date` (data da festa)
- `company_events.unit` (unidade)
- `company_events.event_type` (tipo da festa)
- `event_payments.type` (entrada/parcela)

Tudo já disponível nas tabelas existentes — sem novas joins complexas.

## 3. Novo hook: `src/hooks/useFinanceiroDashboard.ts`

Hook dedicado que centraliza:
- Fetch de todos `event_payments` da company (enriquecidos)
- Fetch de todos `company_expenses` da company
- Filtragem por mês, unidade, status, tipo (receita/despesa)
- Cálculos agregados: recebido, a receber, atrasado, total despesas, saldo
- CRUD de despesas (add, update, delete)
- Função `markAsPaid` reutilizando a mesma lógica do `useEventFinancial`

## 4. Refatorar `src/pages/Financeiro.tsx`

### Header (mantido + expandido)
- Mesmo header premium com gradiente
- Filtros expandidos: mês + unidade + status + tipo

### Cards do topo (5 cards, grid responsivo)
| Card | Cor | Dado |
|------|-----|------|
| Recebido no mês | Verde | soma pagamentos `paid` no período |
| A receber no mês | Amarelo | soma `pending` com vencimento no mês |
| Em atraso | Vermelho | soma de todos `late` |
| Despesas do mês | Azul/Neutro | soma despesas no período |
| Saldo do mês | Roxo/Primary | recebido - despesas |

### Seções com Tabs
Usar `Tabs` para organizar: **Receitas** | **Despesas** | **Resultado**

#### Tab Receitas
3 sub-seções (acordeões ou blocos):
1. **Receitas Recebidas** — lista paga, mais recente primeiro
2. **Receitas a Receber** — pendentes, ordenadas por vencimento
3. **Receitas em Atraso** — vencidas com destaque vermelho e dias de atraso

Cada item (card) exibe:
- Nome do cliente (lead_name)
- Tipo + nome da festa (event_type + title)
- Data da festa (event_date)
- Unidade
- Tipo da parcela (Entrada / Parcela)
- Valor
- Data de vencimento
- Status badge (Pago/Pendente/Atrasado)
- Botão "Abrir evento" (navega para agenda/evento)
- Botão "Marcar como pago" (apenas para pending/late)

#### Tab Despesas
- Botão "+ Adicionar despesa" abre dialog com campos: descrição, valor, data, categoria (select), unidade (select), status
- Lista de despesas do mês (cards com descrição, valor, data, categoria badge, status)
- Botão de excluir/editar despesa

#### Tab Resultado
- Cards grandes: Total Recebido, Total Despesas, Saldo
- Gráfico simples opcional (barra receitas vs despesas) — pode ser adicionado depois

## 5. Novo componente: `src/components/financial/ExpenseFormDialog.tsx`
Dialog para criar/editar despesa com os campos definidos.

## 6. Novo componente: `src/components/financial/FinancialPaymentCard.tsx`
Card reutilizável para cada lançamento de receita com todos os dados contextuais.

## 7. Mobile
- Cards em grid 1 coluna
- Tabs com scroll horizontal
- Cards de lançamento com layout empilhado (nome/festa em cima, valor/status embaixo)
- Botão "+ Despesa" como FAB ou dentro da tab

## Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabela `company_expenses` + RLS |
| `src/hooks/useFinanceiroDashboard.ts` | Criar — hook com fetch, filtros, CRUD despesas |
| `src/components/financial/ExpenseFormDialog.tsx` | Criar — dialog de despesa |
| `src/components/financial/FinancialPaymentCard.tsx` | Criar — card de lançamento enriquecido |
| `src/pages/Financeiro.tsx` | Refatorar — tabs, cards expandidos, filtros, integração com novo hook |

## O que NÃO muda
- `useEventFinancial` permanece intacto (módulo dentro do evento)
- `EventFinancialTab` não é alterado
- Tabelas `event_payments`, `event_extras`, `event_discounts` mantidas
- Rota `/financeiro` e sidebar existentes mantidos

