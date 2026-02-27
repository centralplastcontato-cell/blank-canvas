
## Corrigir filtro de unidades mostrando dados de outras empresas

### Problema
O componente `LeadsFilters.tsx` busca as opcoes de unidade, campanha e mes direto da tabela `campaign_leads` **sem filtrar por empresa**. Isso faz com que unidades de outras empresas (como "Castelo da Diversao" e "Trabalhe Conosco") aparecam no dropdown.

### Causa raiz
Na linha 44 de `LeadsFilters.tsx`, a query:
```sql
SELECT campaign_id, unit, month FROM campaign_leads ORDER BY campaign_id
```
Nao tem `.eq("company_id", ...)`, entao retorna dados de todas as empresas (RLS permite ver leads da propria empresa, mas se o usuario for admin global, ve tudo).

### Solucao

**Abordagem: Usar `useCompanyUnits()` para unidades + filtrar campaign_leads por company_id para campanhas/meses**

1. **Unidades**: Trocar a logica de extrair unidades dos leads por `useCompanyUnits()` que ja retorna apenas as unidades configuradas da empresa atual. Isso garante que so "Trujillo" e "Manchester" aparecam.

2. **Campanhas e Meses**: Adicionar filtro `.eq("company_id", companyId)` na query de `campaign_leads` para que campanhas e meses tambem sejam da empresa correta.

### Alteracoes

**`src/components/admin/LeadsFilters.tsx`**:
- Importar `useCompanyUnits` e `useCompany`
- Usar `unitNames` do hook para popular o dropdown de unidades (em vez de extrair dos leads)
- Receber `companyId` como prop ou usar `useCompany()` para filtrar a query de campanhas/meses
- Adicionar `.eq("company_id", companyId)` na query existente

### Impacto
- Dropdown de unidades mostrara apenas "Trujillo" e "Manchester" (unidades configuradas da empresa)
- Dropdown de campanhas e meses mostrara apenas dados da empresa atual
- Nenhum dado de outras empresas vazara nos filtros
