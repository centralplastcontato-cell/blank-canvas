## O que aconteceu (diagnóstico confirmado)

Encontrei a causa exata do caso da Cleitnes. **Não houve vazamento de dados de outro buffet, nem mistura de empresas.** O que aconteceu foi um bug histórico de captação de eventos do WhatsApp.

### A raiz do problema
O WhatsApp envia para o webhook, além de mensagens reais de clientes, eventos de **Status (Stories)** publicados pelos contatos da agenda do Buffet. Esses eventos chegam com `remoteJid = "status@broadcast"` — não é uma conversa real, é o "feed de status" do WhatsApp.

Antigamente o webhook **não filtrava** esses eventos. Resultado: o sistema criou conversas-fantasma chamadas `status@broadcast`, e como o WhatsApp manda no mesmo evento o "participant" (quem postou o status — Deise, Dayse, Vanessa, etc.), o sistema ia atualizando o nome/foto da conversa para a última pessoa que postou um status. Por isso a foto/nome muda toda hora.

### Por que apareceu como "Mauro Garçom Mega Magic"
Na tela inicial (imagens 1, 2, 3, 5, 6), a conversa aparece com o nome do **lead vinculado** (Mauro). Isso porque o algoritmo de associação por telefone, há tempos atrás, grudou essa conversa-fantasma no `lead_id` do Mauro Garçom (provavelmente porque em algum momento o "participant" do status bateu com o número dele). Ao abrir a conversa (imagem 2 e 6), aparece o nome real do contato armazenado: **Deise** + `status@broadcast` no lugar do telefone — exatamente o sintoma que você descreveu.

O Mauro **real** está nas outras 2 conversas (imagem 4) — uma com o número correto `5511996897204`. A duplicação dele é separada e legítima (mesmo número entrou por dois caminhos).

### Escopo da contaminação no banco
Rodei a varredura agora:
- **Planeta Divertido**: 2 conversas-fantasma de `status@broadcast` (Deise, Dayse Rabelo) — uma delas grudada no lead do Mauro.
- **Mega Magic**: 3 conversas-fantasma (Ana Maria, José Antonio, Silvana Honorato) — 1 com lead vinculado.
- Total: **5 conversas-fantasma e 190 mensagens** que nunca deveriam ter existido.
- Nenhuma outra empresa afetada.

### Bom: a porta já está fechada
A correção do webhook que aplicamos antes **já bloqueia** novos eventos `@broadcast` (`supabase/functions/wapi-webhook/index.ts` linha 4731-4734). Nenhuma conversa nova desse tipo está sendo criada. O que falta é **limpar o lixo histórico**.

### Sobre exposição de dados
Para tranquilizar a Cleitnes: **não houve vazamento entre buffets**. Tudo que apareceu como "Mauro estranho" são posts do feed de Status do WhatsApp dos próprios contatos da agenda do Planeta Divertido (Deise, etc.) — informações que já estavam públicas para quem tem o número salvo. O bug foi de **rotulagem interna** (associou status alheios ao perfil do Mauro), não de cruzamento entre empresas.

---

## Plano de correção

### 1. Migration de limpeza (one-shot, segura)
Criar migration que faz, dentro de uma transação:

1. **Desvincular** o `lead_id` em todas as `wapi_conversations` com `remote_jid` contendo `@broadcast` ou começando com `status@` (para não deletar leads reais por engano).
2. **Apagar as 190 mensagens** dessas conversas-fantasma (`wapi_messages`).
3. **Apagar as 5 conversas-fantasma** (`wapi_conversations`).
4. **Apagar `flow_lead_state`** órfão dessas conversas, se houver.

Filtro usado (idêntico ao que já existe no webhook):
```sql
remote_jid ILIKE '%@broadcast%'
  OR remote_jid ILIKE 'status@%'
  OR contact_phone IN ('status@broadcast', 'status')
```

### 2. Reforço defensivo no webhook
O filtro atual cobre `remoteJid`. Vou adicionar a mesma checagem também sobre o **`participant`** dos eventos de grupo/status, garantindo que mesmo se a W-API mudar o formato, nenhum evento de status escape e contamine outra conversa pelo número do "participant".

### 3. Validação pós-limpeza
Após a migration, rodar query de verificação confirmando:
- 0 conversas com `remote_jid` de broadcast
- 0 mensagens órfãs
- Lead do Mauro Garçom (`23a486cf...`) volta a ter apenas a conversa real `5511996897204`

### 4. Comunicação à cliente
Texto pronto para a Cleitnes explicando o que era (status do WhatsApp dos contatos dela, não vazamento), por que aconteceu (bug antigo já corrigido) e o que foi feito (limpeza definitiva).

---

## O que NÃO vou mexer
- Lead do Mauro real e suas conversas legítimas (incluindo a duplicada por número correto).
- Lógica do bot, follow-ups, ou qualquer outra automação.
- Conexão WhatsApp / instâncias.

## Riscos
Baixo. As 5 conversas a apagar têm `remote_jid = status@broadcast` — não correspondem a nenhum cliente real, são lixo do feed de Status. A migration roda em transação: se algo falhar, nada é apagado.
