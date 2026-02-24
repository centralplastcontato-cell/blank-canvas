
Objetivo: corrigir o travamento em “Gerando QR Code...” para que o QR apareça (ou erro claro), sem spinner infinito, tanto na tela de Configurações quanto no Hub.

Diagnóstico confirmado no código e logs:
- O fluxo de QR chama `wapi-send` com ação `get-qr` em:
  - `src/components/whatsapp/settings/ConnectionSection.tsx` (`fetchQrCode`)
  - `src/hooks/useWhatsAppConnection.ts` (usado por `HubWhatsApp` + `ConnectionDialog`)
- No edge function `supabase/functions/wapi-send/index.ts`, a ação `get-qr` usa `fetch(...)` sem timeout (`AbortController`), então quando a W-API fica pendente, a Promise pode ficar “presa”.
- Resultado no front:
  - `qrLoading` vira `true`
  - `setQrLoading(false)` só roda quando a Promise resolve/rejeita
  - em caso de pendência longa, a UI fica eternamente em “Gerando QR Code...”
- Evidência adicional:
  - logs mostram entrada em `wapi-send: get-qr` sem progressão útil
  - chamada direta de `get-qr` chegou a cancelar por timeout de contexto

Escopo de implementação:
1) Robustecer `get-qr` no edge function
2) Adicionar proteção de timeout no front (dupla proteção)
3) Melhorar feedback UX quando a W-API estiver instável
4) Validar ponta a ponta em Planeta e Castelo

Plano técnico detalhado:

1. Edge function: timeout e classificação de erro no `get-qr`
- Arquivo: `supabase/functions/wapi-send/index.ts`
- Alterações:
  - Envolver o `fetch` de `get-qr` com `AbortController` (ex.: 8–10s)
  - Se abortar ou 502/503/504: retornar JSON com:
    - `errorType: "TIMEOUT_OR_GATEWAY"`
    - mensagem amigável de instabilidade
    - status HTTP coerente (manter padrão atual, mas com payload padronizado)
  - Melhorar logs estruturados:
    - início da tentativa
    - status HTTP recebido
    - tipo de erro final (timeout/not_found/unauthorized/unknown)
  - Preservar comportamento de `connected` e parsing de `qrCode` já existente

2. Front (Configurações): fail-safe para encerrar spinner
- Arquivo: `src/components/whatsapp/settings/ConnectionSection.tsx`
- Alterações:
  - No `fetchQrCode`, usar `try/catch/finally` com `setQrLoading(false)` no `finally`
  - Adicionar timeout de segurança no cliente (ex.: Promise.race ~12s) para evitar spinner infinito mesmo se backend pendurar
  - Tratar `errorType === "TIMEOUT_OR_GATEWAY"` com mensagem específica:
    - “W-API instável no momento; tente novamente ou conecte por Telefone”
  - Manter botão “Tentar novamente” funcional e sem estado preso
  - Garantir que troca para aba “Telefone” continue disponível sem bloqueio

3. Front (Hub): mesmo tratamento para evitar regressão
- Arquivo: `src/hooks/useWhatsAppConnection.ts`
- Alterações:
  - Repetir padrão de `finally` + timeout client-side no `fetchQrCode`
  - Tratar `TIMEOUT_OR_GATEWAY` com toast específico e fallback claro para pareamento por telefone
  - Evitar estado preso caso o modal feche durante requisição (guardas simples de estado ativo)

4. UX de diagnóstico rápido no modal de conexão
- Arquivos:
  - `src/components/whatsapp/settings/ConnectionSection.tsx`
  - `src/components/whatsapp/ConnectionDialog.tsx` (se necessário para texto)
- Alterações:
  - Quando houver timeout:
    - parar spinner
    - mostrar estado de “instabilidade temporária”
    - CTA explícito: “Tentar novamente” e “Usar Telefone”
  - Isso reduz suporte manual e evita percepção de “travou”

5. Validação funcional (obrigatória)
- Testes manuais:
  - Abrir conexão em instância com problema (Planeta/Castelo)
  - Confirmar que:
    - spinner não fica infinito
    - em timeout aparece aviso + botão de retry
    - aba telefone funciona normalmente
  - Cenário feliz:
    - quando W-API responder, QR renderiza no modal
  - Hub e Configurações devem se comportar igual
- Teste técnico:
  - chamar edge `get-qr` diretamente e validar `errorType` em timeout/gateway

Riscos e mitigação:
- Risco: timeout muito curto gerar falso erro.
  - Mitigação: usar janela moderada (8–12s) e permitir retry imediato.
- Risco: duplicar mensagens de erro por polling/retry.
  - Mitigação: centralizar mensagens por tentativa e evitar toast em loop.
- Risco: diferenças entre telas (Hub vs Configurações).
  - Mitigação: aplicar o mesmo padrão nos dois fluxos (`ConnectionSection` e `useWhatsAppConnection`).

Resultado esperado após implementação:
- O QR deixa de “sumir com spinner infinito”.
- Usuária sempre recebe retorno claro: QR exibido, erro com retry, ou orientação para conexão por telefone.
- Fluxo fica resiliente à instabilidade intermitente da W-API sem parecer travado.
