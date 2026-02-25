
## Corrigir tempos dos Follow-ups na aba Inteligencia

### Problema
A aba Follow-ups na pagina de Inteligencia mostra tempos fixos (ex: 24h, 48h, 72h, 96h) que nao correspondem aos tempos configurados pelo buffet (ex: 72h, 144h, 216h, 288h).

**Causa raiz**: A empresa tem 2 instancias WhatsApp (Trujillo e Manchester) com configuracoes diferentes. A query atual busca `wapi_bot_settings` filtrada por `company_id` com `.maybeSingle()`, que retorna a primeira linha encontrada -- que pode ser da instancia errada.

- Instancia Trujillo: 24h / 48h / 72h / 96h
- Instancia Manchester: 72h / 144h / 216h / 288h

O sistema esta pegando os valores da Trujillo e mostrando nos cards, mas os leads circulados na imagem sao da Manchester.

### Solucao
Alterar o `FollowUpsTab` para buscar os settings de **todas** as instancias da empresa e agrupar os leads por instancia, mostrando o delay correto de cada uma.

### Mudancas tecnicas

**Arquivo: `src/components/inteligencia/FollowUpsTab.tsx`**

1. Alterar a query de `wapi_bot_settings` para buscar **todas** as linhas da empresa (remover `.maybeSingle()`, usar `.select()` normal)
2. Buscar tambem as `wapi_instances` da empresa para mapear `instance_id` -> `unit`
3. Cruzar os leads do `lead_history` com o `instance_id` da conversa (`wapi_conversations`) para saber de qual instancia cada lead pertence
4. Para cada coluna de follow-up, mostrar o delay correspondente a instancia do lead (ou se todas as instancias tiverem o mesmo delay, mostrar um unico valor)
5. Caso as instancias tenham delays diferentes, mostrar o delay mais comum ou agrupar visualmente

**Abordagem simplificada (recomendada)**: Como a aba de Inteligencia ja filtra por unidade (o usuario pode selecionar a unidade), buscar o `wapi_bot_settings` da instancia correspondente a unidade selecionada. Se nenhuma unidade estiver selecionada, usar os valores da primeira instancia encontrada ou calcular a media.

**Alternativa mais robusta**: Cruzar cada lead com sua instancia via `wapi_conversations.instance_id` e mostrar o delay correto por instancia nos cards.

### Implementacao detalhada

1. Na funcao `loadFollowUpData`, buscar todos os bot_settings da empresa (sem `.maybeSingle()`)
2. Buscar as instancias da empresa para mapear instance_id -> unit
3. Buscar as conversas dos leads para saber qual instancia cada lead usa
4. Nos headers dos cards, mostrar o delay da instancia correspondente ou, se houver multiplas instancias com delays diferentes, mostrar um range ou o delay mais frequente
5. Manter compatibilidade com empresas que tem apenas 1 instancia (comportamento atual)
