
## Problema Identificado

O bot aceita qualquer texto como resposta para o nó de **nome** no Flow Builder, sem validar se o texto digitado é realmente um nome. Quando o usuário digita "QUERO UM ORÇAMENTO ?", o sistema salva isso como o nome do lead e usa nos templates seguintes, resultando em mensagens absurdas como *"QUERO UM ORÇAMENTO ?, você já é nosso cliente..."*.

### Causa Raiz

No fluxo legado (`processBotQualification`), a função `validateName()` valida e rejeita entradas inválidas. No **Flow Builder** (`processFlowBuilderMessage`), nós do tipo `question` sem opções **salvam qualquer texto imediatamente** (linha 684) sem nenhuma validação de conteúdo.

### Solução

Adicionar validação de nome no processamento de nós `question` do Flow Builder quando o `extract_field` for `nome` (ou variações como `name`, `nome_lead`). A validação deve:

1. Detectar se o nó coleta um campo de nome
2. Rejeitar entradas que são frases/pedidos (contêm palavras como "quero", "orçamento", "olá", "preço", etc.)
3. Rejeitar se contém símbolos não-nome (`?`, `!`, números)
4. Re-perguntar com mensagem amigável quando inválido (sem avançar o flow)

---

### Mudanças Técnicas

**Arquivo único:** `supabase/functions/wapi-webhook/index.ts`

**Onde:** No bloco `processFlowBuilderMessage`, logo após a linha que detecta o `extract_field` do nó (linha ~683), antes de salvar o dado.

**Lógica a inserir:**

```typescript
// Validação de nome para campos de nome no Flow Builder
if (currentNode.extract_field && 
    ['nome', 'name', 'nome_lead', 'contact_name'].includes(currentNode.extract_field)) {
  const nameValidation = validateName(content);
  if (!nameValidation.valid) {
    // Re-enviar a pergunta com mensagem de erro
    const retryMsg = nameValidation.error || 'Por favor, digite apenas seu nome:';
    const retryMsgId = await sendBotMessage(...);
    // Salvar mensagem no banco
    // NÃO avançar o estado — retornar sem salvar nem mudar o node
    return;
  }
  // Se válido, usar o nome capitalizado (não o texto cru)
  content = nameValidation.value!; // sobrescreve o content para salvar limpo
}
```

---

### Resultado

- "QUERO UM ORÇAMENTO ?" → bot responde "Hmm, não consegui entender seu nome 🤔 Por favor, digite apenas seu *nome*:"
- "João Silva" → aceito normalmente
- "meu nome é Ana" → extraído e capitalizado como "Ana"

Nenhuma mudança de banco de dados necessária. Deploy do edge function `wapi-webhook` após a edição.
