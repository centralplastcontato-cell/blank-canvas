
# Limite de Convidados no Bot do WhatsApp (Planeta Divertido)

## Contexto
O Planeta Divertido precisa redirecionar leads com +90 convidados para o "Buffet Mega Magic". Essa logica ja funciona no chatbot da Landing Page (frontend), mas NAO existe no bot do WhatsApp (backend). Alem disso, a tela de Configuracoes/Automacoes nao tem campos para configurar esse limite.

## O que sera feito

### 1. Frontend: Campos de Limite na aba "Geral" (AutomationsSection)
Adicionar uma nova secao no card "Bot de Qualificacao" dentro da aba Geral, logo apos o delay de mensagens:

- **Toggle** "Limite de Convidados" (ativa/desativa)
- **Campo numerico**: Limite maximo (ex: 91)
- **Textarea**: Mensagem de redirecionamento (ex: "Nossa capacidade maxima e de 90 convidados...")
- **Input texto**: Nome do buffet parceiro (ex: "Buffet Mega Magic")

Os campos serao salvos com debounce em `wapi_bot_settings` (que ja possui as colunas `guest_limit`, `guest_limit_message`, `guest_limit_redirect_name`).

A interface `BotSettings` tambem precisa ser atualizada com esses 3 campos.

### 2. Backend: Logica no wapi-webhook
No `supabase/functions/wapi-webhook/index.ts`, apos o step "convidados" ser validado e antes de entrar no bloco `nextStepKey === 'complete'`:

- Carregar `guest_limit`, `guest_limit_message` e `guest_limit_redirect_name` do `wapi_bot_settings`
- Verificar se a opcao selecionada excede o limite (mesma logica semantica do frontend: detectar "acima", "mais de", "+ de", ou extrair o numero maximo)
- Se exceder:
  - Enviar a mensagem de redirecionamento configurada
  - Criar o lead com status "transferido" e observacao do redirecionamento
  - Marcar o bot como `complete_final` (desativar bot)
  - NAO enviar materiais nem pergunta de proximo passo
- Se nao exceder: seguir o fluxo normal

### 3. Dados: Configurar Planeta Divertido
Atualizar o registro `wapi_bot_settings` da instancia do Planeta Divertido (id: `de1ab5b0-b867-4004-8c48-8cdd0691ea9e`) com:
- `guest_limit`: 91
- `guest_limit_message`: "Nossa capacidade maxima e de 90 convidados. Para melhor lhe atender, podemos direcionar seu contato para o Buffet Mega Magic, proximo de nos, para envio de orcamento sem compromisso."
- `guest_limit_redirect_name`: "Buffet Mega Magic"

---

## Detalhes tecnicos

### Arquivos modificados
1. `src/components/whatsapp/settings/AutomationsSection.tsx`
   - Adicionar `guest_limit`, `guest_limit_message`, `guest_limit_redirect_name` na interface `BotSettings`
   - Adicionar secao de UI na aba "geral" com toggle + campos condicionais

2. `supabase/functions/wapi-webhook/index.ts`
   - Adicionar funcao `exceedsGuestLimit(guestOption, guestLimit)` que detecta semanticamente se excede
   - No bloco antes de `nextStepKey === 'complete'`, checar o limite e desviar o fluxo

3. Migration SQL para popular os dados do Planeta Divertido

### Fluxo no bot apos a mudanca

```text
Lead responde "convidados"
        |
   Valida opcao
        |
   Excede limite? ---- NAO ----> Fluxo normal (materiais + proximo passo)
        |
       SIM
        |
   Envia mensagem de redirecionamento
   Cria lead com status "transferido"
   Desativa bot (complete_final)
```
