
# Mensagem Sugerida pela IA para Envio no WhatsApp

## O que muda
Quando a IA gerar o resumo de um lead, ela tambem elaborara uma **mensagem personalizada** pronta para enviar ao lead. O usuario clica em um botao e e redirecionado para o chat do WhatsApp com a mensagem ja preenchida no campo de texto.

## Fluxo do usuario
1. Abre o Resumo IA (Prioridades ou Leads do Dia)
2. Ve o resumo, proxima acao e agora tambem a **mensagem sugerida**
3. Clica no botao "Enviar no WhatsApp"
4. E redirecionado para `/atendimento?phone=XXX&draft=MENSAGEM`
5. A mensagem aparece no campo de texto do chat, pronta para revisar e enviar manualmente

## Alteracoes

### 1. Edge Function `lead-summary` (backend)
- Atualizar o prompt do sistema para pedir um terceiro campo: `"suggestedMessage"` -- uma mensagem curta, cordial e personalizada que o atendente pode enviar diretamente ao lead
- O retorno passa a incluir `{ summary, nextAction, suggestedMessage }`
- Salvar o campo na tabela `lead_intelligence` (coluna nova `ai_suggested_message`)

### 2. Migration SQL
Adicionar coluna na tabela `lead_intelligence`:

```text
ALTER TABLE public.lead_intelligence 
  ADD COLUMN IF NOT EXISTS ai_suggested_message text;
```

### 3. Hook `useLeadSummary`
- Atualizar o tipo `LeadSummaryResult` para incluir `suggestedMessage?: string`
- Carregar o campo salvo (`ai_suggested_message`) ao buscar resumo existente
- Retornar o campo no resultado do `fetchSummary`

### 4. Componente `InlineAISummary`
- Exibir a mensagem sugerida abaixo da "Proxima acao" em um card destacado com icone de WhatsApp
- Botao "Copiar" para copiar a mensagem
- Botao "Enviar no WhatsApp" que navega para `/atendimento?phone=XXX&draft=MENSAGEM_ENCODED`
- Precisa receber `leadWhatsapp` como prop adicional

### 5. `PrioridadesTab` e `LeadsDoDiaTab`
- Passar `leadWhatsapp={item.lead_whatsapp}` para o `InlineAISummary`

### 6. `CentralAtendimento` + `WhatsAppChat`
- Ler o query param `draft` da URL
- Propagar como prop `initialDraft` para `WhatsAppChat`
- No `WhatsAppChat`, quando `initialDraft` existir, setar `setNewMessage(initialDraft)` apos selecionar a conversa

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Adicionar coluna `ai_suggested_message` |
| `supabase/functions/lead-summary/index.ts` | Adicionar `suggestedMessage` no prompt e retorno |
| `src/hooks/useLeadSummary.ts` | Incluir campo `suggestedMessage` |
| `src/components/inteligencia/InlineAISummary.tsx` | Exibir mensagem sugerida + botoes |
| `src/components/inteligencia/PrioridadesTab.tsx` | Passar `leadWhatsapp` para InlineAISummary |
| `src/components/inteligencia/LeadsDoDiaTab.tsx` | Passar `leadWhatsapp` para InlineAISummary |
| `src/pages/CentralAtendimento.tsx` | Ler param `draft` da URL |
| `src/components/whatsapp/WhatsAppChat.tsx` | Receber e aplicar `initialDraft` |

## Detalhes tecnicos

- A mensagem sugerida e gerada pelo mesmo request de IA que ja existe (sem custo adicional)
- O param `draft` na URL e codificado com `encodeURIComponent` e decodificado com `decodeURIComponent`
- O envio permanece manual: o usuario ve a mensagem no campo de texto e decide se envia ou edita
- O `LeadDetailSheet` tambem pode se beneficiar disso futuramente, pois ja usa o mesmo hook
