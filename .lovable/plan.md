

# Plano: Autonomia Total do Bot para Cada Empresa

## Problema Identificado

1. O `DEFAULT_QUESTIONS` no frontend (AutomationsSection) tem apenas 4 passos (nome, mes, dia, convidados), enquanto o webhook tem 5 (inclui `tipo_cliente`)
2. Quando uma nova empresa e criada, nenhuma pergunta e inserida automaticamente na tabela `wapi_bot_questions` -- o bot depende de um fallback hardcoded no webhook
3. Isso causa inconsistencia entre empresas (Castelo funciona porque foi configurado manualmente, Planeta Divertido ficou incompleto)

## Solucao

### 1. Corrigir o DEFAULT_QUESTIONS no frontend

Adicionar o passo `tipo` (Ja sou cliente / Quero orcamento) na lista padrao do `AutomationsSection.tsx`, alinhando com o que o webhook espera:

```
nome -> tipo -> mes -> dia -> convidados
```

### 2. Auto-popular perguntas ao selecionar instancia

No `AutomationsSection`, quando o usuario seleciona uma instancia e **nao existem perguntas salvas** (`wapi_bot_questions` vazio para aquela instancia), inserir automaticamente os 5 passos padrao no banco. Assim toda empresa nova ja tera as perguntas prontas para editar.

### 3. Corrigir dados do Planeta Divertido

Executar uma migracao SQL para:
- Atualizar a `welcome_message` do Planeta Divertido (remover referencia ao "Castelo da Diversao")
- Inserir o passo `tipo` que esta faltando, reordenando os demais

## Detalhes Tecnicos

### Arquivo: `src/components/whatsapp/settings/AutomationsSection.tsx`

**Mudanca 1** -- Atualizar `DEFAULT_QUESTIONS` (linha ~105):
```typescript
const DEFAULT_QUESTIONS = [
  { step: 'nome', question_text: 'Para comecar, me conta: qual e o seu nome? ...', confirmation_text: 'Muito prazer, {nome}! ...', sort_order: 1, is_active: true },
  { step: 'tipo', question_text: 'Voce ja e nosso cliente ou gostaria de receber um orcamento? ...\n\n1 - Ja sou cliente\n2 - Quero um orcamento', confirmation_text: null, sort_order: 2, is_active: true },
  { step: 'mes', ..., sort_order: 3 },
  { step: 'dia', ..., sort_order: 4 },
  { step: 'convidados', ..., sort_order: 5 },
];
```

**Mudanca 2** -- Na funcao `fetchBotQuestions`, apos detectar que nao existem perguntas salvas, inserir automaticamente os defaults:
```typescript
if (!data || data.length === 0) {
  // Auto-inserir perguntas padrao
  const inserts = DEFAULT_QUESTIONS.map(q => ({
    instance_id: selectedInstanceId,
    ...q
  }));
  await supabase.from('wapi_bot_questions').insert(inserts);
  // Recarregar
}
```

### Migracao SQL (dados do Planeta Divertido)

```sql
-- Atualizar welcome_message
UPDATE wapi_bot_settings
SET welcome_message = 'Ola! Bem-vindo ao Planeta Divertido! ...'
WHERE instance_id IN (
  SELECT id FROM wapi_instances
  WHERE company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'
);

-- Inserir passo 'tipo' faltante
-- Reordenar passos existentes
```

## Resultado Esperado

- Toda empresa nova ja tera as 5 perguntas padrao **editaveis pela interface**
- O buffet pode alterar textos, desativar passos e reordenar sem precisar de programacao
- O Planeta Divertido tera o fluxo identico ao Castelo da Diversao imediatamente

