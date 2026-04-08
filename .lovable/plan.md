

## Promoção de Páscoa — Castelo da Diversão

Entendi perfeitamente. As imagens são referência dos anúncios Meta, e a landing page (castelodadiversao.online / .com.br) precisa refletir essa mesma promoção de Páscoa. Aqui está o plano:

### O que muda

**1. Atualizar `campaignConfig.ts` com a promoção de Páscoa**
- Título: "Promoção de Páscoa"
- Tagline: "🐰 Promoção de Páscoa no Castelo da Diversão"
- Oferta principal: "10 crianças até 8 anos FREE" + parcelamento em até 10x no cartão
- Benefits: Estrutura completa, Brinquedos incríveis, Equipe especializada, Alimentação de qualidade
- Data de expiração da promoção (definir prazo da Páscoa — ex: 20 de abril de 2026)
- Campaign ID: `pascoa-2026`

**2. Atualizar o HeroSection com tema de Páscoa**
- Trocar o título principal para destacar a promoção: "Promoção de Páscoa 🐰" + "10 crianças até 8 anos FREE!"
- Subtítulo mencionando parcelamento em 10x
- Confetti com cores de Páscoa (verde, amarelo, lilás, rosa)
- Badge do tag "PROMOÇÃO DE PÁSCOA" no topo

**3. Adicionar OfferSection e UrgencySection na LandingPage**
- Atualmente a `LandingPage.tsx` não renderiza `OfferSection` nem `UrgencySection` — serão adicionadas entre as seções existentes
- OfferSection exibirá os benefícios da promo e CTA
- UrgencySection com countdown até o fim da promoção
- Trocar labels de "MÊS DO CONSUMIDOR" para "PROMOÇÃO DE PÁSCOA" nos componentes

**4. Atualizar labels hardcoded nos componentes**
- `OfferSection.tsx`: badge "MÊS DO CONSUMIDOR" → "PROMOÇÃO DE PÁSCOA" (usar `campaignConfig.campaignName`)
- `UrgencySection.tsx`: idem

### Arquivos modificados
- `src/config/campaignConfig.ts` — dados da campanha
- `src/components/landing/HeroSection.tsx` — título/subtítulo de Páscoa
- `src/components/landing/OfferSection.tsx` — badge dinâmico
- `src/components/landing/UrgencySection.tsx` — badge dinâmico
- `src/pages/LandingPage.tsx` — incluir OfferSection + UrgencySection

### Pergunta rápida
Preciso confirmar a data limite da promoção para o countdown.

