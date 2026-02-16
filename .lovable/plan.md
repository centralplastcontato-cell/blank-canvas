

## Seção "Dados da Empresa" nas Configurações

Adicionar uma nova aba nas Configurações do buffet para que gestores e owners possam editar o logo, nome e dados basicos da empresa diretamente, sem depender do Hub.

---

### O que sera feito

1. **Nova aba "Empresa"** no componente `WhatsAppConfig.tsx` -- sera a primeira aba da lista, com icone de `Building2`. Visivel para owners e admins da empresa (usando o role do `CompanyContext`).

2. **Novo componente `CompanyDataSection.tsx`** em `src/components/whatsapp/settings/` com:
   - Logo da empresa (upload para o bucket `company-logos` ja existente + preview)
   - Nome da empresa (editavel)
   - Slug (somente leitura, informativo)
   - Dominio customizado (editavel)
   - Botao "Salvar alteracoes"

3. **Correcao da RLS policy** da tabela `companies` para UPDATE -- a policy atual tem um bug (`uc.company_id = uc.id` deveria ser `uc.company_id = companies.id`), o que impede owners/admins de atualizar os dados.

---

### Detalhes Tecnicos

**Arquivo: `src/components/whatsapp/settings/CompanyDataSection.tsx`** (novo)
- Usa `useCompany()` do `CompanyContext` para obter `currentCompany` e `refreshCompanies`
- Carrega dados atuais da empresa
- Upload de logo via Supabase Storage (bucket `company-logos`, ja publico)
- Ao salvar, faz `supabase.from('companies').update(...)` e chama `refreshCompanies()`

**Arquivo: `src/components/whatsapp/WhatsAppConfig.tsx`** (editado)
- Adicionar nova entrada "Empresa" no array `allConfigSections` como primeiro item
- Permissao: visivel apenas para owners/admins (nova verificacao via `CompanyContext`)
- Adicionar case "company" no `renderContent()`

**Arquivo: `src/components/whatsapp/settings/index.ts`** (editado)
- Exportar o novo `CompanyDataSection`

**Migracao SQL** -- corrigir a RLS policy de UPDATE na tabela `companies`:
```text
DROP POLICY "Company admins can update companies" ON public.companies;
CREATE POLICY "Company admins can update companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = companies.id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'admin')
    )
  );
```

