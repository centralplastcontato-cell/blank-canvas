

## Corrigir envio de mensagem WhatsApp na aprovacao do freelancer

### Problemas identificados

Ao investigar o banco de dados, o Victor foi aprovado as 21:38 mas **a mensagem nunca foi enviada** -- tanto `whatsapp_sent_at` quanto `whatsapp_send_error` estao NULL. Os logs do edge function confirmam que nenhum `send-text` foi chamado nesse horario.

**Causa raiz**: A empresa tem 2 instancias WhatsApp conectadas (Manchester e Trujillo). Quando existem 2+, o sistema abre um dialogo para escolher a unidade. Porem:

1. Se o dialogo for fechado sem selecionar uma unidade, nenhum erro e registrado -- o sistema simplesmente "esquece" de enviar
2. Como nenhum erro e gravado, o indicador de status (check verde ou alerta vermelho) nao aparece
3. O botao "Reenviar" so aparece quando `whatsapp_send_error` tem valor, entao tambem fica invisivel
4. A mensagem nunca foi enviada ao edge function, por isso nao apareceu na Central de Atendimento nem chegou ao WhatsApp

### Solucao

#### 1. Registrar erro quando o dialogo de unidade e fechado sem selecionar

No `FreelancerResponseCards`, quando o `UnitSelectDialog` fecha (`onOpenChange(false)`) sem que uma unidade tenha sido selecionada, gravar `whatsapp_send_error = "Unidade nao selecionada"` na resposta pendente. Isso fara o indicador de erro e o botao "Reenviar" aparecerem automaticamente.

#### 2. Mostrar indicador "Nao enviado" para aprovados sem tentativa

Para freelancers com `approval_status = "aprovado"` mas com ambos `whatsapp_sent_at` e `whatsapp_send_error` como null, mostrar um icone cinza de "mensagem pendente" com tooltip "Mensagem nao enviada" e um botao "Enviar" ao lado. Isso cobre o caso de freelancers aprovados antes da feature existir.

#### 3. Passar `contactName` ao wapi-send

Adicionar `contactName: freelancerName` no body da chamada ao edge function tanto em `sendApprovalMessage` quanto em `sendPhotoRequest`. Isso garante que a conversa criada na Central de Atendimento tenha o nome correto do freelancer (em vez de apenas o numero de telefone).

#### 4. Garantir refresh apos envio via dialogo

Chamar `onDeleted?.()` (que recarrega a lista) apos o `handleUnitSelected` completar, para que o indicador de status apareca imediatamente no card.

### Secao tecnica

**Arquivo modificado:** `src/pages/FreelancerManager.tsx`

**Mudancas especificas:**

1. **`sendApprovalMessage` e `sendPhotoRequest`** (linhas ~498 e ~562): Adicionar `contactName: freelancerName` ou `contactName: name` no body do `supabase.functions.invoke("wapi-send", { body: { ... } })`.

2. **Fechamento do `UnitSelectDialog`** (~onOpenChange handler): Detectar quando o dialogo fecha sem selecao e gravar `whatsapp_send_error` no `freelancer_responses` correspondente.

3. **Indicadores no card** (linhas ~790-841): Adicionar uma terceira condicao: quando `approval_status === "aprovado"` e ambos campos WhatsApp sao null, renderizar um icone `MessageCircle` cinza com botao "Enviar" que chama `resolveInstanceAndSend`.

4. **`handleUnitSelected`** (linha ~637): Garantir que `onDeleted?.()` seja chamado apos sucesso para atualizar os indicadores.

