
Objetivo: corrigir definitivamente o placeholder `{{empresa}}` para aparecer como **Planeta Divertido** quando a resposta vier pelo fluxo de recuperação (`stuck_bot_recovery`), que foi exatamente o caminho usado na sua conversa.

Diagnóstico confirmado
- A mensagem que chegou com `{{empresa}}` literal foi enviada pelo **follow-up-check** (metadata `source: "stuck_bot_recovery"`), não pelo fluxo principal do `wapi-webhook`.
- No `follow-up-check`, o passo `welcome` monta a mensagem assim:
  - `welcomeMsg = settings.welcome_message + firstQuestion`
  - sem aplicar replace de variáveis no `welcome_message`.
- Além disso, o helper `recoveryReplaceVariables` hoje só substitui `{chave}` (chave simples), não `{{chave}}` (chave dupla).
- E o fluxo de recovery não injeta aliases de empresa (`empresa`, `buffet`, `nome_empresa`, `nome-empresa`) antes de renderizar templates.
- Resultado: quando recovery dispara, `{{empresa}}` permanece bruto.

Plano de implementação
1) Corrigir interpolação no `follow-up-check` (ponto principal)
- Arquivo: `supabase/functions/follow-up-check/index.ts`
- Ajustar `recoveryReplaceVariables` para:
  - suportar `{{key}}` e `{key}`;
  - aceitar espaços internos (`{{ empresa }}` também funcionar);
  - escapar chave no regex para evitar edge-cases.
- Isso padroniza comportamento com o webhook principal.

2) Injetar variáveis de empresa no recovery
- No `processStuckBotRecovery`, antes de compor mensagens:
  - buscar `companies.name` via `instance.company_id`;
  - adicionar ao mapa de variáveis:
    - `empresa`
    - `buffet`
    - `nome_empresa`
    - `nome-empresa`
- Assim qualquer template com esses placeholders renderiza corretamente no recovery.

3) Aplicar replace também no welcome do recovery
- No bloco `if (step === 'welcome')`, trocar construção de mensagem para:
  - renderizar `settings.welcome_message` com `recoveryReplaceVariables(...)`;
  - depois concatenar primeira pergunta.
- Isso elimina o bug específico que você reportou.

4) Blindagem opcional para não duplicar pergunta inicial
- Se o `welcome_message` já contém a pergunta de nome, evitar anexar a pergunta padrão de novo.
- Implementação simples:
  - checar por marcador semântico (ex.: “qual é o seu nome”);
  - se já existir, não concatenar `firstQ.question`.
- Não bloqueia a correção principal, mas melhora UX imediata (na sua captura já apareceu duplicado).

5) Ajuste de consistência de configuração (DB)
- Estado atual encontrado: `wapi_bot_settings` da instância está com `company_id = null` e `bot_enabled = false`.
- Mesmo em modo teste funcionando, isso é inconsistente e pode gerar comportamento imprevisível.
- Aplicar update para:
  - `company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'`
  - `bot_enabled = true`
- Mantém o vínculo correto da configuração com Planeta Divertido.

Validação após implementação
- Teste principal (E2E):
  1. Enviar “Olá” do número de teste.
  2. Confirmar que a resposta vem com “Planeta Divertido” no lugar de `{{empresa}}`.
  3. Confirmar que a mensagem foi salva em `wapi_messages` sem placeholder.
- Teste recovery:
  1. Simular conversa “presa” para acionar `stuck_bot_recovery`.
  2. Confirmar que no recovery também substitui `{{empresa}}`.
- Verificação de banco:
  - `wapi_bot_settings` com `company_id` correto e `bot_enabled = true`.
- Verificação de logs:
  - sem placeholders brutos enviados.

Riscos e mitigação
- Risco: alterar regex e afetar variáveis antigas.
  - Mitigação: manter compatibilidade com `{chave}` e apenas expandir para `{{chave}}`.
- Risco: empresa não encontrada por algum dado legado.
  - Mitigação: fallback seguro para string vazia e log explícito.

Resultado esperado
- Em qualquer caminho (webhook normal ou recovery), a variável `{{empresa}}` passa a renderizar corretamente como **Planeta Divertido**.
- A resposta deixa de exibir placeholder bruto e o fluxo fica consistente entre funções.
