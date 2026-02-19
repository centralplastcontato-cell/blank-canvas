
# Corrigir mensagens de follow-up usando numero de telefone como nome

## Problema identificado

As mensagens automaticas de follow-up estao enviando o numero de telefone do lead como se fosse o nome dele (ex: "Oi 5515997758405, notei que..."). Isso acontece mesmo quando o lead ja informou o nome durante o fluxo do bot.

## Causa raiz (duas falhas combinadas)

**Falha 1 - `contact_name` nunca e atualizado com o nome real:**
Quando o bot coleta o nome do lead (passo `nome`), ele salva em `bot_data.nome` e em `campaign_leads.name`, mas o campo `contact_name` da tabela `wapi_conversations` continua com o valor original do perfil do WhatsApp — que muitas vezes e o proprio numero de telefone.

**Falha 2 - Falta de validacao no follow-up:**
No `follow-up-check/index.ts` (linha 670), o codigo usa `botData.nome || conv.contact_name` sem verificar se o valor resultante e um numero de telefone.

## Solucao em 3 partes

### Parte 1 - Atualizar `contact_name` quando o bot coleta o nome

**Arquivo:** `supabase/functions/wapi-webhook/index.ts`

No trecho apos a validacao bem-sucedida do passo `nome` (linha 1536-1538), adicionar logica para atualizar o `contact_name` da conversa:

```ts
// Linha 1538: apos salvar o nome no updated
updated[step] = validation.value || content.trim();

// NOVO: Se o passo atual e "nome", atualizar contact_name na conversa
if (step === 'nome' && validation.value) {
  await supabase.from('wapi_conversations').update({
    contact_name: validation.value,
  }).eq('id', conv.id);
}
```

### Parte 2 - Funcao helper `resolveFirstName` no follow-up

**Arquivo:** `supabase/functions/follow-up-check/index.ts`

Adicionar funcao auxiliar no topo do arquivo:

```ts
function resolveFirstName(
  botData: Record<string, unknown>,
  contactName: string | null,
  leadName?: string | null
): string {
  // Prioridade: bot_data.nome > lead.name > contact_name
  const raw = String(botData?.nome || leadName || contactName || "")
    .trim()
    .split(" ")[0];
  // Se vazio, so digitos (7+), ou comeca com +, nao e nome valido
  if (!raw || /^\+?\d{7,}$/.test(raw)) {
    return "cliente";
  }
  return raw;
}
```

### Parte 3 - Usar `resolveFirstName` em todos os pontos do follow-up

**Arquivo:** `supabase/functions/follow-up-check/index.ts`

**Linha 670** (`processBotInactiveFollowUp`):
```ts
// De:
const firstName = (String(botData.nome || conv.contact_name || "")).split(" ")[0] || "cliente";

// Para:
const firstName = resolveFirstName(botData, conv.contact_name);
```

**Linha ~214** (`processNextStepReminder`) - aplicar a mesma correcao se existir logica similar.

**Linha ~452** (`processFollowUp`) - verificar e corrigir se necessario (usa `lead.name` que vem de `campaign_leads`, mas tambem precisa da validacao).

### Parte 4 - Buscar nome do lead como fallback adicional

No `processBotInactiveFollowUp`, quando o `botData.nome` esta vazio e a conversa tem `lead_id`, buscar o nome diretamente de `campaign_leads`:

```ts
// Antes de resolver o nome, tentar buscar do lead
let leadName: string | null = null;
if (conv.lead_id) {
  const { data: lead } = await supabase
    .from('campaign_leads')
    .select('name')
    .eq('id', conv.lead_id)
    .single();
  leadName = lead?.name || null;
}
const firstName = resolveFirstName(botData, conv.contact_name, leadName);
```

## Detalhes tecnicos

### Arquivos modificados
- `supabase/functions/wapi-webhook/index.ts` - Atualizar `contact_name` ao coletar nome
- `supabase/functions/follow-up-check/index.ts` - Adicionar `resolveFirstName` e usá-la em 3 funcoes

### Impacto
- Mensagens de follow-up passarao a usar o nome correto do lead
- Leads que ja informaram o nome terao o `contact_name` atualizado em tempo real
- Fallback seguro para "cliente" quando nenhum nome valido e encontrado
- Sem impacto em leads que ja funcionam corretamente
- Requer deploy dos edge functions `wapi-webhook` e `follow-up-check`
