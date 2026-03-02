

## Super Admin: Acesso Global a Qualquer Empresa (sem criar registros)

### Como funciona hoje
O `CompanyContext` busca apenas as empresas onde o usuario esta cadastrado na tabela `user_companies`. O super admin so ve as empresas onde foi manualmente adicionado.

### O que muda
Apenas o arquivo `src/contexts/CompanyContext.tsx` sera modificado. Nenhum registro novo sera criado no banco de dados.

### Logica

1. Apos obter o usuario logado, chamar `supabase.rpc('is_admin', { _user_id: user.id })`
2. Se retornar `true`:
   - Buscar TODAS as empresas ativas: `SELECT * FROM companies WHERE is_active = true`
   - Montar a lista de `userCompanies` em memoria com `role: 'owner'` para cada empresa
   - Essas entradas existem apenas no estado React, nao no banco
3. Se retornar `false`: manter o fluxo atual (buscar `user_companies`)

### Resultado
- O `CompanySwitcher` exibe todas as empresas do sistema para o super admin
- Ao selecionar qualquer empresa, o `currentCompanyId` muda e todas as queries filtradas mostram os dados daquela empresa
- Nenhum INSERT em `user_companies` e feito
- Usuarios normais continuam vendo apenas suas empresas

### Detalhe tecnico

```text
fetchUserCompanies():
  user = getUser()
  isAdmin = rpc('is_admin', user.id)
  
  SE isAdmin:
    allCompanies = SELECT * FROM companies WHERE is_active = true
    userCompanies = allCompanies.map(c => ({ company: c, role: 'owner' }))  // apenas em memoria
  SENAO:
    userCompanies = SELECT FROM user_companies WHERE user_id = user.id  // fluxo atual
```

### Arquivo modificado
- `src/contexts/CompanyContext.tsx` — adicionar verificacao `is_admin` e carregamento virtual de todas as empresas

