# Mapa de Rotas — Celebrei

> Links abrem no localhost:8080 (servidor local rodando). Para produção, substitua por `https://charme-na-tela-nua.adoravel.app`.

## Arquivo que controla as rotas
- `src/App.tsx` — define todas as rotas do sistema
- `src/pages/RootPage.tsx` — decide o que mostrar na raiz `/` por domínio
- `src/hooks/useDomainDetection.ts` — mapeia domínios dos buffets

---

## Rotas Públicas (sem login)

| URL clicável | O que é |
|---|---|
| [/](http://localhost:8080/) | LP do Castelo (localhost) ou LP do buffet (por domínio) |
| [/auth](http://localhost:8080/auth) | Login / cadastro |
| [/para-buffets](http://localhost:8080/para-buffets) | LP de venda do Celebrei para buffets |
| [/promo](http://localhost:8080/promo) | Página promocional |
| [/recrutamento-comercial](http://localhost:8080/recrutamento-comercial) | Formulário público de recrutamento comercial |
| `/lp/:slug` | Landing page dinâmica por slug |
| `/onboarding/:slug` | Formulário de onboarding público |
| `/avaliacao/:companySlug/:templateSlug` | Formulário de avaliação do cliente |
| `/pre-festa/:companySlug/:templateSlug` | Formulário pré-festa público |
| `/contrato/:companySlug/:templateSlug` | Contrato público para assinar |
| `/cardapio/:companySlug/:templateSlug` | Cardápio público |
| `/festa/:eventId` | Painel de controle da festa (público) |
| `/dados-contratante/:token` | Formulário de dados do contratante |
| `/assinar-contrato/:token` | Assinatura de contrato |
| `/equipe/:recordId` | Formulário de equipe / staff |
| `/manutencao/:recordId` | Formulário de manutenção |
| `/acompanhamento/:recordId` | Acompanhamento da festa |
| `/lista-presenca/:recordId` | Lista de presença |
| `/lista-presenca/:recordId/conferencia` | Conferência da lista de presença |
| `/informacoes/:recordId` | Informações do evento |
| `/freelancer/:companySlug/:templateSlug` | Formulário de freelancer |
| `/escala/:companySlug/:scheduleSlug` | Escala de freelancer |

---

## Rotas Privadas — Painel dos Buffets (requer login)

| URL clicável | O que é |
|---|---|
| [/dashboard](http://localhost:8080/dashboard) | Dashboard principal |
| [/atendimento](http://localhost:8080/atendimento) | Central de atendimento WhatsApp |
| [/configuracoes](http://localhost:8080/configuracoes) | Configurações gerais |
| [/inteligencia](http://localhost:8080/inteligencia) | Módulo de inteligência / leads |
| [/agenda](http://localhost:8080/agenda) | Agenda de eventos |
| [/formularios](http://localhost:8080/formularios) | Formulários |
| [/avaliacoes](http://localhost:8080/avaliacoes) | Avaliações |
| [/pre-festa](http://localhost:8080/pre-festa) | Gestão de pré-festas |
| [/campanhas](http://localhost:8080/campanhas) | Campanhas de WhatsApp |
| [/contratos](http://localhost:8080/contratos) | Módulo de contratos |
| [/contrato](http://localhost:8080/contrato) | Editor de contrato |
| [/cardapio](http://localhost:8080/cardapio) | Cardápio |
| [/financeiro](http://localhost:8080/financeiro) | Financeiro |
| [/treinamento](http://localhost:8080/treinamento) | Treinamento dos usuários do buffet |

---

## Rotas do Hub Celebrei (seu painel de admin)

| URL clicável | O que é |
|---|---|
| [/hub-landing](http://localhost:8080/hub-landing) | Landing page do Hub |
| [/hub-login](http://localhost:8080/hub-login) | Login do Hub |
| [/hub](http://localhost:8080/hub) | Dashboard do Hub |
| [/hub/empresas](http://localhost:8080/hub/empresas) | Gestão de empresas (buffets) |
| [/hub/users](http://localhost:8080/hub/users) | Usuários do Hub |
| [/hub/whatsapp](http://localhost:8080/hub/whatsapp) | WhatsApp das instâncias |
| [/hub/onboarding](http://localhost:8080/hub/onboarding) | Onboarding de novos buffets |
| [/hub/prospeccao](http://localhost:8080/hub/prospeccao) | Prospecção comercial |
| [/hub/consumo-ia](http://localhost:8080/hub/consumo-ia) | Consumo de IA por empresa |
| [/hub/treinamento](http://localhost:8080/hub/treinamento) | Treinamento (Hub) |
| [/hub/leads](http://localhost:8080/hub/leads) | Leads do Hub |
| [/hub/suporte](http://localhost:8080/hub/suporte) | Suporte |
| [/hub/materiais](http://localhost:8080/hub/materiais) | Materiais |
| [/hub/recrutamento](http://localhost:8080/hub/recrutamento) | Recrutamento |
| [/hub/funcionalidades](http://localhost:8080/hub/funcionalidades) | Funcionalidades |
| [/hub/backups](http://localhost:8080/hub/backups) | Backups |
| [/hub/comercial-b2b](http://localhost:8080/hub/comercial-b2b) | Comercial B2B |

---

## Rotas Admin (diagnóstico interno)

| URL clicável | O que é |
|---|---|
| [/admin/fix-prefesta](http://localhost:8080/admin/fix-prefesta) | Corrigir respostas de pré-festa |
| [/admin/message-trace](http://localhost:8080/admin/message-trace) | Rastrear mensagens WhatsApp |

---

## Rotas de Parceiros

| URL clicável | O que é |
|---|---|
| [/parceiro](http://localhost:8080/parceiro) | Dashboard do parceiro |
| [/parceiro/catalogo](http://localhost:8080/parceiro/catalogo) | Catálogo de produtos |
| [/parceiro/pedidos](http://localhost:8080/parceiro/pedidos) | Pedidos |
| [/parceiro/config](http://localhost:8080/parceiro/config) | Configurações do parceiro |

---

## Domínios dos Buffets (LP por domínio)

| Domínio | Buffet |
|---|---|
| [castelodadiversao.com.br](https://castelodadiversao.com.br) | Castelo da Diversão |
| [castelodadiversao.online](https://castelodadiversao.online) | Castelo da Diversão (alias) |
| [buffetplanetadivertido.online](https://buffetplanetadivertido.online) | Planeta Divertido |
| [aventurakids.online](https://aventurakids.online) | Aventura Kids |
| [buffetmegamagic.com.br](https://buffetmegamagic.com.br) | Mega Magic |
| [espacocarrossel.online](https://espacocarrossel.online) | Espaço Carrossel |
| [hubcelebrei.com.br](https://hubcelebrei.com.br) | Hub Celebrei (seu painel) |
| [celebrei.com.br](https://celebrei.com.br) | Hub Celebrei (alias) |

---

## Redirects (rotas antigas → novas)

| De | Para |
|---|---|
| `/admin` | `/atendimento` |
| `/whatsapp` | `/atendimento` |
| `/empresas` | `/hub/empresas` |
| `/comercial-b2b` | `/hub/comercial-b2b` |
| `/perfil` | `/configuracoes?tab=perfil` |
| `/users` | `/configuracoes?tab=usuarios` |
| `/visitas` | `/agenda?tab=visitas` |
