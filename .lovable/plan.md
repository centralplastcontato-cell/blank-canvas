

## Bolinha amarela permanente DENTRO do balão

### Problema atual
A bolinha amarela está posicionada **fora** do balão azul (após o `</div>` que fecha o balão). Isso causa dois problemas:
- Visualmente aparece separada, abaixo do balão
- Pode "sumir" visualmente dependendo do layout

### Solução
Mover a bolinha para **dentro do balão**, ao lado do horário e dos checkmarks de status. Assim fica permanente, discreto e integrado — igual na referência que você mostrou (imagem 3).

### Mudança visual

Antes:
```
┌──────────────────────┐
│ Mensagem de texto    │
│              10:41 ✓✓│
└──────────────────────┘
  🟡  (fora do balão)
```

Depois:
```
┌──────────────────────┐
│ Mensagem de texto    │
│         🟡 10:41 ✓✓  │
└──────────────────────┘
```

### Alterações — `src/components/whatsapp/WhatsAppChat.tsx`

**1. Desktop (linha ~4204-4216)** — Adicionar a bolinha dentro da `div` de timestamp/status, antes do horário:

```tsx
<div className={cn("flex items-center gap-1 mt-1", ...)}>
  {/* NOVO: bolinha amarela dentro do balão */}
  {msg.from_me && msg.metadata?.source === 'platform' && msg.metadata?.source !== 'auto_reminder' && (
    <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block shrink-0" title="Enviado pela plataforma" />
  )}
  <span className="text-[10px] ...">{formatMessageTime(msg.timestamp)}</span>
  {msg.from_me && getStatusIcon(msg.status)}
</div>
```

**2. Mobile (linha ~5115-5127)** — Mesma alteração no bloco de timestamp mobile.

**3. Remover** os blocos antigos da bolinha que ficam fora do balão (linhas ~4321-4325 e ~5232-5236).

### Por que não vai sumir
- Os dados `metadata: { source: 'platform' }` já estão salvos no banco pelo `wapi-send`
- O `SELECT` inicial já busca o campo `metadata`
- O realtime já inclui `metadata` na interface `Message`
- Ao recarregar a página ou trocar de conversa, a bolinha continua aparecendo porque vem do banco

### Tamanho da bolinha
Reduzida de `w-3 h-3` para `w-2 h-2` para caber harmoniosamente ao lado do horário, sem poluir visualmente.

### Arquivo alterado
| Arquivo | Mudança |
|---|---|
| `src/components/whatsapp/WhatsAppChat.tsx` | Mover bolinha para dentro do timestamp (desktop + mobile), remover blocos antigos |

