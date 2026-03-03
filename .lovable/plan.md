

## Plano: Nova LP "Mês do Consumidor" — Castelo da Diversão

### Isolamento garantido
A LP estática do Castelo vive em `src/components/landing/*` e `src/pages/LandingPage.tsx`, servida apenas via `PromoPage` para domínios `castelodadiversao.*` e preview. Outros buffets usam `DynamicLandingPage` (dados do Supabase). Zero risco de cruzamento.

### Mudanças

**1. Atualizar `src/config/campaignConfig.ts`**
- Trocar toda a campanha de "Esquenta de Carnaval" para "Mês do Consumidor"
- Novo título, subtítulo, tagline, benefícios (Decoração completa, Docinhos, Toalhas)
- Novo texto de urgência ("Apenas 10 bônus disponíveis")
- Novo `campaignId: "mes-consumidor-2026"`
- Atualizar `endDate` para final de março 2026

**2. Reescrever `src/components/landing/HeroSection.tsx`**
- Manter fundo com fotos das fachadas (crossfade mobile / split desktop)
- Novo título: "🎉 Mês do Consumidor no Castelo da Diversão"
- Novo subtítulo emocional sobre os 10 primeiros contratos
- Bloco de destaque com 3 bônus: 🎁 Decoração, 🍬 Docinhos, 🪑 Toalhas
- Texto emocional: "Uma festa completa para comemorar..."
- CTA: "Consultar datas disponíveis" → abre chatbot

**3. Reescrever `src/components/landing/BenefitsSection.tsx`** → "Experiência do Buffet"
- Novo título: "Uma festa inesquecível para seu filho"
- 5 cards com ícones: Brinquedos, Ambiente, Cardápio, Espaço familiar, Equipe
- Manter fotos reais existentes e animações

**4. Reescrever `src/components/landing/OfferSection.tsx`** → "Oferta do Mês do Consumidor"
- Fundo diferenciado com gradiente
- Título: "Promoção especial do mês do consumidor"
- Lista dos 3 bônus exclusivos
- Contador visual de escassez: "Apenas 10 bônus disponíveis"
- CTA: "Garantir minha festa"

**5. Atualizar `src/components/landing/InstagramSection.tsx`** → "Galeria / Prova Social"
- Novo título: "Momentos incríveis que já aconteceram aqui"
- Manter galeria de fotos existente (Manchester + Trujillo)
- Novo texto: "Centenas de famílias já comemoraram momentos inesquecíveis..."

**6. Reescrever `src/components/landing/UrgencySection.tsx`** → "Chamada Final"
- Título: "Garanta agora a data da festa do seu filho"
- Texto sobre datas esgotando
- CTA grande: "Consultar datas no WhatsApp"

**7. Atualizar `src/components/landing/Footer.tsx`**
- Manter estrutura; atualizar nome da campanha para "Mês do Consumidor 2026"

**8. Atualizar `src/pages/LandingPage.tsx`**
- Reordenar seções conforme o prompt: Hero → Benefits (Experiência) → Offer → Instagram (Galeria) → Urgency (Chamada Final) → Footer
- Remover seções que não constam no prompt (Testimonials, VideoGallery ficam opcionais — posso mantê-las ou remover)

**9. Atualizar `src/components/landing/FloatingCTA.tsx`**
- Texto: "Quero saber as datas disponíveis"

**10. Atualizar chatbot (`LeadChatbot.tsx`)**
- Mensagem de boas-vindas atualizada para contexto "Mês do Consumidor"
- Manter fluxo de captura de leads existente

### Arquivos criados/editados
- `src/config/campaignConfig.ts` (editar)
- `src/components/landing/HeroSection.tsx` (editar)
- `src/components/landing/BenefitsSection.tsx` (editar)
- `src/components/landing/OfferSection.tsx` (editar)
- `src/components/landing/InstagramSection.tsx` (editar)
- `src/components/landing/UrgencySection.tsx` (editar)
- `src/components/landing/Footer.tsx` (editar)
- `src/components/landing/FloatingCTA.tsx` (editar)
- `src/pages/LandingPage.tsx` (editar)

### O que NÃO muda
- `DynamicLandingPage` e `src/components/dynamic-lp/*` (outros buffets)
- `RootPage.tsx`, `PromoPage.tsx`, `useDomainDetection.ts` (roteamento)
- `LeadChatbot.tsx` (fluxo de captura mantido, só mensagem de boas-vindas)

