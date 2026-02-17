

## Remover "Templates de Checklist" da aba Checklist

### O que será feito
Remover o componente `ChecklistTemplateManager` da aba "Checklist" na página Operações (`/formularios`), mantendo apenas o componente `EventStaffManager` (Equipe / Financeiro).

### Detalhes técnicos

**Arquivo**: `src/pages/Formularios.tsx`

- Remover o import de `ChecklistTemplateManager`
- Remover o import de `Separator` (usado apenas entre os dois componentes)
- No `TabsContent value="checklist"`, remover `<ChecklistTemplateManager />` e o `<Separator />`, deixando apenas `<EventStaffManager />`

