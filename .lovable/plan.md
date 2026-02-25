
## Rotação Automática de Meses (Cron Mensal)

### O que faz
No dia 1 de cada mês, uma Edge Function roda automaticamente e, para cada empresa:
1. Remove o mês que acabou de passar da lista
2. Adiciona um novo mês futuro no final da lista
3. Atualiza tanto o **Bot LP** quanto o **Bot WhatsApp**

### Exemplo prático (executando em 1 de Março de 2026)
- **Remove**: "Fevereiro" (ou "Fevereiro/26")
- **Adiciona**: o próximo mês futuro que ainda não existe na lista (ex: "Abril/27")
- Lista antes: `[Fevereiro, Março, Abril, ..., Dezembro, Janeiro/27, Fevereiro/27, Março/27]`
- Lista depois: `[Março, Abril, ..., Dezembro, Janeiro/27, Fevereiro/27, Março/27, Abril/27]`

### Componentes

**1. Nova Edge Function: `rotate-months`**
- Busca todos os registros de `lp_bot_settings` e atualiza `month_options` (JSON array)
- Busca todos os registros de `wapi_bot_questions` com `step = 'mes'` e reescreve o `question_text` com os meses atualizados (mantendo o texto introdutório e o formato de emojis numericos)
- Logica: identifica o mês atual, remove qualquer variante do mês anterior (com ou sem ano), calcula o proximo mês a adicionar baseado no ultimo da lista

**2. Cron Job via pg_cron**
- Agenda: `0 3 1 * *` (todo dia 1, as 3h da manha)
- Chama a Edge Function `rotate-months` via `net.http_post`

### Detalhes tecnicos

A funcao precisa lidar com formatos variados de meses:
- Simples: "Fevereiro", "Marco"
- Com ano: "Fevereiro/27", "Marco/2027"
- Opcao especial "Ainda nao decidi" sera preservada

Para o Bot WhatsApp, a funcao reconstroi o bloco de opcoes numeradas com emojis, mantendo o texto introdutorio original de cada empresa.
