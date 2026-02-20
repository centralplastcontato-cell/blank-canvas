
# Nó de Qualificação Inteligente no Flow Builder

## O Problema Atual

Quando um nó com `extract_field` captura uma resposta livre do usuário (ex: o lead digita "1", "2", ou qualquer texto), o sistema salva literalmente o que foi digitado no campo coletado. Isso significa que o CRM mostra "1" ou "2" ao invés do que aquele número representa (ex: "Manhã", "Fim de semana").

O problema central é na linha 554 do webhook:
```typescript
collectedData[currentNode.extract_field] = content.trim(); // salva "1" ao invés de "Manhã"
```

## A Solução: Nó de Qualificação com IA

Criar um novo tipo de nó chamado **`qualify`** que usa a API da OpenAI para interpretar a resposta livre do usuário e mapeá-la para o valor correto de um campo — independentemente do formato da resposta ou da pergunta feita.

### Por que isso é poderoso?
- Se a pergunta muda (ex: de "escolha 1 ou 2" para "qual seu turno preferido?"), o nó ainda entende a resposta
- O usuário pode responder com texto livre ("de manhã", "prefiro sábado de manhã cedo") e o bot extrai corretamente
- Elimina a necessidade de numeração nas opções para fins de qualificação

---

## Arquitetura Técnica

### 1. Novo tipo de nó: `qualify`

Adicionado ao `types.ts` do Flow Builder:

```text
NodeType = 'start' | 'message' | 'question' | 'action' | 'condition' | 'end' | 'delay' | 'timer' | 'qualify'
```

O nó `qualify` funciona assim:
- Envia uma mensagem/pergunta ao lead
- Espera a resposta (qualquer texto livre)
- Envia a resposta para a OpenAI com o contexto das opções configuradas
- A IA identifica qual opção melhor representa a resposta
- Salva o **label** da opção (não o número) no `collected_data`
- Avança o fluxo pelo edge correto, como um nó de pergunta normal

### 2. Mudança no webhook (`wapi-webhook/index.ts`)

**Novo case `qualify`** no switch de tipos de nó:
1. Envia a pergunta configurada no nó
2. Coloca o estado em `waiting_for_reply = true`
3. Quando o lead responde, chama a OpenAI passando:
   - A resposta do lead
   - As opções disponíveis (labels + values)
   - Contexto do buffet (tipo de resposta esperada)
4. A IA retorna o `value` da opção correspondente
5. O sistema salva o **label legível** (ex: "Manhã") no `collected_data`
6. Avança pelo edge correto

**Também corrigir o bug atual**: para nós `question` com opções, quando o usuário digita um número, salvar o **label da opção** ao invés do value numérico:

```typescript
// ANTES (bugado):
collectedData[currentNode.extract_field] = content.trim(); // salva "1"

// DEPOIS (correto):
collectedData[currentNode.extract_field] = selectedOption.label; // salva "Manhã"
```

### 3. Mudanças no `FlowNodeEditor.tsx`

Adicionar suporte visual para o novo nó `qualify`:
- Ícone diferente (ex: `Sparkles` ou `Brain`)
- Seção de configuração para as opções de qualificação
- Campo para configurar a "dica de contexto" para a IA (ex: "turno do dia", "dia da semana")

### 4. Mudanças no `FlowNodeComponent.tsx` e `types.ts`

Adicionar cor e ícone para o novo tipo de nó.

---

## Fluxo de Execução

```text
Lead envia mensagem
        ↓
Nó "qualify" enviou a pergunta? → Sim → Captura resposta livre
        ↓
Envia para OpenAI:
  "O usuário respondeu: 'de manhã cedo'. 
   Classifique em: manha, tarde, noite.
   Retorne apenas o value."
        ↓
IA retorna: "manha"
        ↓
Sistema salva: collected_data["preferred_slot"] = "Manhã" (label)
        ↓
Avança pelo edge da opção "manha"
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/components/flowbuilder/types.ts` | Adicionar `qualify` ao `NodeType`, labels e cores |
| `src/components/flowbuilder/FlowNodeEditor.tsx` | UI para configurar o nó qualify |
| `src/components/flowbuilder/FlowNodeComponent.tsx` | Ícone e visual do nó qualify |
| `supabase/functions/wapi-webhook/index.ts` | Lógica do nó qualify + correção do bug de label vs número |

---

## Correção do Bug Atual (incluso no plano)

Mesmo sem o nó qualify, vamos corrigir o bug de salvar "1" ao invés do label da opção selecionada. Na resposta do usuário para nós `question`, ao invés de salvar `content.trim()` no `extract_field`, salvaremos `selectedOption.label` — que é o texto legível que aparece para o usuário.

---

## Comportamento do Nó Qualify vs Question

| Característica | `question` | `qualify` |
|---|---|---|
| Mostra opções numeradas | Sim | Não (opcional) |
| Exige resposta em número | Sim | Não |
| Entende texto livre | Parcialmente | Sim (via IA) |
| Salva no CRM | Valor da opção | Label legível |
| Avança por edge da opção | Sim | Sim |
