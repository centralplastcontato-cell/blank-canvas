
## Diagnóstico atualizado (com base no cenário novo)

Você está certa: o problema não é só do Planeta Divertido. Há sinal de problema sistêmico na integração W-API para múltiplas instâncias (incluindo Castelo da Diversão).

### O que eu confirmei agora
1. **Todas as instâncias desses dois buffets estão marcadas como `disconnected` no banco**:
   - `LITE-YGE96V-MKGKLK` (Planeta Divertido)
   - `LITE-I2660D-A8QLPN` (Castelo da Diversão)
   - `LITE-MY22EC-0T7RSL` (Castelo da Diversão)
2. **A ação `configure-webhooks` está retornando “Instância não encontrada”** também para Castelo, não só Planeta.
3. **Logs recentes de `wapi-send` mostram `get-status qr response: 504` repetidamente**, ou seja, timeout/instabilidade no endpoint de status (não apenas 404).
4. **Não há logs recentes em `wapi-webhook`**, sugerindo ausência de chamadas recentes de webhook (ou assinatura de eventos quebrada).
5. Existem mensagens recentes no banco, mas isso pode vir de fluxos internos/outbound e não garante que o webhook inbound esteja saudável para todos os casos.

---

## Causa provável (mais precisa)

Hoje o sistema está tratando “falha de endpoint” como se fosse “instância não existe”, mas os sinais atuais mostram mistura de:
- **timeouts 504** (instabilidade/rede/endpoint),
- possível **incompatibilidade de endpoint para instâncias LITE** (especialmente webhook config/status),
- e **falta/queda de assinatura de webhooks** para eventos de mensagem.

Ou seja: o problema é de **camada de integração W-API**, não de um único token.

---

## Plano de implementação (para corrigir de forma definitiva)

### Fase 1 — Corrigir diagnóstico falso e estabilizar status
**Objetivo:** parar de derrubar instância para `disconnected` por erro transitório.

1. Ajustar `supabase/functions/wapi-send/index.ts` na ação `get-status`:
   - classificar resposta por tipo:
     - `NOT_FOUND` (404 consistente)
     - `TIMEOUT_OR_GATEWAY` (502/503/504/network abort)
     - `UNAUTHORIZED` (401/403)
     - `UNKNOWN`
   - **não atualizar DB para disconnected** em timeout/erro transitório.
   - retornar status explícito técnico para UI (`degraded`, `timeout`, etc.) mantendo `connected` anterior quando aplicável.

2. Ajustar `configure-webhooks`:
   - diferenciar `404` real vs resposta não-JSON de gateway/erro intermediário.
   - não marcar instância como inexistente em qualquer `non-json`.
   - retornar erro orientativo correto (“timeout/configuração não aplicada”) com código padronizado.

### Fase 2 — Tornar configuração de webhook robusta para variações da W-API
**Objetivo:** garantir configuração mesmo com variação de endpoint/plano.

3. Implementar estratégia de fallback para configuração de webhooks no `wapi-send`:
   - tentar endpoint/payload principal atual,
   - se falhar com padrão de incompatibilidade, tentar fallback(s) compatíveis,
   - logar qual variante funcionou por instância.
   
4. Criar ação de verificação (`check-webhooks`) no `wapi-send`:
   - consultar configuração ativa de webhook/eventos,
   - retornar se `onMessageReceived` e `onMessageSent` estão realmente habilitados.

### Fase 3 — Dar visibilidade no front para suporte operacional
**Objetivo:** parar “falso verde” e facilitar correção por buffet.

5. Atualizar telas de conexão (`ConnectionSection` e `HubWhatsApp`) para mostrar estados técnicos:
   - Conectado
   - Desconectado
   - Instável (timeout)
   - Webhook não configurado
   - Credencial inválida
6. Adicionar CTA de ação rápida:
   - “Reconfigurar Webhooks”
   - “Diagnóstico” (executa `get-status` + `check-webhooks` em sequência e mostra resultado amigável).

### Fase 4 — Validação fim a fim em Planeta + Castelo
**Objetivo:** confirmar retorno real das mensagens na plataforma.

7. Teste técnico por instância:
   - `get-status` (espera conectado sem falso negativo),
   - `configure-webhooks`,
   - `check-webhooks`.
8. Teste real de operação:
   - enviar mensagem no WhatsApp cliente → confirmar entrada no `wapi_messages` como `from_me=false`,
   - responder pelo painel → confirmar ida e atualização de conversa,
   - validar em **Planeta Divertido** e **Castelo da Diversão**.

---

## Arquivos previstos para alteração

- `supabase/functions/wapi-send/index.ts`
  - endurecer classificação de erro,
  - fallback de configuração de webhook,
  - nova ação de diagnóstico/check webhook,
  - logs estruturados.
- `src/components/whatsapp/settings/ConnectionSection.tsx`
  - exibir status técnico detalhado,
  - botões de diagnóstico/reconfiguração.
- `src/pages/HubWhatsApp.tsx`
  - sincronização com novos status técnicos e feedback claro.

---

## Riscos e mitigação

- **Risco:** endpoint da W-API variar por plano/conta.
  - **Mitigação:** fallback controlado + logs por tentativa.
- **Risco:** timeout intermitente mascarar estado real.
  - **Mitigação:** não rebaixar instância para disconnected por timeout único.
- **Risco:** UI continuar mostrando status enganoso.
  - **Mitigação:** separar “offline real” de “instabilidade de integração”.

---

## Resultado esperado após implementação

- Você deixa de ver “desconectado” falso por timeout.
- O sistema identifica corretamente quando o problema é webhook e não credencial.
- Reconfiguração de webhook volta a funcionar (ou falha com motivo real e acionável).
- Mensagens voltam a aparecer de forma confiável tanto no **Planeta Divertido** quanto no **Castelo da Diversão**.
