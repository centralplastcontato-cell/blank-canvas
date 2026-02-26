
## Sincronizar Alteração de Email com Supabase Auth

### Problema
Quando um administrador edita o email de um usuário, apenas a tabela `profiles` é atualizada. A tabela `auth.users` (usada para login) permanece com o email antigo, impedindo o login com o email corrigido.

### Alterações Necessárias

#### 1. Edge Function `manage-user` (Backend)
**Arquivo:** `supabase/functions/manage-user/index.ts`

Dentro da ação `update` (linhas 198-242), adicionar tratamento para o campo `email`:
- Quando `email` for fornecido no body da requisição:
  - Atualizar `auth.users` via `supabaseAdmin.auth.admin.updateUserById(user_id, { email })`
  - Atualizar `profiles.email` na mesma operação
- Isso garante que ambas as tabelas fiquem sincronizadas

#### 2. Interface Hub - Edição de Email (Desktop)
**Arquivo:** `src/components/hub/HubUserCompanySection.tsx`

- Expandir o modo de edição inline (que hoje edita apenas o nome) para incluir um campo de email
- Adicionar estado `editEmail` junto com `editName`
- Chamar um novo callback `onUpdateEmail` ao salvar

#### 3. Página HubUsers - Nova Função
**Arquivo:** `src/pages/HubUsers.tsx`

- Adicionar função `handleUpdateEmail` que chama `manage-user` com `action: "update"` e o campo `email`
- Passar a função como prop para `HubUserCompanySection`

#### 4. Interface Mobile - Edição de Email
**Arquivo:** `src/components/admin/UserCard.tsx`

- Adicionar campo de email no dialog de edição existente (que hoje edita apenas o nome)
- Chamar o callback de atualização de email junto com o nome

---

### Detalhes Técnicos

Lógica de atualização de email na edge function:
```text
if (body.email) {
  1. supabaseAdmin.auth.admin.updateUserById(user_id, { email })  -> atualiza auth.users
  2. profiles.update({ email })                                    -> atualiza tabela profiles
}
```

### Correção Imediata
Após implementar, o email da Fernanda (`fernandaplanetadivertido@gmail.com`) já estará corrigido no `profiles`, e poderemos atualizar via a nova funcionalidade ou diretamente no banco para sincronizar com `auth.users`.
