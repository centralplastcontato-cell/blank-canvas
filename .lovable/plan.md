

## Correcao da Rota /promo + Protecao Preventiva

### Problema principal
A rota `/promo` renderiza `LandingPage` (hardcoded para Castelo da Diversao) em qualquer dominio. Aventura Kids e Planeta Divertido mostram o site do Castelo ao acessar `/promo`.

### Solucao

**1. Criar `src/pages/PromoPage.tsx`** (novo arquivo)
Componente com deteccao de dominio, seguindo o mesmo padrao do `RootPage.tsx`:
- Dominios do Castelo (`castelodadiversao.com.br`, `castelodadiversao.online`) e preview/localhost: renderiza o `LandingPage` estatico atual
- Outros dominios conhecidos (aventurakids.online, buffetplanetadivertido.online): renderiza `DynamicLandingPage` com o dominio correspondente via `getKnownBuffetDomain()`
- Dominios desconhecidos: renderiza `NotFound`

**2. Modificar `src/App.tsx` (linha 79)**
- Trocar `<LandingPage />` por `<PromoPage />`
- Adicionar import do `PromoPage`

**3. (Preventivo) Proteger rota `/para-buffets`**
Adicionar guard de dominio para que paginas de marketing do Celebrei so aparecam em dominios do Hub ou preview, nao em dominios de buffets. Se acessada de um dominio de buffet, redireciona para `/`.

### Analise de risco pos-correcao
Apos essa correcao, **nenhuma outra rota** apresenta o problema de crossover entre buffets:
- `/` ja usa `RootPage` com deteccao de dominio
- Rotas admin usam autenticacao e CompanyContext
- Rotas publicas usam IDs/slugs na URL
- Rotas do Hub sao independentes

### Detalhes tecnicos

O `PromoPage` tera aproximadamente 25 linhas e seguira exatamente o padrao do `RootPage`:

```text
PromoPage
  |
  +-- isPreviewDomain() ou dominio do Castelo? --> LandingPage (promo statica)
  |
  +-- getKnownBuffetDomain() retorna dominio? --> DynamicLandingPage(domain)
  |
  +-- Dominio desconhecido --> NotFound
```

Para `/para-buffets`, sera adicionada uma verificacao simples no inicio do componente: se `getKnownBuffetDomain()` retorna um valor (ou seja, estamos em dominio de buffet), redireciona para `/` com `Navigate`.
