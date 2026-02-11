

## Correcao definitiva: Leads "Trabalhe Conosco" nao aparecem no CRM

### Diagnostico

Apos analise detalhada do banco de dados e do codigo, os dados estao corretos:
- Leads existem com `unit = 'Trabalhe Conosco'`
- Permissoes estao concedidas (`leads.unit.trabalhe-conosco = true`)
- A unidade existe em `company_units`

O problema esta no **codigo frontend**, especificamente em um bug de timing/race condition:

### Causa raiz identificada

O hook `useCompanyUnits` faz a consulta ao banco **antes da autenticacao estar pronta**. Como a tabela `company_units` tem RLS, a query retorna vazio. O hook resolve com `units = []` e nunca re-busca, pois seu `useCallback` depende apenas de `companyId` (que nao muda).

Com `companyUnits = []`, o hook `useUnitPermissions` so verifica `leads.unit.all` (que e `false` para Jamile), e `allowedUnits` fica vazio. O CentralAtendimento interpreta `allowedUnits.length === 0` como "sem permissao" e mostra zero leads.

### Plano de correcao

#### 1. Corrigir `useCompanyUnits` para re-buscar apos autenticacao

Adicionar uma dependencia no estado de autenticacao para que o hook re-execute a consulta quando o usuario estiver autenticado:

- Adicionar listener `onAuthStateChange` dentro do hook
- Quando o estado de auth mudar, chamar `fetchUnits()` novamente
- Isso garante que as unidades sejam carregadas DEPOIS do RLS estar ativo

#### 2. Adicionar logs de debug temporarios

Adicionar `console.log` no `useUnitPermissions` para rastrear:
- Quantas `companyUnits` foram carregadas
- Quais `allowedUnits` foram resolvidas
- Se `canViewAll` esta correto

Isso ajudara a confirmar se o fix resolveu o problema.

#### 3. Garantir re-fetch no `useUnitPermissions`

O `useUnitPermissions` ja depende de `companyUnits` no callback, entao quando `useCompanyUnits` atualizar, ele vai re-executar automaticamente.

### Detalhes tecnicos

**Arquivo: `src/hooks/useCompanyUnits.ts`**
- Adicionar `supabase.auth.onAuthStateChange` dentro de um `useEffect`
- Quando o evento for `SIGNED_IN`, chamar `fetchUnits()` para recarregar as unidades com o RLS ativo
- Limpar o listener no cleanup do useEffect

**Arquivo: `src/hooks/useUnitPermissions.ts`**
- Adicionar `console.log` com os valores de `companyUnits.length`, `allowedUnits` e `canViewAll` para debug

### Impacto

- Correcao de 2 arquivos (hooks)
- Nenhuma mudanca no banco de dados
- Resolve o problema para TODOS os usuarios, nao apenas "Trabalhe Conosco"
- Os logs de debug podem ser removidos depois da confirmacao

