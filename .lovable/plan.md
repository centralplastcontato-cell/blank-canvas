
## Filtrar festas por unidade do usuario na Agenda

### Problema
A pagina da Agenda busca **todos** os eventos da empresa sem considerar as permissoes de unidade do usuario. Um usuario que so tem acesso a unidade "Manchester" ve tambem as festas da unidade "Trujillo".

### Solucao
Integrar o hook `useUnitPermissions` na pagina `Agenda.tsx` para:

1. Carregar as permissoes de unidade do usuario logado
2. Definir o filtro de unidade padrao automaticamente (se o usuario so tem acesso a uma unidade, pre-selecionar essa unidade)
3. Filtrar os eventos pelo `allowedUnits` do usuario (nao apenas pelo filtro manual)
4. Ajustar o dropdown de unidades para mostrar apenas as unidades que o usuario tem permissao

### Detalhes tecnicos

**Arquivo: `src/pages/Agenda.tsx`**

1. Importar `useUnitPermissions` de `@/hooks/useUnitPermissions`
2. Chamar `useUnitPermissions(currentUser?.id, currentCompany?.id)` para obter `canViewAll`, `allowedUnits`, `unitAccess`
3. Usar `useEffect` para definir `selectedUnit` automaticamente:
   - Se `canViewAll` = true, manter "all"
   - Se o usuario tem acesso a apenas 1 unidade, pre-selecionar essa unidade
   - Se tem acesso a mais de 1 (mas nao todas), manter "all" mas filtrar pela lista permitida
4. Alterar o `filteredEvents` para considerar `unitAccess`: mesmo quando `selectedUnit === "all"`, filtrar apenas pelas unidades permitidas
5. Ajustar o dropdown de unidades (`Select`) para listar apenas unidades com permissao, e esconder o dropdown se o usuario tem acesso a apenas uma unidade
