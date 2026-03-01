

# Corrigir: Esconder botão de Suporte nas páginas públicas/LPs

## Problema
O botão flutuante de suporte (ícone de fone de ouvido) aparece nas Landing Pages públicas dos buffets (ex: castelodadiversao.online). Isso é um erro grave pois:
- Confunde os leads/clientes finais com um botão interno da plataforma
- Conflita visualmente com o botão de WhatsApp (FloatingCTA) da LP
- Expõe funcionalidade administrativa em página pública

## Causa raiz
O `SupportChatbot` é renderizado globalmente no `App.tsx` (fora das rotas) e só verifica duas condições para se esconder:
1. Usuário não autenticado (`!session`)
2. Páginas do Hub (`/hub*`)

Porém, as LPs dinâmicas são renderizadas na rota `/` (via `RootPage`) e `/lp/:slug`, que não são filtradas. Como o usuário pode estar autenticado enquanto navega a LP, o botão aparece.

## Solução
Adicionar verificação de rotas públicas/LP no `SupportChatbot.tsx`. O componente deve retornar `null` também quando estiver em:
- `/` (root — sempre LP pública)
- `/lp/:slug` (LP dinâmica por slug)
- `/promo` (LP estática do Castelo)
- `/para-buffets` (página B2B)
- Rotas públicas (`/avaliacao`, `/pre-festa`, `/contrato`, `/cardapio`, `/equipe`, `/manutencao`, `/acompanhamento`, `/lista-presenca`, `/informacoes`, `/freelancer`, `/escala`, `/onboarding`, `/festa`)

## Alteração

**Arquivo**: `src/components/support/SupportChatbot.tsx`

Expandir a lógica de ocultação (linha 173-176) para incluir todas as rotas públicas:

```typescript
const location = useLocation();
const isHubPage = location.pathname.startsWith("/hub");

const PUBLIC_PREFIXES = [
  "/lp", "/promo", "/para-buffets", "/onboarding",
  "/avaliacao", "/pre-festa", "/contrato", "/cardapio",
  "/equipe", "/manutencao", "/acompanhamento",
  "/lista-presenca", "/informacoes", "/freelancer",
  "/escala", "/festa", "/hub-landing", "/hub-login",
];
const isPublicPage =
  location.pathname === "/" ||
  PUBLIC_PREFIXES.some((p) => location.pathname.startsWith(p));

if (!session || isHubPage || isPublicPage) return null;
```

Isso garante que o botão de suporte só apareça nas páginas administrativas autenticadas do painel do buffet (dashboard, atendimento, configurações, etc.).
