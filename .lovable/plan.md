## Problema

Quando você envia um formulário (cardápio, pré-festa, contrato, etc.) pelo WhatsApp, a mensagem chega normal para a cliente, mas dentro da Central de Atendimento ela aparece em **um chat novo, duplicado**, com o mesmo nome e número da cliente — em vez de cair no chat já existente.

## Causa raiz (diagnóstico)

Validei direto no banco usando o caso da **Tamires (11930683397)** na unidade **Vendas 1**. Existem 2 conversas na MESMA instância para o MESMO telefone:

| contact_name | remote_jid | lead_id |
|---|---|---|
| Tamires | `5511930683397@s.whatsapp.net` ✅ chat real | vinculado |
| 11930683397 | `11930683397@s.whatsapp.net` ❌ chat fantasma | sem lead |

O que está acontecendo no código:

1. O front (`EventComplementaryTab.tsx` / `EventFormsStatusPanel.tsx`) chama `wapi-send` passando `phone = lead.whatsapp` — que muitas vezes vem **sem o código do país (55)**.
2. Quando o helper `findExistingConversation` não encontra match na instância selecionada, o front envia **sem** `conversationId`.
3. Dentro de `supabase/functions/wapi-send/index.ts` (linha 505-506), a função `findOrCreateConversation` faz:
   ```ts
   const cleanPhone = phone.replace(/\D/g, '');
   const remoteJid = `${cleanPhone}@s.whatsapp.net`;
   ```
   Ou seja, **NÃO normaliza para incluir o 55**. Procura `11930683397@s.whatsapp.net`, não acha (a real é `5511930683397@...`) e **cria uma conversa nova**.
4. A W-API entrega a mensagem normalmente no celular da cliente, mas o registro interno fica nesse chat fantasma.

Esse mesmo bug afeta qualquer envio outbound (formulários, contratos, bot de LP) sempre que o telefone chegar sem o código do país.

## Solução

### 1. Corrigir `findOrCreateConversation` na edge `wapi-send`
Normalizar o telefone para o formato brasileiro completo (com `55`) antes de montar o `remote_jid`, e tentar **todas as variantes** (com/sem 55, com/sem 9º dígito) ao procurar a conversa existente. Só criar nova se nenhuma variante existir.

```ts
// Gera variantes (5511..., 11..., com/sem 9º dígito) e busca por todas
const variants = getBrazilianPhoneVariants(cleanPhone);
const remoteJids = variants.map(v => `${v}@s.whatsapp.net`);

const { data: existing } = await supabase
  .from('wapi_conversations')
  .select('id, company_id, contact_name, bot_data, remote_jid')
  .eq('instance_id', instanceRecord.id)
  .in('remote_jid', remoteJids)
  .order('last_message_at', { ascending: false, nullsFirst: false })
  .limit(1)
  .maybeSingle();

// Para INSERT (quando realmente não existe), usar SEMPRE o formato canônico com 55
const canonicalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
const canonicalJid = `${canonicalPhone}@s.whatsapp.net`;
```

### 2. Reforçar o front para passar telefone canônico
No `EventComplementaryTab.tsx` e `EventFormsStatusPanel.tsx`, normalizar `lead.whatsapp` para o formato com 55 antes de chamar `wapi-send`. Isso é defesa em profundidade.

### 3. Limpeza dos chats duplicados já existentes (one-shot SQL)
Migration que, para cada par de conversas duplicadas na mesma `instance_id` (mesmo telefone com/sem 55):
- Mantém a conversa **canônica** (com 55, ou a que tem `lead_id` vinculado, ou a mais recente).
- Move as mensagens (`wapi_messages`) da fantasma → canônica.
- Atualiza `last_message_at` / `last_message_content` na canônica.
- Apaga a conversa fantasma.

A migration vai listar antes de apagar (log via RAISE NOTICE) para você ter visibilidade.

## Arquivos afetados

- `supabase/functions/wapi-send/index.ts` — corrigir `findOrCreateConversation` (busca por variantes + insert canônico).
- `src/components/agenda/EventComplementaryTab.tsx` — normalizar telefone antes de invocar `wapi-send`.
- `src/components/agenda/EventFormsStatusPanel.tsx` — idem.
- Nova migration SQL — consolidar conversas duplicadas existentes.

## Resultado esperado

- Envio de formulários (e qualquer outbound) cai sempre no **chat existente** da cliente, mesmo se o telefone estiver salvo sem o 55.
- Os chats fantasmas atuais (Tamires e quaisquer outros) são consolidados no chat real, sem perder histórico de mensagens.
- Sem mudanças na lógica de conexão / webhook do WhatsApp (respeitando a regra de segurança da integração).
