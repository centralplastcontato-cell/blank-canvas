
# Corrigir vazamento de notificacoes entre empresas (problema no backend)

## Diagnostico

O problema NAO esta no frontend (os filtros dos banners ja estao corretos). O erro esta no **backend**: as Edge Functions `wapi-webhook` e `follow-up-check` criam notificacoes para usuarios de TODAS as empresas porque consultam `user_permissions` e `user_roles` **sem filtrar por company_id**.

### Prova concreta

A usuaria Fernanda do Planeta Divertido (`7f89aad1...`) tem a permissao `leads.unit.all`. Quando o Castelo da Diversao recebe um lead, o webhook busca todos os usuarios com `leads.unit.all` no sistema inteiro e cria notificacoes para todos eles - incluindo a Fernanda que pertence a outra empresa.

Resultado: 20+ notificacoes do Castelo da Diversao no painel do Planeta Divertido.

## Locais afetados

### 1. `supabase/functions/wapi-webhook/index.ts` - 5 pontos

Todos os blocos de criacao de notificacao seguem o mesmo padrao defeituoso:

```text
// ATUAL (errado): busca em TODAS as empresas
const { data: adminRoles } = await supabase
  .from('user_roles').select('user_id').eq('role', 'admin');
const { data: userPerms } = await supabase
  .from('user_permissions').select('user_id')
  .eq('granted', true)
  .in('permission', [unitPermission, 'leads.unit.all']);
```

A correcao eh restringir aos usuarios da empresa usando `user_companies`:

```text
// CORRETO: filtra apenas usuarios da empresa
const { data: companyUsers } = await supabase
  .from('user_companies')
  .select('user_id')
  .eq('company_id', instance.company_id);

const companyUserIds = new Set(companyUsers?.map(u => u.user_id) || []);

// Agora buscar permissoes apenas entre esses usuarios
const { data: userPerms } = await supabase
  .from('user_permissions')
  .select('user_id')
  .eq('granted', true)
  .in('permission', [unitPermission, 'leads.unit.all'])
  .in('user_id', Array.from(companyUserIds));
```

#### Locais exatos no wapi-webhook:

| Linha  | Tipo de notificacao | Descricao |
|--------|-------------------|-----------|
| ~1183  | flow_handoff      | Flow Builder transferencia |
| ~1398  | existing_client   | Flow Builder cliente existente |
| ~1970  | existing_client   | Bot classico cliente existente |
| ~2077  | work_interest     | Interesse em trabalhar |
| ~2250  | visit/questions   | Proximos passos do bot |

### 2. `supabase/functions/follow-up-check/index.ts` - 1 ponto

Linha ~549: busca `user_permissions` sem filtrar por empresa.

```text
// ATUAL (errado)
const { data: usersToNotify } = await supabase
  .from("user_permissions")
  .select("user_id")
  .or(`permission.eq.leads.unit.all,...`)
  .eq("granted", true);
```

Correcao: intersecionar com `user_companies` para garantir que so usuarios da empresa recebam.

### 3. Trigger `fn_notify_temperature_change` (banco de dados)

Este ja esta **CORRETO** - usa `user_companies.company_id = NEW.company_id`. Nenhuma mudanca necessaria.

### 4. Funcao `follow-up-check` - stale alerts (linha ~1058)

Esta tambem **CORRETO** - usa `user_companies.company_id`. Nenhuma mudanca necessaria.

## Estrategia de implementacao

Para cada um dos 6 pontos defeituosos (5 no webhook + 1 no follow-up), aplicar o mesmo padrao:

1. Buscar `user_companies` filtrado por `company_id`
2. Criar um Set com os user_ids dessa empresa
3. Filtrar `user_permissions` e `user_roles` apenas entre esses user_ids

Isso cria uma funcao helper reutilizavel para evitar duplicacao:

```typescript
async function getCompanyNotificationTargets(
  supabase: any,
  companyId: string,
  unitPermission: string
): Promise<string[]> {
  // 1. Get users that belong to this company
  const { data: companyUsers } = await supabase
    .from('user_companies')
    .select('user_id')
    .eq('company_id', companyId);

  const companyUserIds = new Set(
    companyUsers?.map((u: any) => u.user_id) || []
  );

  if (companyUserIds.size === 0) return [];

  // 2. Filter by permissions within company users
  const { data: userPerms } = await supabase
    .from('user_permissions')
    .select('user_id')
    .eq('granted', true)
    .in('permission', [unitPermission, 'leads.unit.all'])
    .in('user_id', Array.from(companyUserIds));

  // 3. Admin roles within company users
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .in('user_id', Array.from(companyUserIds));

  const targetIds = new Set<string>();
  userPerms?.forEach((p: any) => targetIds.add(p.user_id));
  adminRoles?.forEach((r: any) => targetIds.add(r.user_id));

  return Array.from(targetIds);
}
```

### 5. Limpeza de dados

Apos o deploy, limpar as notificacoes erradas do banco:

```sql
DELETE FROM notifications
WHERE user_id = '7f89aad1-4167-496d-8ab8-85a996a58fea'
AND company_id = 'a0000000-0000-0000-0000-000000000001';
```

## Resumo

- **6 correcoes** em 2 Edge Functions
- **1 funcao helper** reutilizavel para evitar duplicacao
- **1 limpeza de dados** para remover notificacoes erradas existentes
- **0 mudancas no frontend** (filtros ja estao corretos)
- Deploy das funcoes `wapi-webhook` e `follow-up-check`
