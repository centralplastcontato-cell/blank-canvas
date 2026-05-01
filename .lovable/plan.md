## Diagnóstico

Você está certíssimo: arquivar é perigoso. E a sua intuição também está correta — o ideal é que **mensagens novas (Z-API) caiam dentro da conversa antiga (W-API)** automaticamente, sem o cliente nem o atendente perceberem.

### Por que hoje duplica
No `wapi-webhook/index.ts` (linha ~4827), a busca pela conversa existente é feita assim:

```ts
.eq('instance_id', instance.id)   // ← amarra à instância
.eq('remote_jid', rj)
```

Como a instância mudou (W-API → Z-API), o `instance_id` é diferente, o webhook não encontra a conversa antiga e cria uma nova. **Esse é o único motivo da duplicação.**

A boa notícia: o `lead_id` já é vinculado corretamente nas duas conversas, então no CRM é o mesmo cliente. O problema é só visual no chat.

---

## Plano: Unificação automática por número (sem arquivar nada)

A ideia é trocar a regra de "1 conversa por instância+número" para **"1 conversa por empresa+número"**, reaproveitando a conversa antiga sempre que possível.

### 1. Lógica nova no webhook (`wapi-webhook/index.ts`)

Quando chegar uma mensagem e não existir conversa para `instance_id + remote_jid`, **antes** de criar uma nova, procurar uma conversa **da mesma empresa + mesmo número** (em qualquer instância) usando as variantes brasileiras (com/sem 55, com/sem 9º dígito) — a mesma lógica que já existe em `src/lib/whatsappConversationHelper.ts`.

Fluxo:
```text
Mensagem chega (Z-API)
  ↓
Existe conversa nessa instância+rj?  ──► SIM ──► usa ela (comportamento atual)
  ↓ NÃO
Existe conversa nessa empresa+telefone (qualquer instância)?
  ↓ SIM
  → Migra a conversa antiga para a nova instância:
      UPDATE wapi_conversations 
      SET instance_id = <nova>, remote_jid = <novo rj>
      WHERE id = <conversa_antiga>
  → Histórico, lead, bot_data, mensagens — tudo preservado
  ↓ NÃO
Cria conversa nova (comportamento atual)
```

Na prática: a conversa antiga **vira** a conversa ativa na nova instância. Cliente e atendente veem uma linha só, com todo o histórico de mensagens preservado e a nova mensagem aparecendo no final, naturalmente.

### 2. Migração one-shot dos casos já duplicados

Para os casos que já estão duplicados hoje (Mauro Garçom e quem mais estiver), rodar uma migration que:

1. Identifica pares de conversas na mesma empresa + mesmo telefone (variantes) em instâncias diferentes.
2. Para cada par: pega a **mais antiga** (com mais histórico) e **move as mensagens da mais nova** para ela; depois atualiza o `instance_id` e `remote_jid` da antiga para os valores da nova; deleta a duplicada vazia.
3. Resultado: uma única linha no chat, histórico completo, sem perda de mensagem.

Antes de executar, vou rodar uma query de inspeção e te mostrar **exatamente quais conversas serão mescladas** (números + nomes) para você aprovar caso a caso ou em bloco.

### 3. Ajustes técnicos finos

- **Constraint do banco**: hoje pode existir um índice único em `(instance_id, remote_jid)`. Vou verificar — se existir, não precisa mexer (a migração move antes de criar duplicata).
- **bot_data**: ao migrar, preserva o `bot_step` e `bot_data` da conversa antiga (continuidade do bot, sem recomeçar do zero).
- **flow_lead_state**: já é vinculado por `conversation_id`, então segue a conversa migrada automaticamente.
- **`last_message_*`**: atualiza com a mensagem nova que disparou a migração.

### 4. Validação pós-deploy

Após aplicar, vou rodar query confirmando:
- 0 pares de conversas duplicadas na mesma empresa+telefone.
- Mauro Garçom volta a ter 1 conversa só, com histórico W-API + Z-API junto.
- Nenhum lead órfão, nenhuma mensagem perdida.

---

## O que NÃO vou mexer

- Conversas legítimas de clientes diferentes (lógica só agrupa quando empresa+telefone batem).
- Lógica do bot, follow-ups, automações.
- Conexão WhatsApp / instâncias W-API e Z-API.
- Conversas em grupos (`@g.us`) — ficam de fora da unificação automática.

## Riscos

Baixíssimo. A unificação só roda quando: (a) **mesma empresa**, (b) **mesmo telefone normalizado**, (c) conversa antiga existe. Se qualquer condição falhar, cai no comportamento atual (cria nova). A migration histórica roda em transação — se algo falhar, nada é alterado.

## Resultado para o usuário

- ✅ Cliente continua na mesma conversa de sempre, sem perceber troca de instância.
- ✅ Atendente vê **uma linha só** no chat, com todo o histórico W-API + Z-API.
- ✅ Nada de arquivar, nada de esconder, nada de perder mensagem.
- ✅ Funciona automaticamente daqui pra frente — qualquer migração futura entre instâncias (W-API ↔ Z-API) já fica transparente.
