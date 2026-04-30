
## Diagnóstico

Encontrei a causa exata olhando os logs de envio + o banco.

A conversa do **Castelo da Diversão (Vendas 3)** está salva com `remote_jid = 191826157928683@lid` (não é telefone real, é um identificador interno do WhatsApp chamado **LID**).

Quando você digita uma mensagem na plataforma:

1. O front pega o `contact_phone` da conversa, que vale `191826157928683` (extraído do LID)
2. Envia esse "número" para a Z-API via `wapi-send`
3. A Z-API **aceita** (responde `messageId` e `status: sent`) — por isso não dá erro visível
4. Mas **nunca entrega**, porque `191826157928683` não é um telefone roteável — é o LID interno do contato
5. Resultado: a mensagem fica eternamente como `sent`, nunca vira `delivered` nem `read`, e nunca aparece no celular do cliente

Já a conversa de **Vendas 2** com a mesma Carla tem `remote_jid = 5516981294568@s.whatsapp.net` (telefone real) — e os envios chegam normalmente.

Isso explica perfeitamente o sintoma: "celular → plataforma OK, plataforma → celular não chega".

## Plano de correção

### 1. Resolver LID → telefone real ANTES de enviar (`wapi-send`)

Adicionar uma etapa de resolução no início do handler `send-text` (e dos outros `send-*`):

- Se o `phone` recebido vier de uma conversa cujo `remote_jid` termina em `@lid`, fazer lookup no banco para descobrir o telefone real do contato
- Estratégia de lookup, em ordem:
  1. Buscar `wapi_conversations` onde `contact_name` ou `lead_id` bate com a conversa LID e `remote_jid` termina em `@s.whatsapp.net` na mesma `instance_id` ou na mesma `company_id`
  2. Se houver um `lead_id` associado à conversa LID, usar o `whatsapp` do lead em `campaign_leads`
  3. Se houver mensagens recebidas anteriores (`from_me=false`) na conversa LID com `metadata.real_phone` (do mapeamento que já fizemos no webhook), usar esse
- Substituir o `phone` enviado para a Z-API pelo telefone real resolvido
- Logar claramente: `[send-text] Resolved LID 191826157928683 → 5516981294568`

### 2. Persistir o telefone real na conversa LID

Quando o webhook resolver um LID para um telefone real (lógica que já existe), gravar esse telefone em `wapi_conversations.contact_phone` da conversa LID (sem mudar o `remote_jid`, para não duplicar conversa). Assim o front passa a mandar o número certo automaticamente.

### 3. Front: usar telefone real quando disponível

Em `getConversationPhone` (WhatsAppChat.tsx), se `remote_jid` terminar em `@lid` mas existir um `contact_phone` válido (com DDI 55 e tamanho normal de celular brasileiro), usar `contact_phone`. Caso contrário, deixar o backend resolver.

### 4. Bloquear envio com fallback claro

Se nem o backend conseguir resolver o LID para um telefone real, retornar erro `LID_UNRESOLVED` com mensagem amigável ("Não foi possível identificar o número real deste contato. Peça para ele enviar uma mensagem primeiro.") em vez de fingir sucesso.

### 5. Migração de dados (opcional, mas recomendado)

Rodar uma query única para popular `contact_phone` em todas as conversas `@lid` existentes, cruzando com conversas `@s.whatsapp.net` do mesmo `lead_id`/`contact_name` na mesma empresa.

## Detalhes técnicos

- Arquivos afetados:
  - `supabase/functions/wapi-send/index.ts` — adicionar `resolveLidToRealPhone()` e chamá-la em `send-text`, `send-image`, `send-audio`, `send-video`, `send-document`
  - `supabase/functions/wapi-webhook/index.ts` — quando `resolveLidConversation` casar, fazer `UPDATE wapi_conversations SET contact_phone=<real> WHERE remote_jid=<lid>`
  - `src/components/whatsapp/WhatsAppChat.tsx` — ajustar `getConversationPhone` para preferir `contact_phone` quando `remote_jid` for `@lid`
- Migração SQL: 1 update controlado em `wapi_conversations` com `@lid`

## Validação

Depois do deploy, peça para mandar uma mensagem de teste pela plataforma na conversa do **Castelo da Diversão Vendas 3**. Vou checar nos logs:
- `[send-text] Resolved LID ... → ...`
- `status` da mensagem deve evoluir `sent → delivered → read`
- E confirmar com você se chegou no celular do cliente

Posso seguir com a implementação?
