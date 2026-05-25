# Corrigir mistura de mensagens entre Vendas 1 e Vendas 2

## Diagnóstico

Em `supabase/functions/wapi-webhook/index.ts`, dentro de `resolveLidConversation` (~linhas 155-175), o lookup que resolve `@lid` via mensagem referenciada (`wapi_messages.message_id`) **não filtra por instância**.

Quando o mesmo cliente já tem histórico no Vendas 1 e manda nova mensagem pelo Vendas 2, o resolver acha o registro antigo em `wapi_messages`, devolve a `conversation_id` daquela conversa (do Vendas 1) e o webhook injeta a mensagem nova dentro dela. Por isso aparecem mensagens dos dois números no mesmo thread.

As outras duas estratégias de resolução (por `contact_name` e por `contact_picture`) já estão corretamente filtradas por `instance_id` (linhas 207 e 233). Só o branch por `message_id` ficou sem o filtro.

A safeguard de "cross-instance unification" (linha 5550) protege a criação de novas conversas em setups multi-instância, mas ela só roda **depois** de `resolveLidConversation` — então não cobre esse caminho.

## Correção (1 alteração cirúrgica)

`supabase/functions/wapi-webhook/index.ts`, função `resolveLidConversation`:

- Ao buscar `wapi_conversations` pelo `existingMessage.conversation_id`, **adicionar filtro `.eq('instance_id', instanceDbId)`**. Se a conversa pertencer a outra instância da mesma empresa, ignorar e seguir para as próximas estratégias (nome, foto). Se nada resolver, a mensagem cai no fluxo normal de criação de nova conversa naquela instância — exatamente como já acontece hoje em setups multi-seller.

Zero alteração em: realtime, dedup, envio, `wapi-send`, regra de negócio do bot, cross-instance unification.

## Verificação

1. Conferir nos logs do `wapi-webhook` que não há mais `Resolved @lid ... by referenced message` cruzando instâncias.
2. Mandar mensagem nova pelo Vendas 2 de um contato que já fala no Vendas 1 → deve criar uma conversa nova isolada no Vendas 2 (ou, se já existir, reusar a do próprio Vendas 2).
3. Abrir o thread no chat e confirmar que só aparecem mensagens da instância selecionada.

## Não incluso neste passo (próximos, se necessário)

- Script de "split" para separar mensagens que já foram salvas misturadas em conversas existentes. Faço como passo 2, depois de validar a correção do webhook, se você confirmar que há conversas atuais bagunçadas.
