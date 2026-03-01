

## Cadastro e Gestao de Contatos de Clientes

### Objetivo
Criar um modulo completo para que os buffets possam cadastrar, visualizar, editar e excluir contatos de clientes diretamente na plataforma. Isso atende a sugestao recebida pelo ticket de suporte do Castelo da Diversao.

### O que sera criado

**1. Nova tabela no banco de dados: `company_contacts`**
- Campos: `id`, `company_id`, `name`, `phone`, `email`, `notes`, `tags` (jsonb), `created_at`, `updated_at`, `created_by`
- RLS: usuarios da empresa podem ver/criar/editar; admins da empresa e global admins podem deletar
- Vinculo opcional com leads existentes via campo `lead_id` (nullable)

**2. Nova pagina: `/contatos`**
- Seguira o mesmo layout das outras paginas (AdminSidebar no desktop, MobileMenu no mobile)
- Tabela responsiva com busca por nome/telefone
- Botao para adicionar novo contato (dialog/sheet)
- Edicao inline ou via sheet lateral
- Exclusao com confirmacao
- Filtro por tags

**3. Navegacao**
- Novo item no `AdminSidebar` e `MobileMenu` com icone `Contact`/`BookUser`
- Nova rota `/contatos` no `App.tsx`
- Controlado pelo modulo existente `crm` (ja ativo por padrao)

### Detalhes tecnicos

**Migracao SQL:**
```text
CREATE TABLE company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]',
  lead_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da empresa + admins globais
-- INSERT: membros da empresa + admins globais
-- UPDATE: membros da empresa + admins globais
-- DELETE: admins da empresa + admins globais
```

**Arquivos a criar:**
- `src/pages/Contatos.tsx` - Pagina principal com listagem, busca, filtros e CRUD
- `src/components/admin/ContactFormDialog.tsx` - Dialog para criar/editar contato

**Arquivos a modificar:**
- `src/App.tsx` - Adicionar rota `/contatos`
- `src/components/admin/AdminSidebar.tsx` - Adicionar item "Contatos" no menu (icone `BookUser`, condicionado a `modules.crm`)
- `src/components/admin/MobileMenu.tsx` - Adicionar item "Contatos" no menu mobile e no tipo `currentPage`

**Padrao de implementacao:**
- Usa `useCurrentCompanyId()` para filtrar por empresa
- Queries diretas ao Supabase (mesmo padrao de `LeadsTable`, `PackagesManager`)
- Toast para feedback de acoes
- Layout responsivo mobile-first seguindo o padrao de `Configuracoes.tsx`

