## Diagnóstico

**O que aconteceu:**
1. O Castelo da Diversão sempre teve **uma única unidade física** (`Castelo da Diversão`).
2. Em **29/05/2026**, ao criar as instâncias WhatsApp `VENDAS 1`, `VENDAS 3` e `VENDAS 4`, uma migração inseriu essas mesmas linhas como `company_units` ativas (junto com a já existente `VENDAS 2` legada).
3. Motivo da migração: o sistema de permissões (`Instance↔Leads permission sync`) usa o **slug de `company_units`** para casar uma instância WhatsApp com a permissão `leads.unit.<slug>`. Sem a linha em `company_units` o sync não funcionava.
4. **Efeito colateral indesejado:** a tabela `company_units` é usada **simultaneamente** como:
   - **Unidades físicas** (Agenda, Eventos, Financeiro mostram esse seletor)
   - **Slugs de permissão** (sync com `leads.unit.*` e `whatsapp.instance.*`)
   
   Quando inserimos VENDAS 1/3/4 só para fins de permissão, eles **vazaram** para o seletor da Agenda (imagem 2).

**Por que afeta também notificações do "vendas 4":**
Provavelmente o usuário "vendas 4" tem `leads.unit.castelo-da-diversao` desligado (porque só está marcado em `vendas-4`), e os leads/notificações de visitas chegam com `unit = 'Castelo da Diversão'`, então o filtro de unidade do usuário esconde tudo. Vou confirmar isso na próxima etapa — esta é a etapa 1.

## Estratégia (sem quebrar nada)

Separar **unidade física** de **canal de vendas** dentro de `company_units` via uma flag.

### Etapa 1 — Esta correção (Agenda + outros seletores)

1. **DB:** Adicionar coluna `company_units.is_physical boolean NOT NULL DEFAULT true`.
2. **DB:** `UPDATE company_units SET is_physical = false WHERE name ILIKE 'VENDAS %'` (atinge VENDAS 1/2/3/4 do Castelo). Linhas continuam ativas — permissões e sync continuam funcionando 100%.
3. **Hook `useCompanyUnits`:** expor `physicalUnits` e `allUnits` separados, mantendo `units` como compat = `physicalUnits` (default) para não quebrar consumidores existentes que esperam apenas unidades físicas. O `InstanceVisibilityCard`, `TransferLeadDialog`, `CampaignAudienceStep`, `PermissionsPanel` (que precisam de TODAS as linhas para o sync de slugs) passarão a usar `allUnits`.
4. **UI:** Seletor "Todas as unidades" da Agenda passa a mostrar **apenas a unidade física `Castelo da Diversão`**. Como restará 1 unidade, o seletor será automaticamente ocultado pela lógica já existente (ou exibirá só a opção real).
5. **Financeiro / Inteligência / Relatórios** que também usam `useCompanyUnits` herdam a correção automaticamente.

### Etapa 2 (próxima) — Notificações do "vendas 4"

Depois que esta etapa estiver validada visualmente, investigo por que as notificações de visita/atenção/dúvida não chegam para o usuário "vendas 4" (provável causa: permissões `leads.unit.*` desalinhadas — corrigível sem migração).

## Arquivos afetados

- **Nova migração:** adiciona `is_physical` e marca VENDAS X como não-físicas.
- `src/hooks/useCompanyUnits.ts` — separa `physicalUnits` (default) de `allUnits`.
- `src/components/admin/InstanceVisibilityCard.tsx` — usar `allUnits` (precisa do slug de VENDAS X para sync).
- `src/components/admin/TransferLeadDialog.tsx` — usar `allUnits` (transferência por canal).
- `src/components/campanhas/CampaignAudienceStep.tsx` — usar `allUnits`.
- `src/components/admin/PermissionsPanel.tsx` — usar `allUnits`.
- Demais consumidores (Agenda, Financeiro, Inteligência, WhatsAppChat, Onboarding) **não mudam** — já recebem só físicas pelo default.
- `src/integrations/supabase/types.ts` — atualizado pela migração.

## O que NÃO muda

- Nenhuma instância WhatsApp é alterada.
- Sync de permissões `whatsapp.instance.* ↔ leads.unit.*` continua funcionando (linhas continuam existindo com slug).
- Bots, automações, agenda, leads, eventos, financeiro: nada quebra.
- Castelo da Diversão volta a aparecer como **unidade única** na Agenda.

Após a aplicação, valido visualmente (etapa 1 concluída) e seguimos para a etapa 2 (notificações do vendas 4).
