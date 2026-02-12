
# Titulo dinamico nas abas do navegador por dominio

## Problema
O `index.html` tem um titulo estatico "Celebrei | A melhor plataforma para buffets infantis" que aparece em todas as abas do navegador, independente do dominio acessado. Quando alguem acessa `www.castelodadiversao.online`, a aba mostra "Celebrei" em vez de "Castelo da Diversao".

## Solucao
Usar o `react-helmet-async` (ja instalado e configurado no projeto) para definir o titulo e meta tags dinamicamente em cada pagina, respeitando o dominio/marca.

## Alteracoes

### 1. `src/pages/LandingPage.tsx` (Castelo da Diversao)
Adicionar `<Helmet>` com titulo "Castelo da Diversao | Buffet Infantil" e meta tags OG apontando para o dominio correto (`www.castelodadiversao.online`).

### 2. `src/pages/DynamicLandingPage.tsx` (LPs dinamicas por dominio)
Adicionar `<Helmet>` usando os dados ja carregados (`data.company_name`, `data.hero`, `data.company_logo`) para definir titulo e meta tags OG dinamicamente para cada empresa.

### 3. `src/pages/HubLandingPage.tsx` (Hub Celebrei)
Adicionar `<Helmet>` com titulo "Celebrei | A melhor plataforma para buffets infantis" -- assim o titulo so aparece quando realmente e o dominio do Hub.

### 4. Paginas internas (Auth, CentralAtendimento, Index/Dashboard, etc.)
Adicionar `<Helmet>` com titulos descritivos simples:
- Auth: "Login"
- CentralAtendimento/Atendimento: "Atendimento"
- Dashboard: "Dashboard"
- Configuracoes: "Configuracoes"
- Users: "Usuarios"

Cada titulo sera prefixado com o nome da empresa quando disponivel (ex: "Castelo da Diversao - Atendimento").

### 5. `index.html` -- manter como esta
O titulo estatico do `index.html` serve como fallback enquanto o React nao carrega. O `<Helmet>` sobrescreve automaticamente assim que a pagina renderiza.

## Resultado
- `www.castelodadiversao.online` mostra "Castelo da Diversao | Buffet Infantil" na aba
- `hubcelebrei.com.br` mostra "Celebrei | A melhor plataforma para buffets infantis"
- Dominios customizados de empresas mostram o nome da empresa
- Paginas internas mostram o contexto correto

## Detalhes tecnicos
- O `react-helmet-async` ja esta instalado e o `<HelmetProvider>` ja envolve o `<App>` no `main.tsx`
- Basta importar `{ Helmet } from "react-helmet-async"` e adicionar o componente `<Helmet>` com `<title>` dentro do JSX de cada pagina
- Para as LPs dinamicas, o titulo sera `{data.company_name} | Buffet Infantil` usando os dados ja disponíveis no state
