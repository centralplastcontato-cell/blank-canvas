

## Análise de Impacto da Correção

A correção proposta **não afeta as conexões das instâncias do WhatsApp de nenhum cliente**. Aqui está o porquê:

### O que a correção altera

Apenas **um campo de texto** (`bot_step`) na tabela `wapi_conversations` — que controla o estado do chatbot, não a conexão.

### O que NÃO é alterado

- Nenhuma modificação em `wapi_instances` (tabela de conexões)
- Nenhuma modificação na lógica de QR code, pairing, ou status de conexão
- Nenhuma modificação no `wapi-send` (envio de mensagens)
- Nenhuma modificação na infraestrutura de webhooks
- Nenhuma modificação no `ConnectionSection.tsx` ou `useWhatsAppConnection.ts`

### Resumo técnico

| Componente | Modificado? | Risco para conexão |
|---|---|---|
| `wapi-webhook/index.ts` — lógica do bot | Sim | Nenhum |
| `WhatsAppChat.tsx` — envio pela plataforma | Sim | Nenhum |
| Conexões / instâncias / sessões | Não | Zero |
| QR code / pairing / status | Não | Zero |

A mudança é equivalente a trocar uma "etiqueta" interna de `null` para `'human_takeover'` — apenas uma string que o bot consulta para decidir se deve responder ou não. Não toca em nenhum endpoint de conexão, credencial, ou sessão do W-API.

