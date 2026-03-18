

## Plano: Substituir a Hub LP por uma nova LP de Vídeo + Formulário de Demonstração

### Contexto

A Hub LP atual (hubcelebrei.com.br / celebrei.com.br) mostra features, stats e um wizard de prospecção. Vamos substituir o conteúdo por uma LP focada no vídeo HeyGen + formulário de demo, mantendo a mesma estrutura de roteamento (apenas domínios Hub veem essa página — nenhum buffet é afetado).

### Segurança de roteamento

Nenhuma alteração no roteamento. O `RootPage` já garante que:
- Domínios Hub → `HubLandingPage` (que será atualizado)
- Domínios de buffet → `DynamicLandingPage` ou `LandingPage`
- Preview/localhost → `LandingPage` (Castelo)

### O que muda

**Arquivo: `src/pages/HubLandingPage.tsx`** — Reestruturar para nova LP com seções:

1. **Header** — Manter `HubHeader` (logo Celebrei + botão CTA)
2. **Hero com Vídeo** — Nova seção principal:
   - Headline forte ("Pare de perder festas")
   - Embed do vídeo HeyGen (iframe/player com URL configurável)
   - CTA primário que abre o wizard
3. **Prova Social rápida** — Métricas (10+ buffets, 5k+ leads, 24/7)
4. **Features resumidas** — 3-4 cards com os diferenciais principais (reutilizar ou simplificar `HubFeatures`)
5. **CTA Final** — Manter `HubCTA`
6. **Footer** — Manter `HubFooter`
7. **Wizard** — Manter `HubProspectWizard` (formulário de demonstração já existente)

**Arquivo: `src/components/hub-landing/HubHero.tsx`** — Substituir o mockup da direita por um player de vídeo embed (YouTube/HeyGen). Adicionar prop `videoUrl` com fallback para o mockup atual caso não tenha vídeo ainda.

### Componentes reutilizados (sem alteração)
- `HubHeader`, `HubFooter`, `HubCTA`, `HubProspectWizard` — permanecem iguais
- O wizard já funciona como formulário de demonstração (5 etapas, submete via Edge Function)

### Componentes simplificados
- `HubFeatures` — Reduzir de 12 cards para 4 destaques principais, visual mais limpo
- `HubStats` — Pode ser integrado diretamente no Hero ou removido como seção separada

### Resultado
- LP focada em conversão: vídeo + CTA + formulário
- Aparece **apenas** em hubcelebrei.com.br e celebrei.com.br
- Nenhum buffet é afetado (roteamento inalterado)
- O vídeo HeyGen pode ser facilmente trocado atualizando a URL

