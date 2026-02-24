

# Popular lp_bot_settings do Planeta Divertido

## O que aconteceu

A tabela `lp_bot_settings` foi criada, o componente `LPBotSection` foi implementado, e o `LeadChatbot.tsx` ja le as configuracoes do banco. Porem, nenhum registro foi inserido na tabela. Sem dados, o chatbot usa os defaults hardcoded que nao incluem limite de convidados.

## Solucao

Criar uma migration SQL que insere o registro do Planeta Divertido na tabela `lp_bot_settings`.

## Detalhes Tecnicos

### Migration SQL

Inserir um registro vinculado ao `company_id` do Planeta Divertido (slug `planeta-divertido`) com:

- **welcome_message**: "Oi! Que bom te ver por aqui! Vou te fazer algumas perguntas rapidas para montar seu orcamento"
- **month_question**: "Para qual mes voce pretende realizar a festa?"
- **guest_question**: "Para quantas pessoas sera a festa?"
- **name_question**: "Digite seu nome:"
- **whatsapp_question**: "Digite seu WhatsApp:"
- **completion_message**: "Prontinho! Recebemos suas informacoes e nossa equipe vai entrar em contato em breve."
- **month_options**: `["Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]`
- **guest_options**: `["Ate 50 pessoas","51 a 70 pessoas","71 a 90 pessoas","Acima de 90 pessoas"]`
- **guest_limit**: `90`
- **guest_limit_message**: "Nossa capacidade maxima e de 90 convidados. Para melhor lhe atender, podemos direcionar seu contato para o Buffet Mega Magic, proximo de nos, para envio de orcamento sem compromisso. Deseja que a gente encaminhe?"
- **guest_limit_redirect_name**: "Buffet Mega Magic"

### SQL

```sql
INSERT INTO lp_bot_settings (
  company_id, welcome_message, month_question, guest_question,
  name_question, whatsapp_question, completion_message,
  month_options, guest_options,
  guest_limit, guest_limit_message, guest_limit_redirect_name
)
SELECT
  id,
  'Oi 👋 Que bom te ver por aqui!

Vou te fazer algumas perguntas rápidas para montar seu orçamento 😉',
  'Para qual mês você pretende realizar a festa?',
  'Para quantas pessoas será a festa?',
  'Digite seu nome:',
  'Digite seu WhatsApp:',
  'Prontinho 🎉

Recebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.

Acabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲',
  '["Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]'::jsonb,
  '["Até 50 pessoas","51 a 70 pessoas","71 a 90 pessoas","Acima de 90 pessoas"]'::jsonb,
  90,
  'Nossa capacidade máxima é de 90 convidados 😊

Para melhor lhe atender, podemos direcionar seu contato para o Buffet Mega Magic, próximo de nós, para envio de orçamento sem compromisso.

Deseja que a gente encaminhe?',
  'Buffet Mega Magic'
FROM companies
WHERE slug = 'planeta-divertido';
```

### Resultado esperado

Ao acessar `/lp/planeta-divertido` e selecionar "Acima de 90 pessoas", o chatbot exibira a mensagem de redirecionamento para o Buffet Mega Magic em vez de continuar para a coleta de nome.

### Nenhuma alteracao de codigo

Apenas dados no banco. O `DynamicLandingPage.tsx` ja busca `lp_bot_settings` e o `LeadChatbot.tsx` ja implementa a logica de `guest_limit`.
