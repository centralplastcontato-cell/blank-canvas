

## LP Aventura Kids -- Implementacao via DLP

### Resumo

Criar a Landing Page da Aventura Kids utilizando a infraestrutura DLP existente. O chatbot (LeadChatbot) permanece intacto -- ele ja recebe `companyId`, `companyName`, `companyLogo` e `lpBotConfig` automaticamente. Precisamos criar **2 novos componentes genericos** (Social Proof e Como Funciona), ajustar o Hero para suportar botao secundario WhatsApp, e inserir os dados JSONB no banco.

### O que NAO muda

- **LeadChatbot**: continua identico, recebendo logo e nome da empresa via props
- **Roteamento**: `aventurakids.online` ja esta mapeado em `useDomainDetection.ts`
- **RPCs**: `get_landing_page_by_domain` ja funciona

### Novos componentes

#### 1. `src/components/dynamic-lp/DLPSocialProof.tsx`
Secao de prova social com contadores animados e texto de credibilidade.

- Recebe novo tipo `LPSocialProof` com `enabled`, `items: { value, label }[]`, `text`
- Visual: numeros grandes animados ao entrar na viewport, cards com sombra suave
- Fundo branco com leve contraste azul (via theme)
- Dados: "+300 festas realizadas", "+2.500 familias atendidas", "Experiencia e dedicacao em cada detalhe"

#### 2. `src/components/dynamic-lp/DLPHowItWorks.tsx`
Secao "Como Funciona" com 4 passos visuais numerados.

- Recebe novo tipo `LPHowItWorks` com `enabled`, `title`, `steps: { title, description, icon }[]`
- Visual: cards numerados (1-4) com icones Lucide, linha conectora sutil
- Layout: 2 colunas mobile, 4 colunas desktop
- Dados: "Escolha a data", "Defina o pacote ideal", "Personalize o tema", "Aproveite a festa"

### Ajustes em componentes existentes

#### `src/components/dynamic-lp/DLPHero.tsx`
- Adicionar suporte a `hero.secondary_cta_text` e `hero.secondary_cta_url`
- Renderizar botao secundario com estilo WhatsApp (verde, icone MessageCircle) abaixo do CTA principal
- Se `secondary_cta_url` existir, abre link direto; senao, chama `onCtaClick`

### Tipos (`src/types/landing-page.ts`)

Adicionar:

```text
LPSocialProof {
  enabled: boolean
  items: { value: string; label: string }[]
  text: string
}

LPHowItWorks {
  enabled: boolean
  title: string
  steps: { title: string; description: string; icon: string }[]
}
```

Estender `LPHero` com campos opcionais: `secondary_cta_text`, `secondary_cta_url`.

### Pagina `DynamicLandingPage.tsx`

- Importar e renderizar `DLPSocialProof` e `DLPHowItWorks`
- Adicionar campos `social_proof` e `how_it_works` ao tipo `LPData`
- Parsear esses campos do JSONB retornado pela RPC (com fallback seguro `{ enabled: false }`)
- Nova ordem das secoes:
  1. Hero
  2. Social Proof (novo)
  3. Benefits (Diferenciais)
  4. Gallery (Nosso Espaco + Galeria de Momentos)
  5. Video
  6. How It Works (novo)
  7. Testimonials
  8. Offer (CTA Final)
  9. Footer

### Migracao SQL

#### 1. Adicionar colunas na tabela `company_landing_pages`

```text
ALTER TABLE company_landing_pages
ADD COLUMN IF NOT EXISTS social_proof jsonb DEFAULT '{"enabled": false, "items": [], "text": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS how_it_works jsonb DEFAULT '{"enabled": false, "title": "", "steps": []}'::jsonb;
```

#### 2. Atualizar RPCs para retornar os novos campos

Recriar `get_landing_page_by_slug` e `get_landing_page_by_domain` incluindo `social_proof` e `how_it_works` no SELECT e no RETURNS TABLE.

#### 3. Inserir dados da Aventura Kids

Configurar `domain_canonical` na tabela `companies` e inserir registro em `company_landing_pages` com:

- **Hero**: titulo "Transformamos cada celebracao em uma aventura inesquecivel", subtitulo com Sao Gotardo/MG, CTA "Solicitar Orcamento Agora", botao secundario WhatsApp, imagem de fundo da primeira foto do onboarding
- **Social Proof**: +300 festas, +2.500 familias, texto de credibilidade
- **Benefits**: 6 diferenciais (atendimento rapido, espaco seguro, equipe preparada, organizacao profissional, pacotes personalizaveis, cardapio completo)
- **Gallery**: 10 fotos do onboarding distribuidas
- **Video**: 1 video do onboarding com poster da logo
- **How It Works**: 4 passos (escolha data, defina pacote, personalize tema, aproveite festa)
- **Testimonials**: desabilitado inicialmente (sem depoimentos reais ainda)
- **Offer**: CTA final "Garanta sua data antes que ela seja reservada"
- **Theme**: fundo branco (#FFFFFF), primary azul (#4A90D9), secondary verde WhatsApp (#25D366), texto escuro (#1a1a2e), fontes Nunito/Fredoka, button_style pill
- **Footer**: nome completo, cidade, WhatsApp, Instagram

#### 4. Criar `lp_bot_settings` para Aventura Kids

Inserir configuracao do bot com mensagens personalizadas para o nome "Aventura Kids", opcoes de meses e convidados adaptadas.

### Arquivos a criar/modificar

| Arquivo | Acao |
|---|---|
| `src/components/dynamic-lp/DLPSocialProof.tsx` | Criar |
| `src/components/dynamic-lp/DLPHowItWorks.tsx` | Criar |
| `src/types/landing-page.ts` | Adicionar tipos |
| `src/pages/DynamicLandingPage.tsx` | Adicionar secoes e parsear novos campos |
| `src/components/dynamic-lp/DLPHero.tsx` | Botao secundario WhatsApp |
| Nova migracao SQL | Colunas + RPCs + seed dados |

### Resultado

Ao acessar `aventurakids.online`, a LP sera renderizada com visual clean (fundo branco, azul/verde), todas as 8 secoes do prompt, fotos e video reais do onboarding, chatbot funcional com logo da Aventura Kids, e qualificacao de leads integrada a plataforma.
