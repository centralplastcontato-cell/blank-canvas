
## Limitacao Importante e Solucao Proposta

### O Problema Fundamental

Crawlers do WhatsApp e Facebook **nao executam JavaScript**. Eles acessam diretamente a URL compartilhada e leem o HTML estatico. Como ambos os dominios (`hubcelebrei.com.br` e `castelodadiversao.online`) servem o mesmo `index.html` pelo CDN do Lovable, **nao e possivel interceptar o request no nivel do CDN** para servir HTML diferente por dominio.

Uma Edge Function do Supabase vive em `rsezgnkfhodltrsewlhz.supabase.co/functions/v1/...` -- ela nao intercepta o trafego dos dominios customizados.

### Solucao: Edge Function como "Proxy de Preview"

A abordagem viavel e criar uma Edge Function `og-preview` que:
1. Recebe o dominio como parametro (ou detecta via header `Referer`/`Origin`)
2. Retorna HTML completo com meta tags OG especificas para aquele dominio
3. Inclui um `<meta http-equiv="refresh">` para redirecionar usuarios humanos para o site real

**Uso pratico**: Ao inves de compartilhar `https://www.castelodadiversao.online` diretamente, compartilha-se:
`https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/og-preview?domain=castelodadiversao`

O crawler ve as meta tags do Castelo. O usuario humano e redirecionado para o site.

### Implementacao

**1. Criar Edge Function `og-preview`** (`supabase/functions/og-preview/index.ts`)

- Detecta o parametro `domain` na query string
- Mapeia dominios para seus metadados:
  - `hubcelebrei` -> titulo "Celebrei", imagem `/og-para-buffets.jpg`, descricao da plataforma
  - `castelodadiversao` -> titulo "Castelo da Diversao", imagem do logo/og do Castelo, descricao do buffet
  - Dominios dinamicos -> busca dados da tabela `companies` + `company_landing_pages`
- Retorna HTML com OG tags e redirect automatico

- Para dominios dinamicos (outros buffets), busca `company_name`, `logo_url` e dados da landing page na tabela `companies` via `custom_domain`

**2. Atualizar `supabase/config.toml`**

- Adicionar `[functions.og-preview]` com `verify_jwt = false`

**3. Adicionar imagem OG do Castelo**

- Sera necessario ter uma imagem OG do Castelo da Diversao disponivel publicamente (pode ser no bucket `landing-pages` ou na pasta `public/`)

### Exemplo do HTML retornado para Castelo

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="Castelo da Diversao | Buffet Infantil" />
  <meta property="og:description" content="O melhor buffet infantil..." />
  <meta property="og:image" content="https://url-da-imagem-do-castelo.jpg" />
  <meta property="og:url" content="https://www.castelodadiversao.online" />
  <meta http-equiv="refresh" content="0;url=https://www.castelodadiversao.online" />
</head>
<body>Redirecionando...</body>
</html>
```

### Limitacao desta abordagem

- A URL compartilhada no WhatsApp sera a URL da Edge Function (longa), nao o dominio bonito do buffet
- Para resolver isso de forma definitiva, seria necessario um servico externo (Cloudflare Worker, por exemplo) no dominio do Castelo que intercepte crawlers antes de servir o SPA

### Consideracao sobre o index.html

O `index.html` atual continuara com os metadados da Celebrei. Quando alguem compartilhar diretamente `castelodadiversao.online`, o preview mostrara Celebrei. A Edge Function so funciona quando a URL compartilhada e a da propria function.
