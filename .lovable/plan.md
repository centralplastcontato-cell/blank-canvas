
## Remover pagina /contatos e link no menu

### O que sera feito

Remover a pagina standalone de Contatos e todas as referencias a ela nos menus de navegacao, ja que a funcionalidade de Leads de Base dentro da aba Campanhas cumpre o mesmo papel.

### Arquivos afetados

**1. `src/App.tsx`**
- Remover o import de `Contatos` (linha 39)
- Remover a rota `<Route path="/contatos" ...>` (linha 101)

**2. `src/components/admin/AdminSidebar.tsx`**
- Remover o item `{ title: "Contatos", url: "/contatos", icon: BookUser }` do array `allItems` (linha 58)
- Remover o import do icone `BookUser` se nao for mais usado

**3. `src/components/admin/MobileMenu.tsx`**
- Remover `"contatos"` do union type de `currentPage` (linha 33)
- Remover o item `{ id: "contatos", label: "Contatos", ... }` do array `menuItems` (linhas 104-110)
- Remover o import do icone `BookUser` se nao for mais usado

### Arquivo NAO removido

- `src/pages/Contatos.tsx` e `src/components/admin/ContactFormDialog.tsx` serao mantidos no repositorio por enquanto (codigo morto inofensivo). Se preferir, posso remove-los tambem.

### Sem impacto no banco de dados

A tabela `company_contacts` permanece intacta. Nenhuma migration necessaria.
