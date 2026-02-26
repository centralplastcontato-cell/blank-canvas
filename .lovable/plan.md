

## Corrigir template de WhatsApp ignorando a configuração do Bot LP

### Problema identificado
Quando voce edita o template de WhatsApp nas configurações do Bot LP (removendo a palavra "meu", por exemplo), a mensagem enviada continua usando o texto antigo. Isso acontece porque existem **duas mensagens hardcoded** no codigo que nao respeitam a configuração:

1. **Linha 386 do `LeadChatbot.tsx`** - O `defaultNormalMsg` e uma mensagem fixa com "Meus dados" e "meu orcamento" que e usada quando o template customizado nao esta disponivel
2. **Linha 396 do `LeadChatbot.tsx`** - A mensagem de redirecionamento tambem e hardcoded e nunca usa o template

### Causa raiz
Na `DynamicLandingPage.tsx` (linha 118), o `whatsapp_welcome_template` do banco e passado para o `LeadChatbot`. Porem, se o valor vier como `null` ou vazio (por causa do `|| null` na linha 119), o chatbot cai no fallback hardcoded da linha 386, que tem o texto antigo com "meu".

### Solucao

**Arquivo: `src/components/landing/LeadChatbot.tsx`**
- Atualizar o `defaultNormalMsg` (linha 386) para remover "Meus" e "meu", alinhando com o template padrao que voce editou
- Mais importante: garantir que quando o `lpBotConfig` existe mas o `whatsapp_welcome_template` esta vazio/null, o sistema use o template padrao atualizado em vez do hardcoded antigo

**Arquivo: `src/pages/DynamicLandingPage.tsx`**
- Linha 118: Mudar de `(botSettings as any).whatsapp_welcome_template || null` para preservar o valor do banco corretamente

### Detalhes tecnicos
- No `LeadChatbot.tsx`, o `defaultNormalMsg` na linha 386 sera atualizado para refletir o mesmo texto do template padrao configuravel
- A logica de fallback (linhas 395-399) sera simplificada para sempre aplicar o template quando disponivel, caindo no default atualizado apenas quando nenhuma configuracao existir

### Resultado
Qualquer alteracao feita no campo "Mensagem de WhatsApp" nas configuracoes do Bot LP sera refletida imediatamente na mensagem enviada ao lead.

