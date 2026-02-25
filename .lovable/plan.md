
## Adicionar "Mensagem de conclusão" na aba Automações

O campo "Mensagem de conclusão (chat da LP)" existe na configuração do Bot LP mas nao existe na seção de Limite de Convidados da aba Automações. Vamos adicionar.

### O que sera feito

1. **Adicionar campo `redirect_completion_message` no tipo `BotSettings`** (`AutomationsSection.tsx`, linha ~74) -- incluir a propriedade no interface.

2. **Adicionar o campo de textarea na UI** (apos o campo "Nome do buffet parceiro", linha ~788) -- um novo campo "Mensagem de conclusão" com Textarea, onChange e onBlur com debounce, seguindo o mesmo padrao dos campos existentes.

3. **Incluir o campo no reset do switch** (linha ~742) -- ao desativar o limite, limpar tambem `redirect_completion_message: null`.

### Detalhes tecnicos

- O campo ja existe na tabela `wapi_bot_settings` do Supabase (usado pelo webhook com fallback para `lp_bot_settings`).
- O padrao de persistencia sera identico aos outros campos: `onChange` atualiza state local, `onBlur` chama `debouncedUpdateBotSettings`.
- Placeholder: "Ex: Prontinho! Seus dados foram encaminhados para o Buffet Mega Magic. Eles entrarao em contato em breve!"
