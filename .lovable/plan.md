

## Tornar foto obrigatoria no cadastro de freelancer

### Problema atual
No arquivo `src/pages/PublicFreelancer.tsx`, linha 139, a validacao de avanco ignora completamente campos do tipo "photo":
```
if (q.type === "photo") continue; // photo is never blocking
```

Isso permite que o freelancer avance sem enviar foto, mesmo que o campo esteja marcado como `required`.

### Mudancas

**Arquivo: `src/pages/PublicFreelancer.tsx`**

1. Remover o `continue` que pula a validacao de foto na funcao `canAdvance` (linha 139)
2. Adicionar validacao: se o campo foto e obrigatorio e nao ha `photoFile` selecionado, bloquear o avanco
3. Alterar o comentario para refletir o novo comportamento

**Arquivo: `src/pages/FreelancerManager.tsx`**

1. No array `DEFAULT_QUESTIONS`, garantir que a pergunta de foto tenha `required: true` por padrao para novos templates

### Detalhes tecnicos

Na funcao `canAdvance()`, a linha:
```typescript
if (q.type === "photo") continue;
```
Sera substituida por:
```typescript
if (q.type === "photo" && q.required && !photoFile) return false;
```

Isso faz com que, se a pergunta de foto estiver marcada como obrigatoria no template, o usuario nao consiga avancar sem selecionar uma foto. Templates existentes que ja tem `required: true` na pergunta de foto passarao a exigir o envio.

