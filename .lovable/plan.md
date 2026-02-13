
# Resumo Automático do Lead com IA

## O que vai ser feito
Ao abrir os detalhes de um lead, o sistema vai analisar as mensagens do WhatsApp e gerar automaticamente:
1. **Resumo da conversa** - O que o lead quer, contexto principal
2. **Sugestao de proxima acao** - O que o atendente deveria fazer agora

O resumo aparece como um card dentro do LeadDetailSheet (painel lateral de detalhes do lead).

## Como funciona

1. O usuario abre o detalhe de um lead
2. O frontend busca as ultimas mensagens do WhatsApp desse lead (via conversation vinculada)
3. Envia para uma edge function que chama o Gemini 3 Flash Preview
4. A IA retorna um resumo + sugestao de acao
5. O resultado aparece em um card com icone de IA

## Etapas tecnicas

### 1. Criar Edge Function `lead-summary`
**Arquivo:** `supabase/functions/lead-summary/index.ts`

- Recebe `lead_id` e `company_id`
- Busca a conversa vinculada ao lead em `wapi_conversations` (via `lead_id`)
- Busca as ultimas 30 mensagens de `wapi_messages` dessa conversa
- Envia para o Lovable AI Gateway com modelo `google/gemini-3-flash-preview`
- Prompt do sistema instrui a IA a retornar um resumo curto e uma sugestao de proxima acao
- Retorna JSON: `{ summary: string, nextAction: string }`
- Trata erros 429 (rate limit) e 402 (creditos)

### 2. Registrar no config.toml
Adicionar `[functions.lead-summary]` com `verify_jwt = false`

### 3. Criar hook `useLeadSummary`
**Arquivo:** `src/hooks/useLeadSummary.ts`

- Recebe `leadId` como parametro
- Usa `supabase.functions.invoke('lead-summary', { body: { lead_id, company_id } })`
- Retorna `{ summary, nextAction, isLoading, error, refetch }`
- So executa quando o sheet esta aberto e tem um lead selecionado

### 4. Atualizar `LeadDetailSheet.tsx`
- Importar e usar o hook `useLeadSummary`
- Adicionar um card de "Resumo IA" logo apos as informacoes basicas do lead
- Mostra icone de Brain/Sparkles, o resumo e a sugestao de acao
- Botao para regenerar o resumo
- Estado de loading com skeleton
- Mensagens de erro amigaveis para rate limit e creditos

### Arquivos modificados
| Arquivo | Acao |
|---------|------|
| `supabase/functions/lead-summary/index.ts` | Criar |
| `supabase/config.toml` | Adicionar funcao |
| `src/hooks/useLeadSummary.ts` | Criar |
| `src/components/admin/LeadDetailSheet.tsx` | Adicionar card de resumo IA |
