

# Corrigir Signed URLs e Hook use-mobile no WhatsApp

## Impacto

### 1. Signed URLs de documentos e videos (1h → 1 ano)
**Problema atual**: Documentos (PDFs, etc.) e videos enviados pelo chat geram URLs assinadas com validade de **1 hora**. Depois disso, o link quebra -- o usuario ve "Arquivo nao disponivel" e precisa baixar novamente (se ainda for possivel). Isso causa:
- Reclamacoes de buffets que nao conseguem abrir PDFs de orcamento compartilhados horas antes
- Videos de festas/materiais ficam inacessiveis no historico
- Retrabalho para reenviar arquivos

**Depois da correcao**: URLs validas por **1 ano** (mesmo padrao que ja funciona para imagens na linha 2466). Arquivos permanecem acessiveis no historico indefinidamente.

**Risco**: Zero. E a mesma chamada que ja funciona para imagens, apenas mudando o numero `3600` para `31536000`.

### 2. Hook use-mobile reativo no WhatsApp.tsx
**Problema atual**: A linha `const isMobile = typeof window !== 'undefined' && window.innerWidth < 768` e calculada **uma unica vez** no render. Se o usuario rotaciona o tablet ou redimensiona a janela, o layout nao muda -- fica preso no modo errado (desktop em tela pequena ou mobile em tela grande).

**Depois da correcao**: Usa o hook `useIsMobile()` que ja existe no projeto, com `matchMedia` listener. O layout reage automaticamente a mudancas de viewport.

**Risco**: Zero. O hook ja e usado em dezenas de outros componentes do projeto.

---

## Alteracoes tecnicas

### Arquivo 1: `src/components/whatsapp/WhatsAppChat.tsx`
- **Linha 2510**: Alterar `createSignedUrl(fileName, 3600)` para `createSignedUrl(fileName, 31536000)` (documento)
- **Linha 2552**: Alterar `createSignedUrl(fileName, 3600)` para `createSignedUrl(fileName, 31536000)` (video)

### Arquivo 2: `src/pages/WhatsApp.tsx`
- Adicionar import: `import { useIsMobile } from "@/hooks/use-mobile"`
- **Linha 103**: Substituir `const isMobile = typeof window !== 'undefined' && window.innerWidth < 768` por `const isMobile = useIsMobile()`
- Mover a chamada do hook para dentro do componente, antes dos blocos condicionais de loading/null (hooks devem ser chamados antes de returns condicionais)

### O que NAO muda
- Nenhuma alteracao no backend, banco, ou edge functions
- Nenhuma dependencia nova
- Logica de conexao WhatsApp intacta (respeitando a restricao de seguranca)
- Imagens continuam com 1 ano (ja estavam corretas)

