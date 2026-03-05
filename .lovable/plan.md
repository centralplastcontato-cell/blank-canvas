

## Plano: Indicador visual "Enviado pela plataforma"

### Resumo
Adicionar `metadata: { source: 'platform' }` nos inserts de mensagens do `wapi-send` e exibir um indicador discreto no chat (ícone Monitor + texto) abaixo das mensagens enviadas pela plataforma.

### 1. Edge Function — `supabase/functions/wapi-send/index.ts`

Adicionar `metadata: { source: 'platform' }` em **6 inserts** de mensagens enviadas com sucesso (não nos inserts de mensagens com status `failed`/blocked):

| Linha | Tipo de mensagem |
|-------|-----------------|
| ~526 | send-text |
| ~590 | send-image |
| ~661 | send-audio |
| ~712 | send-document |
| ~760 | send-video |
| ~827 | send-contact |

Cada insert receberá o campo `metadata: { source: 'platform' }`. Isso **não altera** nenhuma lógica de conexão, webhook, ou envio — apenas adiciona um campo de dados ao registro salvo no banco.

### 2. Frontend — `src/components/whatsapp/WhatsAppChat.tsx`

**2a. Optimistic messages** (linhas ~1834, ~1914, ~2365): Adicionar `metadata: { source: 'platform' }` nos objetos otimistas para que o indicador apareça imediatamente.

**2b. Indicador visual** — Nos dois blocos de renderização (desktop ~4303 e mobile ~5209), adicionar logo após o indicador `auto_reminder` existente:

```tsx
{msg.from_me && msg.metadata?.source === 'platform' && !msg.metadata?.type && (
  <div className={cn(
    "flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/70",
    "justify-end mr-1"
  )}>
    <Monitor className="w-2.5 h-2.5" />
    <span>Enviado pela plataforma</span>
  </div>
)}
```

A condição `!msg.metadata?.type` evita conflito com o indicador `auto_reminder` que já tem sua própria label.

**2c. Import**: Adicionar `Monitor` ao import de `lucide-react` (linha ~40).

### Segurança
- Zero risco para conexões/instâncias WhatsApp
- Apenas leitura de campo `metadata` no frontend
- Apenas adição de campo `metadata` no insert do backend
- Mensagens enviadas pelo celular (via webhook) continuam sem esse campo, garantindo a diferenciação

### Arquivos alterados
| Arquivo | Tipo |
|---|---|
| `supabase/functions/wapi-send/index.ts` | Edge Function — 6 inserts |
| `src/components/whatsapp/WhatsAppChat.tsx` | Frontend — indicador visual + optimistic |

