

# Renomear para "Operacoes" e adicionar aba "Pacotes"

## O que muda

- O menu lateral e mobile passam a mostrar **"Operacoes"** em vez de "Documentos"
- A pagina ganha uma terceira aba: **Formularios | Checklist | Pacotes**
- Na aba Pacotes, um CRUD simples para cadastrar pacotes com **nome** e **descricao**
- Pode criar, editar e excluir pacotes

## Banco de Dados

Nova tabela `company_packages`:

```text
id              uuid PK
company_id      uuid NOT NULL (FK -> companies)
name            text NOT NULL
description     text
is_active       boolean DEFAULT true
sort_order      integer DEFAULT 0
created_at      timestamptz
updated_at      timestamptz
```

RLS seguindo o padrao existente: SELECT para membros da empresa, ALL para admins/owners.

## Arquivos

1. **Criar:** Migracao SQL para `company_packages` com RLS
2. **Criar:** `src/components/admin/PackagesManager.tsx` -- CRUD de pacotes (cards + dialog), mesmo padrao visual do ChecklistTemplateManager
3. **Editar:** `src/pages/Formularios.tsx` -- renomear titulos para "Operacoes", adicionar aba "Pacotes" com icone Package
4. **Editar:** `src/components/admin/AdminSidebar.tsx` -- trocar label "Documentos" para "Operacoes"
5. **Editar:** `src/components/admin/MobileMenu.tsx` -- trocar label "Documentos" para "Operacoes"

