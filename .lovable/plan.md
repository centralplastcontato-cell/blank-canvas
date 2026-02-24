
# Bot LP Configuravel por Empresa

## O que sera feito

Criar um sistema onde cada empresa pode personalizar o chatbot da sua Landing Page (LP) de forma independente, sem afetar outras empresas. Toda a configuracao ficara acessivel em uma **nova aba "Bot LP"** dentro das Configuracoes.

## Como funciona hoje

O chatbot da LP e 100% hardcoded no codigo React. As opcoes de meses, convidados, mensagens de boas-vindas e conclusao estao fixas no arquivo `LeadChatbot.tsx`. Nao existe nenhuma tabela no banco de dados para configurar o bot da LP.

## O que muda

### 1. Nova tabela no banco: `lp_bot_settings`

Uma tabela que armazena toda a configuracao do bot da LP **por empresa**:

| Campo | Descricao | Exemplo (Planeta Divertido) |
|---|---|---|
| `company_id` | Empresa dona da config | UUID do Planeta |
| `welcome_message` | Mensagem de boas-vindas | "Oi! Bem-vindo ao Planeta Divertido..." |
| `month_options` | Meses disponiveis (JSON array) | ["Marco","Abril",...] |
| `guest_options` | Opcoes de convidados (JSON array) | ["Ate 50","51 a 70","71 a 90"] |
| `guest_limit` | Limite maximo de convidados | 90 |
| `guest_limit_message` | Mensagem quando excede o limite | "Nossa capacidade e de 90..." |
| `guest_limit_redirect_name` | Nome do buffet parceiro | "Buffet Mega Magic" |
| `completion_message` | Mensagem final apos captura | "Prontinho! Entraremos em contato..." |
| `month_question` | Texto da pergunta de mes | "Para qual mes voce pretende..." |
| `guest_question` | Texto da pergunta de convidados | "Para quantas pessoas sera a festa?" |
| `name_question` | Texto pedindo o nome | "Qual o seu nome?" |
| `whatsapp_question` | Texto pedindo o WhatsApp | "Qual seu WhatsApp?" |

**Empresas sem registro nesta tabela continuam usando o fluxo padrao hardcoded** -- ou seja, o Castelo da Diversao nao precisa de nenhuma configuracao e continua funcionando identico.

### 2. Nova aba "Bot LP" nas Configuracoes

Dentro da pagina de Configuracoes (`/configuracoes`), sera adicionada uma nova aba chamada **"Bot LP"** (ao lado de Perfil, WhatsApp e Festa). Nessa aba, o gestor podera editar:

- **Mensagem de boas-vindas** (textarea)
- **Opcoes de meses** (lista editavel)
- **Opcoes de convidados** (lista editavel)
- **Limite de convidados** (campo numerico, opcional)
- **Mensagem de redirecionamento** (textarea, aparece so quando limite e preenchido)
- **Nome do buffet parceiro** (campo texto, aparece so quando limite e preenchido)
- **Mensagens de cada etapa** (pergunta de mes, convidados, nome, whatsapp)
- **Mensagem de conclusao** (textarea)

### 3. Alteracao no LeadChatbot (frontend)

O componente `LeadChatbot.tsx` sera atualizado para:

1. Quando em modo dinamico (`companyId` presente), buscar `lp_bot_settings` no banco
2. Se encontrar configuracao, usar os textos e opcoes do banco
3. Se nao encontrar, manter o comportamento atual (hardcoded)
4. Ao receber a selecao de convidados, verificar contra `guest_limit`:
   - Se dentro do limite: fluxo normal
   - Se acima: mostrar `guest_limit_message` com opcoes "Sim" / "Nao"
   - Se "Sim": salvar lead com status `transferido` e observacao "Redirecionado para [Buffet Mega Magic]"
   - Se "Nao": continuar fluxo normal

### 4. Alteracao no bot do WhatsApp (wapi-webhook)

A mesma logica de limite sera aplicada no bot do WhatsApp:

1. No passo `convidados`, ler `guest_limit` de `wapi_bot_settings` (que ja existe)
2. Se ultrapassar: enviar mensagem de redirecionamento + aguardar resposta
3. Se aceitar: criar lead como `transferido`

### 5. DynamicLandingPage

A pagina `DynamicLandingPage.tsx` sera atualizada para buscar `lp_bot_settings` junto com os dados da LP e passar as configuracoes ao `LeadChatbot`.

## Fluxo do lead com limite

```text
Lead seleciona convidados
         |
   Existe guest_limit?
    /          \
  Nao           Sim
   |             |
Fluxo         Numero > limite?
normal        /          \
            Nao           Sim
             |             |
          Fluxo        Mensagem:
          normal       "Podemos direcionar
                        para Mega Magic?"
                        /          \
                      Sim          Nao
                       |            |
                    Lead com     Fluxo
                    status       normal
                    "transferido"
                    obs: "Mega Magic"
```

## Impacto nas outras empresas

**ZERO.** Empresas sem registro na tabela `lp_bot_settings` continuam com o fluxo hardcoded. A aba "Bot LP" simplesmente ficara com os valores padrao pre-preenchidos para quem quiser personalizar.

## Arquivos que serao criados/alterados

1. **Nova migration SQL** - Criar tabela `lp_bot_settings` + RLS policies + popular dados do Planeta Divertido
2. **Novo componente** `src/components/whatsapp/settings/LPBotSection.tsx` - Formulario de edicao do Bot LP
3. **`src/components/landing/LeadChatbot.tsx`** - Carregar config do banco + logica de limite
4. **`src/pages/DynamicLandingPage.tsx`** - Buscar `lp_bot_settings` e passar ao chatbot
5. **`src/pages/Configuracoes.tsx`** - Adicionar aba "Bot LP"
6. **`src/components/whatsapp/WhatsAppConfig.tsx`** - Adicionar secao Bot LP no menu
7. **`supabase/functions/wapi-webhook/index.ts`** - Adicionar campos `guest_limit` + logica de redirecionamento no bot WhatsApp
8. **Nova migration SQL** - Adicionar colunas `guest_limit`, `guest_limit_message`, `guest_limit_redirect_name` em `wapi_bot_settings`
