

## Plano: Sistema hibrido de mensagens interativas (apenas Mega Magic)

### Resumo
Implementar envio de mensagens interativas (botoes e listas) no bot do WhatsApp **apenas para a instancia do Mega Magic** (instance_id `fff981eb-ebdd-49b6-9643-0251e252b586`). Todas as outras empresas continuam com texto numerado.

### O que muda para o lead do Mega Magic

Hoje o lead recebe texto puro com numeros emoji. Com a mudanca:
- Perguntas com **2-3 opcoes** (tipo, proximo_passo) → **botoes clicaveis**
- Perguntas com **4-10 opcoes** (convidados com 9 opcoes) → **lista interativa** (menu dropdown)
- Perguntas com **11+ opcoes** (meses com 11) → **texto numerado** (sem mudanca)

Os textos configurados na tabela `wapi_bot_questions` permanecem **100% iguais**.

### Alteracoes tecnicas

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**

1. **Adicionar constante com o ID da instancia Mega Magic** para controlar o escopo do teste

2. **Criar helper `parseNumberedOptions(text)`** que extrai corpo da mensagem e opcoes do texto existente (detecta emoji numerados 1️⃣, 2️⃣, etc.)

3. **Criar helper `sendInteractiveOrText()`** que:
   - Verifica se a instancia e a do Mega Magic E provider e `zapi`
   - Se sim, usa `parseNumberedOptions()` no texto
   - 2-3 opcoes → chama Z-API `/send-button-actions` (botoes rapidos)
   - 4-10 opcoes → chama Z-API `/send-option-list` (lista interativa)
   - 11+ ou parse falhou → envia texto normal via `sendBotMessage()`
   - Se nao e Mega Magic → envia texto normal (comportamento atual)
   - Fallback: se envio interativo falhar, reenvia como texto

4. **Substituir chamada `sendBotMessage()` na linha 2826** por `sendInteractiveOrText()` — este e o unico ponto de envio de perguntas do bot

5. **Adicionar parsing de respostas interativas em `extractMsgContent()`** — quando o lead clica num botao ou item da lista, a Z-API envia campos `listResponseMessage` ou `buttonsResponseMessage` no webhook. Precisamos extrair o texto da opcao selecionada para que o bot processe normalmente

### Endpoints Z-API utilizados

```text
POST /send-button-actions
Body: { phone, message, buttonActions: { buttons: [{ id, label }] } }

POST /send-option-list  
Body: { phone, optionList: { title, buttonLabel, options: [{ id, title }] } }
```

### Seguranca e escopo

- **Apenas Mega Magic**: verificacao por `instance.id === 'fff981eb-...'`
- **Fallback automatico**: se a Z-API rejeitar o formato interativo, reenvia como texto
- **Sem alteracao em banco**: nenhuma migration necessaria
- **Sem alteracao no frontend**: tudo acontece na Edge Function
- **Reversivel**: basta remover a constante e a verificacao para voltar ao comportamento anterior

### Risco
Baixo. O unico ponto de mudanca e a funcao de envio de mensagens do bot. O fallback garante que se algo der errado, o texto normal e enviado.

