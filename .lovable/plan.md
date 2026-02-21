

## Problema: Tela de login do Planeta Divertido trava no loading

### Diagnóstico

A página `/auth/planeta-divertido` fica presa no spinner de carregamento infinito. A causa raiz é dupla:

1. **Falta de tratamento de erro**: O código em `Auth.tsx` (linhas 37-46) chama o RPC `get_company_branding_by_slug` sem um `.catch()`. Se a requisição falhar por qualquer motivo (rede, timeout, CORS), o estado `isLoadingCompany` permanece `true` para sempre, travando a tela no spinner.

2. **Frontend possivelmente desatualizado**: Alteracoes recentes no codigo podem nao ter sido publicadas no dominio customizado `buffetplanetadivertido.online`. O dominio customizado serve apenas a versao publicada.

### Solucao

#### 1. Adicionar tratamento de erro no Auth.tsx

Modificar a chamada RPC para incluir `.catch()`, garantindo que `isLoadingCompany` seja definido como `false` mesmo em caso de falha:

```typescript
// Auth.tsx linhas 37-46 — antes
supabase
  .rpc("get_company_branding_by_slug", { _slug: slug })
  .maybeSingle()
  .then(({ data }) => {
    if (data) {
      setCompanyName(data.name);
      setCompanyLogo(data.logo_url);
    }
    setIsLoadingCompany(false);
  });

// depois
supabase
  .rpc("get_company_branding_by_slug", { _slug: slug })
  .maybeSingle()
  .then(({ data }) => {
    if (data) {
      setCompanyName(data.name);
      setCompanyLogo(data.logo_url);
    }
  })
  .catch(() => {
    // silently fallback to default branding
  })
  .finally(() => {
    setIsLoadingCompany(false);
  });
```

#### 2. Publicar as alteracoes

Apos a correcao, clicar em **Publish > Update** para que o dominio customizado receba a versao mais recente do frontend.

### Arquivos modificados

- `src/pages/Auth.tsx` — adicionar `.catch()` e `.finally()` na chamada RPC de branding

