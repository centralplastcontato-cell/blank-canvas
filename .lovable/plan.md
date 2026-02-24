
Objetivo: corrigir definitivamente a formatação dos números “azuis” (1️⃣ 2️⃣ 3️⃣) nas mensagens do WhatsApp e alinhar o que aparece em Configurações/Bot para evitar divergência.

1) Diagnóstico confirmado
- A mensagem do print (“Escolha a opção que mais te agrada… *1* / *2*”) não vem de `wapi_bot_questions`.
- Ela é montada no frontend em `src/components/landing/LeadChatbot.tsx` dentro de:
  - `sendWelcomeMessage(...)` (mensagem enviada via `wapi-send`)
  - `buildWhatsAppMessage()` (mensagem usada nos botões “falar direto no WhatsApp”)
- Hoje esses dois trechos estão hardcoded com `*1*` e `*2*`, por isso continua “sem número azul” mesmo após ajustes no Bot.
- Também há inconsistência em Configurações/Bot por unidade: no banco, `wapi_bot_settings.next_step_question` da unidade Trujillo ainda está com `*1*/*2*/*3*`, enquanto outras partes já usam emoji.

2) Implementação proposta (código)
- Arquivo: `src/components/landing/LeadChatbot.tsx`
- Ajustes:
  - Trocar no template “normal” (não redirecionado) de:
    - `*1* - 📩 ...`
    - `*2* - 💬 ...`
    para:
    - `1️⃣ - 📩 ...`
    - `2️⃣ - 💬 ...`
  - Aplicar a mesma troca em `buildWhatsAppMessage()`.
  - (Melhoria de manutenção) extrair o bloco de opções para uma constante única reutilizada pelos dois pontos, evitando regressão futura.

3) Implementação proposta (dados de configuração)
- Atualizar dados (sem migration estrutural) em `wapi_bot_settings.next_step_question` da unidade Trujillo para versão com emoji:
  - `1️⃣ - Agendar visita`
  - `2️⃣ - Tirar dúvidas`
  - `3️⃣ - Analisar com calma`
- Isso corrige o “acho que tem coisa errada em Configurações/Bot” e deixa as unidades consistentes.

4) Validação end-to-end
- Fluxo principal:
  - Abrir `/lp/castelo-da-diversao`
  - Preencher chatbot e enviar lead
  - Confirmar no WhatsApp recebido que aparece `1️⃣` e `2️⃣` (sem `*1*/*2*`)
- Fluxo de botão final:
  - Clicar no botão de WhatsApp após conclusão
  - Confirmar texto pré-preenchido também com `1️⃣` e `2️⃣`
- Fluxo de automação:
  - Em conversa da Trujillo, validar que a pergunta “próximo passo” também está com `1️⃣ 2️⃣ 3️⃣`

5) Riscos e observações
- Dependendo do aparelho/versão do WhatsApp, o estilo visual do keycap pode variar levemente, mas continuará sendo emoji numérico.
- A correção é segura e pontual: não altera lógica de redirecionamento, só padroniza formatação e consistência entre frontend e configuração do bot.

6) Resultado esperado
- Mensagem inicial da LP chega com números bonitinhos (emoji) em todos os caminhos relevantes.
- Configurações/Bot e mensagem real enviada ficam alinhadas, eliminando a sensação de “mudou em um lugar e no outro não”.
