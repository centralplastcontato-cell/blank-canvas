

## Indicacao Visual para Mensagens de Follow-up Automatico

### O Problema
Hoje, as mensagens de follow-up automatico (lembrete de proximo passo, follow-up 1/2, e follow-up de inatividade no bot) sao salvas como `message_type: "text"` normal, sem nenhum marcador. Isso confunde o atendente que nao sabe se a mensagem foi enviada manualmente ou pelo sistema.

### A Solucao
Adicionar um campo `metadata` (JSONB) nas mensagens de follow-up com `{ "source": "follow_up" }` ou similar, e no frontend exibir um pequeno badge/etiqueta indicando que a mensagem foi automatica.

### Visual Proposto
- Um mini-badge discreto **abaixo do balao** da mensagem, com icone de relogio (Clock) e texto como "Enviado automaticamente"
- Cor: cinza suave (`text-muted-foreground`), bem menor que o texto normal
- Nao muda a cor do balao em si, apenas adiciona a etiqueta para nao poluir a interface
- Exemplo visual:

```text
+-------------------------------------+
|  Oi Juliana! Notamos que voce nao   |
|  respondeu ainda. Podemos ajudar?   |
|                          14:32  ✓✓  |
+-------------------------------------+
  🕐 Enviado automaticamente
```

### Detalhes Tecnicos

#### 1. Banco de dados - Nova coluna `metadata`
- Adicionar coluna `metadata` (tipo `jsonb`, nullable) na tabela `wapi_messages`
- Migracao simples: `ALTER TABLE wapi_messages ADD COLUMN metadata jsonb DEFAULT NULL`

#### 2. Edge Function `follow-up-check` - Marcar mensagens
- Em todos os 4 pontos onde mensagens de follow-up sao inseridas (linhas ~240, ~463, ~680, ~866), adicionar o campo `metadata` no insert:
  - Lembrete de proximo passo: `{ "source": "auto_reminder", "type": "next_step_reminder" }`
  - Follow-up 1: `{ "source": "auto_reminder", "type": "follow_up_1" }`
  - Follow-up 2: `{ "source": "auto_reminder", "type": "follow_up_2" }`
  - Follow-up inatividade bot: `{ "source": "auto_reminder", "type": "bot_inactive" }`

#### 3. Tipos TypeScript - Atualizar interface `Message`
- Em `WhatsAppChat.tsx`, adicionar `metadata?: Record<string, string> | null` na interface `Message`

#### 4. Query de mensagens - Incluir `metadata`
- Atualizar o select de mensagens para incluir o campo `metadata`

#### 5. Frontend `WhatsAppChat.tsx` - Renderizar indicador
- Na renderizacao de cada mensagem (balao), verificar se `msg.metadata?.source === 'auto_reminder'`
- Se sim, renderizar abaixo do balao:
  ```
  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground/70">
    <Clock className="w-2.5 h-2.5" />
    <span>Enviado automaticamente</span>
  </div>
  ```
- O texto pode variar conforme o `type`:
  - `next_step_reminder` -> "Lembrete automatico"
  - `follow_up_1` -> "Follow-up automatico"
  - `follow_up_2` -> "2o follow-up automatico"
  - `bot_inactive` -> "Reenvio por inatividade"

### Arquivos modificados
- `supabase/migrations/` - Nova migracao para coluna `metadata`
- `supabase/functions/follow-up-check/index.ts` - Adicionar metadata nos 4 inserts
- `src/components/whatsapp/WhatsAppChat.tsx` - Interface Message, query select, renderizacao do badge
