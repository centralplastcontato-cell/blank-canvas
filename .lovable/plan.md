
# Tornar a LP Dinâmica Realmente Única por Buffet

## O Problema

As seções **Benefícios** e **Oferta** da LP dinâmica estão com conteúdo hardcoded no código. Qualquer buffet que usar o sistema vai ter a mesma LP do Castelo da Diversão, o que é ruim comercialmente e pode gerar desconfiança dos clientes.

### O que está hardcoded hoje:
- 6 benefícios genéricos (Estrutura Completa, Brinquedos, Buffet Completo, Monitores, Instagramável, +10 Anos)
- 3 trust badges fixos (4.9/5 Google, +5.000 festas, 98% satisfação)
- Subtítulo "Há mais de 10 anos transformando sonhos..."
- 5 itens fixos no card "O que está incluso" da seção Oferta

## A Solução

Tornar tudo configurável por empresa, lido do banco de dados (campo JSON na tabela `company_landing_pages`).

## O Que Muda

### 1. Novo tipo: `LPBenefits` (em `types/landing-page.ts`)

Adicionar um tipo para benefícios personalizáveis:

```text
LPBenefitItem {
  icon: string          // nome do ícone Lucide (ex: "Castle", "Sparkles")
  title: string         // "Espaço Aconchegante"
  description: string   // "Capacidade para até 90 convidados..."
}

LPBenefits {
  enabled: boolean
  title: string                    // "Por que escolher o {nome}?"
  subtitle: string                 // "Há X anos fazendo festas..."
  items: LPBenefitItem[]           // lista de benefícios
  trust_badges: LPTrustBadge[]     // badges personalizáveis
}

LPTrustBadge {
  icon: string    // "Star", "PartyPopper", "Heart"
  text: string    // "4.8/5 no Google"
}
```

### 2. Adicionar `benefits_list` ao tipo `LPOffer`

O card "O que está incluso" passa a vir do banco:

```text
LPOffer {
  ...campos existentes...
  + benefits_list?: string[]   // ["Espaço aconchegante", "Monitores", ...]
}
```

### 3. Atualizar `DLPBenefits.tsx`

- Receber `benefits: LPBenefits` como prop (em vez de usar array hardcoded)
- Se `benefits.items` existir, usa os itens da empresa
- Se nao existir, usa o fallback atual (para nao quebrar LPs existentes)
- Trust badges vem de `benefits.trust_badges` ou fallback
- Subtítulo vem de `benefits.subtitle` ou fallback
- Mapear nomes de ícones (string) para componentes Lucide dinamicamente

### 4. Atualizar `DLPOffer.tsx`

- Ler `offer.benefits_list` para o card "O que está incluso"
- Se nao existir, usa o fallback atual

### 5. Migration SQL: adicionar coluna `benefits` e popular dados

- Adicionar coluna `benefits jsonb` na tabela `company_landing_pages`
- Popular o registro do Planeta Divertido com conteúdo único e personalizado
- Popular o registro do Castelo da Diversão com seu conteúdo atual

### 6. Conteúdo único do Planeta Divertido

**Benefícios personalizados:**
- "Espaço Aconchegante" — "Ambiente familiar para até 90 convidados, pensado para festas íntimas e especiais"
- "Atendimento Personalizado" — "Fernanda cuida de cada detalhe da sua festa pessoalmente"
- "Buffet Caseiro" — "Cardápio feito com carinho, com opções para crianças e adultos"
- "Monitores Dedicados" — "Profissionais preparados para garantir a diversão das crianças"
- "Localização Privilegiada" — "Na Avenida Mazzei, 692 — fácil acesso na Zona Norte de SP"
- "Flexibilidade" — "Pacotes adaptáveis ao que você precisa, sem surpresas"

**Trust badges do Planeta:**
- "Atendimento Nota 10"
- "Festas Personalizadas"
- "100% Familiar"

**Oferta — "O que está incluso":**
- "Espaço exclusivo e climatizado"
- "Buffet completo caseiro"
- "Equipe de monitores"
- "Decoração temática"
- "Estacionamento no local"

## Arquivos Modificados

1. `src/types/landing-page.ts` — adicionar `LPBenefits`, `LPBenefitItem`, `LPTrustBadge`, e `benefits_list` no `LPOffer`
2. `src/components/dynamic-lp/DLPBenefits.tsx` — ler benefícios e badges do prop em vez de hardcoded
3. `src/components/dynamic-lp/DLPOffer.tsx` — ler `benefits_list` do offer
4. `src/pages/DynamicLandingPage.tsx` — passar `benefits` para `DLPBenefits`
5. Migration SQL — adicionar coluna e popular dados do Planeta Divertido e Castelo

## O Que NAO Muda

- A LP estática do Castelo (`LandingPage.tsx`) — essa usa seus próprios componentes
- O chatbot (já corrigido)
- O tema, galeria, vídeo, depoimentos e footer — já são dinâmicos
- Nenhum componente de admin
