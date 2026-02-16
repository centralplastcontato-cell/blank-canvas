
## Mostrar leads "fechados" sem festa vinculada no formulário de evento

### O que muda

No campo "Vincular Lead do CRM" do formulário de criação/edição de festa:

1. **Ao abrir o formulário**, carregar automaticamente os leads com status "fechado" que ainda NAO possuem um evento vinculado na tabela `company_events`
2. **Exibir esses leads como sugestoes** sem precisar digitar nada (lista pre-carregada)
3. **A busca por nome continua funcionando**, mas filtrada apenas entre os leads fechados sem festa
4. Se o lead ja tem uma festa vinculada (`lead_id` existe em `company_events`), ele nao aparece na lista

### Detalhes Tecnicos

**Arquivo: `src/components/agenda/EventFormDialog.tsx`**

1. **Ao abrir o dialog**, fazer duas queries:
   - Buscar leads com `status = 'fechado'` da empresa atual
   - Buscar todos os `lead_id` distintos da tabela `company_events` (que ja tem festa)
   - Filtrar no frontend: mostrar apenas leads fechados cujo `id` NAO esta na lista de `lead_id` de eventos existentes
   - Excecao: se estamos editando um evento que ja tem um `lead_id`, esse lead deve continuar aparecendo (para nao sumir o vinculo atual)

2. **Exibir a lista pre-carregada** logo abaixo do campo de busca, sem necessidade de digitar
   - Se o usuario digitar, filtrar a lista localmente por nome
   - Mostrar um badge "Fechado" ao lado do nome do lead para contexto visual

3. **Logica da query**:

```sql
-- Query 1: leads fechados
SELECT id, name, whatsapp FROM campaign_leads
WHERE company_id = :companyId AND status = 'fechado'

-- Query 2: leads ja vinculados a eventos
SELECT DISTINCT lead_id FROM company_events
WHERE company_id = :companyId AND lead_id IS NOT NULL
```

```typescript
// Filtro no frontend
const availableLeads = fechadoLeads.filter(
  lead => !linkedLeadIds.has(lead.id) || lead.id === initialData?.lead_id
);
```

4. **UX**: O dropdown aparece automaticamente ao focar no campo, mostrando os leads disponiveis. Se nao houver leads fechados sem festa, exibe mensagem "Todos os leads fechados ja possuem festa vinculada."

### Resultado esperado
- Abrir o formulario de festa ja mostra os leads fechados disponiveis
- Leads que ja tem festa vinculada ficam ocultos
- Busca por nome filtra dentro dessa lista
- Se todos os leads fechados ja tem festa, mensagem informativa aparece
