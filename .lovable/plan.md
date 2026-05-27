## O que está acontecendo

Esses "números estranhos" (`6945029226653`, `238843164926026`, etc.) **não são telefones**. São **@lid (Linked ID)** — um identificador interno e anônimo que o WhatsApp envia quando o contato tem o recurso de privacidade avançada ativado **ou** quando é a primeira mensagem para uma instância sem histórico prévio.

Confirmei no banco:
- A tabela `wapi_webhook_raw_events` recebeu o `remote_jid` como `6945029226653@lid` (W-API/Z-API).
- O webhook tentou resolver via `lid_phone_map`, `quoted message`, `contact_name` e `contact_picture` — **todos falharam** porque é a primeira mensagem ("Boa tarde", sem contexto).
- Como `fromMe = false`, o código aplica o caminho `isUnresolvedInboundLid = true`: **preserva a mensagem visível** (para não perder o lead), mas com o ID anônimo aparecendo como nome.

**Sua intuição está parcialmente certa**: pode acontecer de o MESMO contato aparecer depois com o telefone real numa conversa separada — aí ficam duas linhas (a do @lid + a real). Hoje não existe um merge automático posterior.

## Plano de correção (3 etapas, uma por vez)

### Etapa 1 — UX: rotular conversas @lid não resolvidas
- No componente da lista de conversas (`src/components/whatsapp/...ConversationList`):
  - Detectar quando `contact_name` é puramente numérico **com 13–15 dígitos sem prefixo 55** ou quando `remote_jid` contém `@lid`.
  - Exibir o rótulo `"Contato sem identificação"` + badge cinza pequeno `@lid` + ícone de cadeado, em vez do número cru.
  - Manter a mensagem visível normalmente.
- **Não muda backend, não muda bot.** Só apresentação.

### Etapa 2 — Reaproveitar a edge function `resolve-numeric-names` já existente
- Ela já tenta consultar W-API/Z-API `contact-info` para resolver IDs numéricos.
- Adicionar um **cron diário** (instrução manual no Supabase SQL Editor, conforme a regra de projeto) chamando a função para a Castelo da Diversão.
- Resultado esperado: muitos @lid recebem o nome real automaticamente em 24h.

### Etapa 3 — Merge automático quando o telefone real aparece
- Criar uma função SQL `merge_lid_conversation(p_lid_conv_id uuid, p_real_conv_id uuid)` que:
  - Move mensagens de `wapi_messages` da conv @lid para a conv real.
  - Move `lead_id`, tags, notas se existirem.
  - Apaga a conv @lid.
- Disparar via trigger: quando `lid_phone_map` ganha um novo mapeamento, procurar conversa real correspondente e mergir.

## Detalhes técnicos

- Arquivos envolvidos:
  - `supabase/functions/wapi-webhook/index.ts` (linhas 5488–5551, fluxo `isLidJid`/`isPseudoLidJid`)
  - `supabase/functions/resolve-numeric-names/index.ts` (já existe)
  - `supabase/functions/_shared/jid-normalizer.ts` (classificação correta — não alterar)
  - `src/components/whatsapp/` (componente da lista de conversas — identificar)
- **Não tocar** na lógica de envio (`wapi-send`) nem na conexão WhatsApp (regra de projeto).
- Multi-tenant: tudo escopado por `company_id` e `instance_id` (já é o padrão).

## Pergunta antes de executar

Quer que eu comece pela **Etapa 1** (rotular as conversas @lid não resolvidas para parar de mostrar os números crus) e depois decidimos sobre as Etapas 2 e 3? Ou prefere outra ordem?
