
## Diagnóstico — caso Alessandra Ali

Encontrei **3 conversas no Mega Magic** que são a mesma pessoa, mas o WhatsApp agora está entregando as mensagens com um identificador diferente (LID):

| Conversa | contact_phone | remote_jid | Criada em | Status |
|---|---|---|---|---|
| Original (correta) | `5511997971114` | `5511997971114@s.whatsapp.net` | 13/04 | Histórico todo aqui |
| Fantasma 1 | `142124897067159` | `142124897067159@lid` | 01/05 18:06 | "Ops / . / Esse... Rsrs / [Imagem]" |
| Fantasma 2 | `123282858758364` | `123282858758364@lid` | 01/05 18:12 | "Boa tarde! Imagina 😊..." |

### Causa raiz (descoberta nova — diferente do problema de formatação anterior)

O WhatsApp está migrando contatos para um novo identificador chamado **LID** (`@lid` em vez de `@s.whatsapp.net`). Quando isso acontece, o webhook do W-API/Z-API entrega um `remote_jid` totalmente numérico e **sem relação matemática com o telefone real** (`142124897067159` não tem nada a ver com `5511997971114`).

Resultado: o sistema não consegue casar pelo telefone (não existe regra de normalização que transforme `142124897067159` em `5511997971114`) e cria uma conversa nova. A foto inicial vem igual porque é o mesmo perfil do WhatsApp, mas depois o LID pode mudar e a foto também muda (foi exatamente o que a cliente percebeu).

A migração que rodamos antes resolveu duplicatas por **formatação de número** (com/sem 55, com/sem 9). Não resolve LID porque o LID **não é um número de telefone**.

### Por que isso vai piorar se não tratarmos

O WhatsApp está expandindo o LID para todos os contatos ao longo de 2025/2026. Sem tratamento, toda conversa nova de cliente recorrente vai criar um "fantasma" como esse.

---

## Plano

### 1. Detectar e marcar JIDs do tipo LID
No webhook (`supabase/functions/wapi-webhook/`), quando o `remote_jid` terminar com `@lid`:
- Não tentar criar/buscar conversa por esse número como se fosse telefone
- Tentar primeiro extrair o telefone real do payload (W-API e Z-API enviam campos como `senderPn`, `participantPn`, `phoneNumber`, ou `notifyName`/`pushName` + número alternativo dependendo do evento)
- Se conseguir o telefone real → casar com a conversa existente por telefone normalizado (lógica que já temos)
- Se não conseguir → criar conversa nova MAS gravar o LID em uma coluna nova `lid_jid` para futura unificação

### 2. Nova coluna `lid_jid` em `wapi_conversations`
Permite que, quando uma futura mensagem trouxer o vínculo LID↔telefone, o sistema unifique automaticamente sem perder histórico.

### 3. Função `merge_lid_conversations(_lid, _real_phone, _company_id, _instance_id)`
Reaproveita a lógica da `merge_duplicate_conversations_intra_instance` (mover mensagens, flow_state, bot_data, lead_id, contact_name) mas para casar uma conversa LID com a conversa do telefone real.

### 4. Resolver os 3 casos atuais da Alessandra
Rodar o merge manualmente unificando as duas fantasmas (`80bd3b00...` e `e4f94385...`) na conversa original (`87b197a2...`):
- Mover as 7 mensagens recentes ("Ops", ".", "Esse... Rsrs", "[Imagem]", "tenho esses dados...", "Boa tarde! Imagina 😊", "é bem legal...", "Veja direitinho...") para a conversa correta
- Apagar as duas conversas-fantasma
- Manter foto, lead_id e bot_step da original

### 5. Varredura preventiva nas outras buffets
Listar todas as conversas com `remote_jid LIKE '%@lid'` em todas as empresas. Para cada uma, tentar achar uma conversa "irmã" do mesmo `contact_picture` ou `contact_name` na mesma instância e propor merge. Ao final, relatório com quantos casos foram unificados automaticamente e quantos precisam de revisão manual (LID sem irmã óbvia).

### 6. Comunicação para a cliente
Texto curto explicando:
- O WhatsApp está mudando como identifica contatos (LID) — é uma mudança deles, não nossa
- Por isso a Alessandra "apareceu duas vezes" mesmo sendo a mesma pessoa
- Já unificamos as 3 conversas dela em uma só, com todo histórico preservado
- O sistema agora detecta LID e tenta unificar automaticamente em casos novos
- Quando não der pra detectar na hora, a próxima mensagem com o telefone real unifica sozinha

### Detalhes técnicos
- Migração SQL: `ALTER TABLE wapi_conversations ADD COLUMN lid_jid text` + índice
- Edge function `wapi-webhook`: branch novo no resolver de conversa para `@lid`
- Função `merge_lid_conversations` (SECURITY DEFINER, mesmo padrão da intra_instance)
- Script one-shot para os 3 casos da Alessandra + varredura geral

Posso prosseguir?
