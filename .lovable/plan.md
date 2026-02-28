

## Limpeza de conversas fantasma @lid

### Resumo

Remover 31 conversas fantasma e 93 mensagens associadas do banco de dados. Todas possuem `remote_jid LIKE '%@lid'` -- um identificador Meta que nunca corresponde a conversas reais (que usam `@s.whatsapp.net`).

### Dados confirmados

- **Castelo da Diversao (Trujillo)**: 24 conversas fantasma
- **Planeta Divertido**: 7 conversas fantasma
- **Total de mensagens a remover**: 93
- **Risco para dados reais**: Zero -- o filtro `@lid` e exclusivo de identificadores Meta

### Verificacao de dependencias

Antes de deletar as conversas, e necessario verificar e limpar registros dependentes em tabelas relacionadas:

1. `flow_lead_state` -- estados de fluxo do bot vinculados a essas conversas
2. `wapi_messages` -- mensagens vinculadas a essas conversas
3. `wapi_conversations` -- as conversas fantasma em si

### Sequencia de execucao

1. **Deletar `flow_lead_state`** onde `conversation_id` pertence a conversas com `@lid`
2. **Deletar `wapi_messages`** onde `conversation_id` pertence a conversas com `@lid`
3. **Deletar `wapi_conversations`** onde `remote_jid LIKE '%@lid'`

### Detalhes tecnicos

Tres operacoes DELETE executadas via ferramenta de insercao/delecao do Supabase, nesta ordem:

```text
-- Passo 1: Limpar estados de fluxo
DELETE FROM flow_lead_state 
WHERE conversation_id IN (
  SELECT id FROM wapi_conversations WHERE remote_jid LIKE '%@lid'
);

-- Passo 2: Limpar mensagens
DELETE FROM wapi_messages 
WHERE conversation_id IN (
  SELECT id FROM wapi_conversations WHERE remote_jid LIKE '%@lid'
);

-- Passo 3: Limpar conversas
DELETE FROM wapi_conversations 
WHERE remote_jid LIKE '%@lid';
```

### O que NAO sera alterado

- Nenhum codigo frontend ou backend sera modificado
- Nenhuma conexao WhatsApp sera afetada
- Nenhuma conversa real sera tocada
- O filtro no webhook (ja ativo) continua impedindo novas fantasmas

