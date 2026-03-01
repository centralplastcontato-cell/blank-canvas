
# Correcao de search_path Mutavel em 5 Funcoes de Banco

## Problema

Cinco funcoes `SECURITY DEFINER` no banco nao possuem `SET search_path TO 'public'`, o que permite potencial manipulacao do search_path por um atacante para redirecionar chamadas a tabelas/funcoes maliciosas.

## Funcoes Afetadas

| Funcao | Risco |
|--------|-------|
| `get_landing_page_by_slug(_slug)` | Acesso publico (LP) |
| `get_landing_page_by_domain(_domain)` | Acesso publico (LP) |
| `get_company_id_by_slug(_slug)` | Acesso publico |
| `get_company_branding_by_domain(_domain)` | Acesso publico |
| `get_company_branding_by_domain_fuzzy(_base)` | Acesso publico |

## Correcao

Uma unica migration SQL com `CREATE OR REPLACE FUNCTION` para cada uma das 5 funcoes, adicionando `SET search_path TO 'public'` sem alterar nenhuma logica existente.

## Detalhes Tecnicos

A migration executara:

```sql
CREATE OR REPLACE FUNCTION public.get_landing_page_by_slug(...)
  ... (mesmo corpo)
  SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.get_company_id_by_slug(...)
  ... (mesmo corpo)
  SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.get_landing_page_by_domain(...)
  ... (mesmo corpo)
  SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.get_company_branding_by_domain(...)
  ... (mesmo corpo)
  SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.get_company_branding_by_domain_fuzzy(...)
  ... (mesmo corpo)
  SET search_path TO 'public';
```

Nenhuma alteracao de codigo frontend e necessaria -- apenas a migration no banco.
