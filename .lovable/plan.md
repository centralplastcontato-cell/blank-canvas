
## Permissoes de Operacoes

Criar as definicoes de permissao para a secao Operacoes e aplicar os controles na pagina `Formularios.tsx`, seguindo o padrao existente.

### Nivel 1 - Hub: Modulo "Operacoes"

Adicionar `operacoes` ao sistema de `company_modules` para que o Hub possa habilitar/desabilitar o acesso a secao Operacoes por empresa.

- Arquivo: `src/hooks/useCompanyModules.ts`
  - Adicionar `operacoes: boolean` na interface `CompanyModules`
  - Default: `true` (habilitado por padrao, como crm/dashboard)
  - Adicionar label em `MODULE_LABELS`

- Arquivo: `src/components/admin/AdminSidebar.tsx`
  - Condicionar o item "Operacoes" a `modules.operacoes`

### Nivel 2 - Buffet: Permission Definitions

Inserir novas definicoes na tabela `permission_definitions` via migration:

| code | name | category | sort_order |
|------|------|----------|------------|
| operacoes.view | Acessar Operacoes | Operacoes | 1 |
| operacoes.formularios | Formularios | Operacoes | 2 |
| operacoes.checklist | Checklist | Operacoes | 3 |
| operacoes.pacotes | Pacotes | Operacoes | 4 |
| operacoes.freelancer | Freelancer | Operacoes | 5 |
| operacoes.avaliacoes | Avaliacoes Freelancer | Operacoes | 6 |

Dentro de "Formularios" (sub-abas), o acesso granular sera controlado pelas permissoes existentes nos codigos acima. Se o usuario tem `operacoes.formularios`, ve todas as 4 sub-abas (Avaliacoes, Pre-Festa, Contrato, Cardapio). Os demais tabs (Checklist, Pacotes, Freelancer) sao controlados individualmente.

### Nivel 3 - Aplicar na pagina

- Arquivo: `src/pages/Formularios.tsx`
  - Buscar permissoes do usuario logado usando `usePermissions`
  - Admins e owners veem tudo (bypass)
  - Usuarios sem `operacoes.view` sao redirecionados ou veem mensagem de acesso negado
  - Tabs de primeiro nivel (Formularios, Checklist, Pacotes, Freelancer) sao renderizadas condicionalmente com base nas permissoes
  - Se o usuario so tem acesso a uma tab, ela e selecionada automaticamente

### Nivel 4 - Painel de Permissoes

- Arquivo: `src/components/admin/PermissionsPanel.tsx`
  - Adicionar icone `FolderOpen` no mapa `categoryIcons` para a categoria "Operacoes"
  - As novas permissoes aparecerao automaticamente no painel pois ja sao carregadas de `permission_definitions`

### Detalhes tecnicos

1. **Migration SQL**: INSERT das 6 novas linhas em `permission_definitions`
2. **useCompanyModules.ts**: Adicionar campo `operacoes` na interface e no parser
3. **AdminSidebar.tsx**: Condicionar menu a `modules.operacoes`
4. **Formularios.tsx**: Criar hook local ou usar `usePermissions` para verificar acesso, filtrar tabs visiveis, redirecionar se sem acesso
5. **PermissionsPanel.tsx**: Adicionar icone da categoria
