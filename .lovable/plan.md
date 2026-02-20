
## Consolidar Qualificação IA no nó Pergunta

### O Problema

Hoje existem duas formas paralelas de fazer a mesma coisa:

1. **Nó "Qualificação IA"** (`qualify`): usa OpenAI para classificar resposta livre → salva o label legível no CRM
2. **Toggle "Interpretação IA"** no nó Pergunta (`question`): faz apenas correspondência de texto simples (não chama LLM de verdade)

Ou seja, o `allow_ai_interpretation` no nó Pergunta **não é IA de verdade** — é só um `includes()`. O nó `qualify` é o único que realmente chama o GPT-4o-mini.

### Solução Proposta

Unificar tudo no nó **Pergunta** já existente: quando o toggle "Interpretação IA" estiver ativado, o comportamento passa a ser idêntico ao do nó Qualificação IA (chamada real ao LLM, salva o label, usa contexto). O nó `qualify` separado deixa de existir na toolbar.

---

### Arquitetura Final

```text
Nó: Pergunta (question)
│
├── [toggle OFF] Interpretação IA desativada
│   └── Aceita apenas número/texto exato das opções
│
└── [toggle ON] Interpretação IA ativada  ← MESMA lógica do qualify atual
    ├── Chama GPT-4o-mini para classificar a resposta livre
    ├── Campo: "Dica de contexto para a IA" (action_config.qualify_context)
    ├── Salva o label legível no CRM (extract_field)
    └── Roteia pelo handle da opção identificada
```

---

### Mudanças Necessárias

**1. Webhook (`wapi-webhook/index.ts`)**

A lógica do bloco `qualify` (linhas 553–678) precisa ser replicada dentro do bloco `question` quando `allow_ai_interpretation === true`. Em vez de só fazer `includes()`, vai chamar o OpenAI com as opções e o contexto configurado, igual ao qualify.

**2. Editor do nó (`FlowNodeEditor.tsx`)**

Quando `allow_ai_interpretation` estiver ativado em um nó Pergunta, exibir:
- O campo "Dica de contexto para a IA" (`action_config.qualify_context`) — hoje só aparece em nós `qualify`
- Badge informativa igual à do qualify

**3. Visual do canvas (`FlowNodeComponent.tsx`)**

Mostrar o badge roxo "Resposta livre → IA classifica" em nós do tipo `question` que tenham `allow_ai_interpretation: true` (hoje só aparece em nós `qualify`).

**4. Toolbar (`FlowToolbar.tsx`)**

Remover o botão "Qualificação IA" da lista de nós disponíveis para adicionar. O tipo `qualify` fica no código para não quebrar nós existentes, mas não será mais oferecido como novo nó.

**5. Migração de banco de dados**

Converter os nós `qualify` existentes no fluxo para `question` com `allow_ai_interpretation = true`, mantendo todas as opções, `extract_field` e `action_config` (qualify_context). Isso inclui os dois nós qualify que existem hoje no fluxo:
- `a1b2c3d4-...` → "Qualificação – Turno da Visita"
- `c49b9640-...` → "Qualificação – Turno da Visita (cópia)"

---

### Resultado

- **Menos complexidade**: 1 tipo de nó no lugar de 2
- **Mais consistente**: o toggle "Interpretação IA" passa a funcionar de verdade em qualquer nó Pergunta
- **Nós existentes migrados** automaticamente via migration SQL
- **Backward compatible**: o código ainda suporta nós `qualify` antigos caso existam em outros fluxos
