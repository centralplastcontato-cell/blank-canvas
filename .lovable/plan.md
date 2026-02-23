

## Adicionar botao "Carregar Templates Padrao" no estado vazio

### Problema
Quando um buffet novo (ex: Aventura Kids) acessa a secao de Templates, o auto-seeding pode falhar silenciosamente (erro de RLS, rede, etc.) e o usuario ve "Nenhum template criado" sem opcao de carregar os templates padrao. Ele so tem o botao "Criar Primeiro Template" que abre o dialog para criar UM template manualmente.

### Solucao

Alterar o estado vazio em `MessagesSection.tsx` para incluir:

1. Um botao principal **"Carregar Templates Padrao"** que chama `seedDefaultTemplates(currentCompanyId)` e popula todos os 5 templates de uma vez
2. Manter o botao secundario "Criar Primeiro Template" para quem quiser criar do zero
3. Adicionar estado `isSeeding` para mostrar loading no botao enquanto os templates sao criados
4. Mostrar toast de sucesso/erro apos a tentativa

### Arquivo alterado

**`src/components/whatsapp/settings/MessagesSection.tsx`**

- Adicionar estado `isSeeding`
- Criar funcao `handleSeedDefaults` que chama `seedDefaultTemplates`, atualiza o estado e mostra feedback
- No bloco de estado vazio (linhas 264-279), adicionar o botao "Carregar Templates Padrao" com icone e loading state, e rebaixar o "Criar Primeiro Template" para `variant="outline"`

### Detalhes tecnicos

O layout do estado vazio ficara:

```text
[icone MessageSquare]
Nenhum template criado
Crie templates para enviar mensagens rapidamente.

[ Carregar Templates Padrao ]   (botao primario, chama seedDefaultTemplates)
[ Criar do Zero ]               (botao outline, abre dialog)
```

Nenhuma alteracao de banco de dados e necessaria - a funcao `seedDefaultTemplates` ja existe e insere os 5 templates padrao com `company_id`.
