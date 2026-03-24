

# Plano: Modulo Financeiro do Celebrei

## Visao Geral

Criar um modulo financeiro integrado ao evento, com parcelas, extras, descontos, timeline e uma pagina consolidada de visualizacao. O financeiro nasce e vive dentro do evento.

## Fase 1 -- Banco de Dados (Migration SQL)

Criar 5 tabelas com RLS e company_id:

```text
event_payments          -- parcelas (entrada/parcela, valor, vencimento, metodo, status)
event_extras            -- valores extras (descricao, valor)
event_discounts         -- descontos (tipo fixo/%, valor, motivo)
event_financial_timeline -- historico (tipo, descricao, created_at)
```

Nao criar tabela `event_financial` separada -- o resumo sera calculado em tempo real (SUM das parcelas pagas, total = base + extras - descontos).

**RLS**: Todas as tabelas usarao `get_user_company_ids(auth.uid())` para filtrar por company_id, seguindo o padrao existente.

**Permissoes**: Inserir 4 novas permission_definitions:
- `financial.view` -- ver aba financeiro
- `financial.values` -- ver valores monetarios
- `financial.edit` -- editar parcelas/extras/descontos
- `financial.payments` -- registrar pagamentos

**Trigger**: Criar trigger que insere automaticamente na `event_financial_timeline` quando parcelas sao criadas/pagas, extras adicionados, descontos aplicados.

## Fase 2 -- Componentes do Evento (Aba Financeiro)

### 2.1 `EventFinancialTab.tsx`
Componente principal que sera adicionado ao `EventDetailSheet.tsx` como nova secao. Contem:

- **Cards de resumo**: Valor Total | Recebido | Pendente | Status (Pago/Parcial/Atrasado)
- **Lista de parcelas**: Tabela com valor, vencimento, status, acoes (pagar/editar/excluir)
- **Botao adicionar parcela**: Abre dialog com campos tipo/valor/vencimento/metodo
- **Secao extras**: Lista + botao adicionar (descricao + valor)
- **Secao descontos**: Lista + botao aplicar (tipo + valor + motivo)
- **Timeline financeira**: Lista cronologica de eventos

### 2.2 Dialogs auxiliares
- `PaymentFormDialog.tsx` -- criar/editar parcela
- Reutilizar Dialog/Sheet existentes do shadcn

### 2.3 Hook `useEventFinancial.ts`
- Carrega parcelas, extras, descontos e timeline do evento
- Calcula totais em tempo real
- CRUD operations com toast feedback
- Marca parcelas vencidas como "atrasado" automaticamente (client-side)

## Fase 3 -- Integracao no EventDetailSheet

Adicionar a aba/secao "Financeiro" no `EventDetailSheet.tsx`, condicionada a:
- `hasPermission('financial.view')` para ver a secao
- `hasPermission('financial.values')` para ver valores
- `hasPermission('financial.edit')` para botoes de edicao

## Fase 4 -- Pagina Financeiro Geral

### 4.1 `src/pages/Financeiro.tsx`
Pagina somente-leitura com:
- **Dashboard cards**: Total recebido no mes, a receber, em atraso
- **Proximos vencimentos**: Lista com cliente, evento, valor, data
- **Pagamentos em atraso**: Lista com cliente, evento, valor, dias de atraso
- Filtros por periodo e unidade

### 4.2 Rota e navegacao
- Adicionar rota `/financeiro` no `App.tsx`
- Adicionar item no `AdminSidebar.tsx` e `MobileMenu.tsx` (condicionado a modulo `financeiro`)
- Adicionar modulo `financeiro` no `useCompanyModules.ts`

## Fase 5 -- Modulo Hub

Adicionar flag `financeiro` no `CompanyModules` interface e `MODULE_LABELS` para controle de visibilidade pelo Hub.

## Arquivos a Criar
1. `src/components/financial/EventFinancialTab.tsx`
2. `src/components/financial/PaymentFormDialog.tsx`
3. `src/components/financial/FinancialSummaryCards.tsx`
4. `src/components/financial/FinancialTimeline.tsx`
5. `src/hooks/useEventFinancial.ts`
6. `src/pages/Financeiro.tsx`
7. Migration SQL (1 arquivo)

## Arquivos a Editar
1. `src/components/agenda/EventDetailSheet.tsx` -- adicionar secao financeiro
2. `src/App.tsx` -- rota `/financeiro`
3. `src/components/admin/AdminSidebar.tsx` -- menu item
4. `src/components/admin/MobileMenu.tsx` -- menu item
5. `src/hooks/useCompanyModules.ts` -- flag `financeiro`

## Economia de Creditos
- Reutilizar Card, Badge, Button, Dialog, Sheet, Table, Select do shadcn
- Reutilizar padrao de permissoes existente (usePermissions)
- Calculos client-side (sem edge functions)
- Um unico hook centralizado para todo o CRUD financeiro

