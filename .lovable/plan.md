

## Plan: Personalizar mensagens default de follow-up (remover "Castelo da Diversão")

### Problema
As mensagens default de follow-up na edge function `follow-up-check` contêm referências hardcoded ao "Castelo da Diversão" e ao emoji 🏰. Quando um buffet não customiza suas mensagens, os leads recebem textos com o nome de outra empresa.

### Solução
1. **Edge Function** (`supabase/functions/follow-up-check/index.ts`): Substituir as 4 mensagens default por textos genéricos usando `{empresa}` como variável, e adicionar suporte à variável `{empresa}` na interpolação (buscando o `company.name` que já está disponível via `instance.company_id`).

2. **Frontend** (`src/components/whatsapp/settings/AutomationsSection.tsx`): Atualizar os placeholders dos textareas de follow-up para refletir os novos textos genéricos e mencionar `{empresa}` como variável disponível.

### Mudanças

**`supabase/functions/follow-up-check/index.ts`**

- `getDefaultFollowUpMessage()` (linhas 762-792): Reescrever as 4 mensagens removendo "Castelo da Diversão" e usando `{empresa}`:
  - FU1: "Olá, {nome}! 👋\n\nPassando para saber se teve a chance de analisar as informações que enviamos sobre a {empresa}!\n\nEstamos à disposição para esclarecer qualquer dúvida ou agendar uma visita. Podemos te ajudar? 😊"
  - FU2: "Olá, {nome}! 👋\n\nAinda não tivemos retorno sobre a festa na {empresa}!\n\nTemos pacotes especiais e datas disponíveis para {mes}. Que tal agendar uma visita?\n\nEstamos aqui para te ajudar! 😊"
  - FU3: "Oi, {nome}! 😊\n\nSei que a decisão leva tempo, mas quero garantir que você não perca as melhores datas para {mes}! 📅\n\nPosso te ajudar com alguma dúvida ou enviar mais informações sobre nossos pacotes?"
  - FU4: "{nome}, última chamada! 🎉\n\nAs datas para {mes} estão quase esgotadas! Se ainda estiver pensando na festa, esse é o momento ideal para garantir.\n\nPosso reservar um horário para você conhecer nosso espaço?"

- No bloco de `processFollowUp` (linha ~614-631): Após buscar `instance`, fazer uma query adicional para buscar `company.name` e adicionar `{empresa}` ao replace:
  ```
  .replace(/\{empresa\}/g, companyName || "nosso buffet")
  ```

**`src/components/whatsapp/settings/AutomationsSection.tsx`**

- Atualizar os 4 placeholders dos textareas de follow-up (linhas ~1735, 1828, 1916, 2004) para textos genéricos que mencionem `{empresa}` como variável disponível.
- Adicionar nota visual de variáveis disponíveis: `{nome}`, `{empresa}`, `{mes}`, `{unidade}`, `{convidados}`.

### Resultado
- Buffets que não customizaram as mensagens receberão textos com o nome correto da empresa automaticamente
- A variável `{empresa}` fica disponível para quem customiza manualmente
- Zero impacto em buffets que já têm mensagens customizadas (o fallback só é usado quando `follow_up_message` é null)

