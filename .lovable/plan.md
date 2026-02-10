

## Criar Fluxo de Exemplo para Castelo da Diversao

### Objetivo
Inserir um fluxo completo no banco de dados para a empresa **Castelo da Diversao** (`a0000000-0000-0000-0000-000000000001`), permitindo testar o processador `processFlowBuilderMessage` no webhook de ponta a ponta.

### Estrutura do Fluxo

O fluxo tera 5 nos conectados sequencialmente:

```text
[Inicio] --> [Boas-vindas] --> [Pergunta: Nome] --> [Pergunta: Mes] --> [Fim]
```

**Detalhes dos nos:**

| # | Tipo | Titulo | Mensagem/Acao |
|---|------|--------|---------------|
| 1 | start | Inicio | (sem mensagem) |
| 2 | message | Boas-vindas | "Ola! Bem-vindo ao Castelo da Diversao! Vamos te ajudar a planejar sua festa." |
| 3 | question | Nome do Cliente | "Qual e o seu nome?" (extract_field: customer_name) |
| 4 | question | Mes da Festa | "Para qual mes voce esta planejando a festa? Digite o numero:\n\n*1* - Este mes\n*2* - Proximo mes\n*3* - Daqui 2+ meses" (3 opcoes) |
| 5 | end | Fim | "Obrigado {nome}! Um atendente vai entrar em contato em breve." |

**Arestas (conexoes):**
- Inicio -> Boas-vindas (automatica)
- Boas-vindas -> Pergunta Nome (automatica)
- Pergunta Nome -> Pergunta Mes (fallback - qualquer resposta aceita como nome)
- Opcao 1 (Este mes) -> Fim
- Opcao 2 (Proximo mes) -> Fim
- Opcao 3 (Daqui 2+ meses) -> Fim

### Operacoes no banco

Serao feitas **4 insercoes** usando o insert tool (dados, nao schema):

1. **conversation_flows**: 1 registro (is_active=true, is_default=true)
2. **flow_nodes**: 5 registros (start, message, question, question, end)
3. **flow_node_options**: 3 registros (opcoes da pergunta de mes)
4. **flow_edges**: 6 registros (conexoes entre nos)

### Tambem habilitar o modulo

Atualizar `companies.settings` para incluir `flow_builder: true` nos modulos habilitados, para que o toggle apareca na interface.

### Detalhes tecnicos

- Todos os UUIDs serao gerados pelo banco (`gen_random_uuid()`) exceto onde precisamos referenciar entre tabelas - nesse caso usaremos UUIDs fixos para manter as foreign keys
- O fluxo sera marcado como `is_default = true` e `is_active = true` para ser encontrado pelo webhook
- Os nos terao posicoes X/Y sequenciais para visualizacao no canvas

