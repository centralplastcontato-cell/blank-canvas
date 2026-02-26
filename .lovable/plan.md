
## Correção: Criar unidade automatica para empresas

### Problema
A empresa "Aventura Kids" não tem nenhuma unidade cadastrada na tabela `company_units`. O sistema de Materiais de Venda e outros módulos dependem de pelo menos uma unidade existir para funcionar.

### Solução

**1. Criar a unidade do Aventura Kids agora (Migration)**

Inserir na tabela `company_units` uma unidade com o mesmo nome da empresa:

```text
company_id: eb1776f0-142e-41db-9134-7d352d02c5bd
name: Aventura Kids
slug: aventura-kids
sort_order: 1
is_active: true
color: #3b82f6
```

**2. Criar unidade automaticamente ao criar empresa no Hub**

Editar `src/pages/HubEmpresas.tsx`, na funcao `handleCreate`:
- Apos inserir a empresa com sucesso, inserir automaticamente uma unidade padrao com o mesmo nome e slug da empresa na tabela `company_units`.
- Isso garante que toda nova empresa ja tenha pelo menos uma unidade funcional.

### Arquivos a editar
- Nova migration SQL — insere unidade para Aventura Kids
- `src/pages/HubEmpresas.tsx` — adiciona criacao automatica de unidade no `handleCreate`
