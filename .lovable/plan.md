
# Plano: Dashboard como Página Inicial + Sistema de Permissões Granulares

## Resumo

Este plano aborda duas mudanças importantes:
1. Tornar o painel administrativo (dashboard) a página inicial do sistema
2. Criar um sistema flexível de permissões onde administradores podem ativar/desativar funcionalidades específicas para cada usuário

---

## Parte 1: Dashboard como Página Inicial

### O que será feito
- A rota `/` passará a exibir o dashboard (gestão de leads) em vez da landing page promocional
- A landing page promocional será movida para uma rota dedicada como `/promo` ou `/campanha`
- O menu lateral será atualizado para refletir essa mudança

### Impacto
- Usuários autenticados verão o dashboard ao acessar a raiz do site
- Usuários não autenticados serão redirecionados para `/auth` (login)
- A landing page continua acessível para campanhas de marketing

---

## Parte 2: Sistema de Permissões Granulares

### Conceito
Em vez de apenas 3 níveis de acesso (Admin, Comercial, Visualização), teremos permissões individuais que podem ser habilitadas ou desabilitadas por usuário. Isso permite:

- Dar a um usuário comercial a permissão de exportar dados, mas não de editar leads
- Permitir que um usuário visualize o Kanban mas não a tabela
- Habilitar/desabilitar funcionalidades futuras sem reescrever código

### Permissões Iniciais Propostas

| Permissão | Descrição |
|-----------|-----------|
| `leads.view` | Visualizar lista de leads |
| `leads.edit` | Editar informações de leads |
| `leads.export` | Exportar leads para CSV |
| `leads.assign` | Atribuir responsável a leads |
| `users.view` | Ver lista de usuários |
| `users.manage` | Criar, editar e excluir usuários |
| `permissions.manage` | Gerenciar permissões de outros usuários |

### Interface de Gerenciamento

Na página de Usuários (`/users`), será adicionada uma nova seção onde o administrador pode:

1. Ver todas as permissões disponíveis agrupadas por categoria
2. Ativar/desativar cada permissão individualmente usando switches
3. As permissões são salvas imediatamente ao clicar
4. Perfis pré-definidos (Admin, Comercial, Visualização) podem aplicar um conjunto padrão de permissões

### Exemplo Visual da Interface
```
┌─────────────────────────────────────────────────────┐
│  Permissões de João Silva                           │
├─────────────────────────────────────────────────────┤
│  📋 Leads                                           │
│  ├─ [✓] Visualizar leads                           │
│  ├─ [✓] Editar leads                               │
│  ├─ [ ] Exportar leads                             │
│  └─ [✓] Atribuir responsável                       │
│                                                     │
│  👥 Usuários                                        │
│  ├─ [ ] Ver lista de usuários                      │
│  └─ [ ] Gerenciar usuários                         │
│                                                     │
│  🔐 Sistema                                         │
│  └─ [ ] Gerenciar permissões                       │
└─────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Banco de Dados

Nova tabela `user_permissions`:

```sql
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission)
);
```

Nova tabela `permission_definitions` (catálogo de permissões disponíveis):

```sql
CREATE TABLE public.permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/App.tsx` | Reorganizar rotas |
| `src/pages/Dashboard.tsx` | Renomear Admin.tsx ou criar novo |
| `src/pages/LandingPage.tsx` | Mover conteúdo do Index atual |
| `src/hooks/usePermissions.ts` | Hook para verificar permissões do usuário |
| `src/components/admin/PermissionsPanel.tsx` | Interface de gerenciamento de permissões |
| `src/components/admin/AdminSidebar.tsx` | Atualizar links de navegação |
| `src/types/crm.ts` | Adicionar tipos de permissões |
| `supabase/functions/manage-user/index.ts` | Adicionar ações de permissão |

### Hook de Permissões

```typescript
// Exemplo de uso
const { hasPermission, permissions, isLoading } = usePermissions(userId);

if (hasPermission('leads.export')) {
  // Mostrar botão de exportar
}
```

### Segurança

- Apenas administradores podem modificar permissões
- A permissão `permissions.manage` é necessária para acessar o painel de permissões
- RLS policies protegem a tabela `user_permissions`
- Verificações são feitas tanto no frontend quanto no backend (Edge Function)

---

## Ordem de Implementação

1. **Banco de dados**: Criar tabelas e inserir permissões iniciais
2. **Hook de permissões**: Criar `usePermissions` para consumir as permissões
3. **Rotas**: Reorganizar App.tsx
4. **Landing page**: Mover para nova rota
5. **Dashboard**: Ajustar para ser a página inicial
6. **Sidebar**: Atualizar navegação
7. **Painel de permissões**: Criar interface de gerenciamento
8. **Edge Function**: Atualizar para suportar operações de permissão
9. **Integração**: Aplicar verificações de permissão nos componentes existentes

---

## Benefícios

- **Flexibilidade**: Controle granular sobre o que cada usuário pode fazer
- **Escalabilidade**: Novas funcionalidades podem ter suas próprias permissões
- **Auditoria**: Registro de quem concedeu cada permissão
- **Segurança**: Princípio do menor privilégio - usuários só têm acesso ao necessário
