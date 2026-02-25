
## Unificar LP: Trocar "Esquenta de Carnaval" pela LP Dinâmica

### Problema atual
- O preview (lovable.app / localhost) carrega `LandingPage` (estática, hardcoded com "Esquenta de Carnaval")
- Os domínios `.com.br` e `.online` já carregam a `DynamicLandingPage` do banco de dados

### Solução
Alterar o `RootPage.tsx` para que o preview também carregue a `DynamicLandingPage` com o domínio `castelodadiversao.com.br`, igualando o comportamento de todos os domínios.

### Alteracao

**Arquivo: `src/pages/RootPage.tsx`**
- Trocar o bloco `isPreviewDomain()` que retorna `<LandingPage />` para retornar `<DynamicLandingPage domain="castelodadiversao.com.br" />`
- Remover o import de `LandingPage` (fica sem uso)

Resultado: preview, `.online` e `.com.br` vao mostrar a mesma LP dinâmica do banco de dados.

Nota: O arquivo `LandingPage.tsx` e seus componentes (HeroSection, OfferSection, etc.) e o `campaignConfig.ts` continuam existindo no código caso sejam necessários no futuro, mas não serão mais carregados na rota `/`.
