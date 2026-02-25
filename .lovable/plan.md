

## Trocar a LP do castelodadiversao.online para Dynamic Landing Page

Atualmente, o dominio `castelodadiversao.online` serve a LP estatica com a campanha de Carnaval. O dominio `castelodadiversao.com.br` ja serve a LP dinamica (puxando dados do banco). O objetivo e fazer os dois dominios usarem a mesma LP dinamica.

### O que muda

1. **`src/hooks/useDomainDetection.ts`** -- Adicionar `castelodadiversao.online` no mapa `KNOWN_BUFFET_DOMAINS`, apontando para o mesmo dominio usado na busca do banco.

2. **`src/pages/RootPage.tsx`** -- Remover o bloco especial que trata `castelodadiversao.online` como LP estatica. Com o dominio agora mapeado em `KNOWN_BUFFET_DOMAINS`, ele sera resolvido automaticamente como `DynamicLandingPage`.

3. **`index.html`** -- Verificar se o bloco de meta tags dinamicas ja cobre o dominio `.online` (atualmente cobre `.com.br`). Ajustar o mapeamento de branding para incluir `.online` tambem.

### Detalhes tecnicos

**useDomainDetection.ts** -- Adicionar entrada:
```
"castelodadiversao.online": "castelodadiversao.com.br"
```
Isso faz o `.online` usar o mesmo registro de LP do `.com.br` no banco.

**RootPage.tsx** -- Remover as linhas:
```
if (canonical === "castelodadiversao.online") {
  return <LandingPage />;
}
```
O dominio agora sera capturado pelo bloco `getKnownBuffetDomain()` logo abaixo.

**index.html** -- Adicionar `castelodadiversao.online` ao mesmo bloco de branding do Castelo para que as meta tags OG sejam corretas.

### Resultado

Os dois dominios (`.online` e `.com.br`) vao exibir exatamente a mesma LP dinamica, com conteudo gerenciado pelo banco de dados -- sem mais campanha de Carnaval.

