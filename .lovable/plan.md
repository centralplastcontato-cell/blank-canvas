
## Paginacao e Ordem Alfabetica nos Leads de Base

### Problema
A lista de leads de base carrega todos os registros de uma vez sem paginacao e esta ordenada por data de criacao (mais recente primeiro). Com 26+ contatos, a lista fica longa no mobile. Alem disso, o usuario quer que novos leads ja aparecam na posicao alfabetica correta.

### Mudancas

**Arquivo: `src/components/campanhas/BaseLeadsTab.tsx`**

1. **Ordenacao alfabetica**: Trocar `.order("created_at", { ascending: false })` por `.order("name", { ascending: true })` na query do Supabase. Isso garante que tanto os leads existentes quanto os novos ja venham em ordem alfabetica diretamente do banco.

2. **Paginacao de 20 em 20**: Adicionar estado `currentPage` e calcular `paginatedLeads` a partir do array `filtered`, exibindo apenas 20 itens por pagina. Usar os componentes de paginacao ja existentes no projeto (`Pagination`, `PaginationContent`, `PaginationItem`, etc. de `@/components/ui/pagination`).

3. **Contador atualizado**: O texto "X contatos" continua mostrando o total filtrado, e a paginacao aparece abaixo da lista quando ha mais de 20 resultados.

4. **Reset de pagina na busca**: Quando o usuario digitar na busca, a pagina volta para 1 automaticamente.

### Comportamento esperado

- Lista ordenada de A-Z por nome
- Novos leads adicionados ou importados ja aparecem na posicao correta (a query recarrega ordenada)
- Paginacao com botoes Anterior/Proximo e numeros de pagina
- 20 contatos por pagina
- Busca reseta para pagina 1
- Contagem total visivel (ex: "26 contatos - Pagina 1 de 2")

### Detalhes tecnicos

```text
Estado novo:
  - currentPage: number (default 1)

Query alterada:
  - .order("name", { ascending: true })  // era created_at desc

Memo paginado:
  - paginatedLeads = filtered.slice((currentPage - 1) * 20, currentPage * 20)

Paginacao UI:
  - Componentes de src/components/ui/pagination.tsx
  - Aparece somente quando filtered.length > 20
```

Apenas o arquivo `BaseLeadsTab.tsx` sera modificado. Nenhuma dependencia nova necessaria.
