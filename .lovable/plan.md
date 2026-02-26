

## Paginacao no Kanban + Reduzir para 20 leads por pagina

### O que muda

1. **Kanban passa a ser paginado** - Em vez de carregar 2.000 leads de uma vez, carrega apenas 20 por pagina (igual ao modo lista)
2. **Page size reduzido de 50 para 20** - Afeta tanto o modo lista quanto o Kanban, reduzindo o consumo em 99%

### Impacto nos dados

| Cenario | Antes | Depois |
|---------|-------|--------|
| Abrir Kanban | 2.000 leads | 20 leads |
| Abrir Lista | 50 leads | 20 leads |
| Reducao total | - | **99%** |

Na pratica, com o filtro "Hoje" ativo (5-15 leads por dia), tudo vai caber em 1 pagina na maioria dos dias.

### Alteracoes

**Arquivo: `src/pages/CentralAtendimento.tsx`**
- Linha 83: Mudar `pageSize = 50` para `pageSize = 20`
- Linhas 244-249: Remover o bloco que aplica `limit(2000)` no Kanban, usar `.range(from, to)` sempre
- Adicionar controles de paginacao (Anterior/Proximo) abaixo do Kanban nos layouts mobile (~linha 958) e desktop (~linha 1327)

**Arquivo: `src/pages/Admin.tsx`**
- Linha 70: Mudar `pageSize = 50` para `pageSize = 20`

### O que NAO muda
- Filtros continuam funcionando normalmente
- As 10 colunas do Kanban continuam existindo
- O filtro "Hoje" continua ativo por padrao
- Modo lista continua igual (so com 20 em vez de 50)

