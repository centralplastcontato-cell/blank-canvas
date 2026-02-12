

# Correção de Texto no Chat do WhatsApp - 3 Funcionalidades

## Resumo

Implementar 3 recursos de correção de texto no chat WhatsApp da plataforma:

1. **Editar mensagem ja enviada** - Clicar numa mensagem enviada para corrigir o texto
2. **Correção antes de enviar** - Sugestões de correção enquanto digita
3. **Desfazer envio** - Cancelar mensagem logo após enviar para corrigir e reenviar

---

## 1. Editar Mensagem Ja Enviada

**Limitação importante:** A API do WhatsApp (W-API) que o sistema usa pode nao suportar edição de mensagens. Alem disso, o WhatsApp so permite edição dentro de 15 minutos apos envio.

**Abordagem realista:**
- Ao clicar/pressionar uma mensagem de texto enviada por mim (from_me), exibir um menu de contexto com a opção "Editar"
- So permitir para mensagens de texto com menos de 15 minutos
- Abrir um campo de edição inline no balão da mensagem
- Tentar chamar a W-API para editar a mensagem real no WhatsApp (se o endpoint existir: `PUT /message/edit`)
- Se a W-API nao suportar edição, a alternativa sera **apagar e reenviar** (delete + send-text)
- Atualizar o conteúdo no banco de dados (`wapi_messages`)

**Arquivos modificados:**
- `supabase/functions/wapi-send/index.ts` - Novo action `edit-text` (ou fallback `delete-and-resend`)
- `src/components/whatsapp/WhatsAppChat.tsx` - Menu de contexto nas mensagens + campo de edição inline

---

## 2. Correção Automatica Antes de Enviar

**Abordagem:** Botão de "correção rapida" no campo de texto que corrige ortografia e gramática usando uma edge function com IA.

- Adicionar um botão (icone de varinha/spell-check) ao lado do campo de texto
- Ao clicar, enviar o texto atual para uma edge function que usa a API de IA para corrigir
- Exibir o texto corrigido no campo, destacando as mudanças (ou simplesmente substituir)
- O usuario decide se envia ou reverte

**Arquivos modificados:**
- `supabase/functions/fix-text/index.ts` - Nova edge function que recebe texto e retorna corrigido
- `src/components/whatsapp/WhatsAppChat.tsx` - Botão de correção na area de input (desktop e mobile)

---

## 3. Desfazer Envio (Undo Send)

**Abordagem:** Toast com botão "Desfazer" que aparece por 5 segundos apos enviar. Se clicado, cancela o envio.

- Ao enviar mensagem, em vez de enviar imediatamente para a API, aguardar 5 segundos com a mensagem em estado "otimista"
- Mostrar toast/snackbar no rodape do chat: "Mensagem enviada - **Desfazer**"
- Se o usuario clicar em "Desfazer": remover a mensagem otimista, restaurar o texto no campo de input
- Se o timer acabar (5s): enviar de fato para a W-API
- O estado visual da mensagem mostra "pendente" (relogio) durante o periodo de espera

**Arquivos modificados:**
- `src/components/whatsapp/WhatsAppChat.tsx` - Refatorar `handleSendMessage` com timer de undo + toast

---

## Detalhes Tecnicos

### Edição de Mensagem - Estrutura do Menu de Contexto

Ao clicar numa mensagem propria (from_me, type texto, menos de 15min):
- Exibir dropdown com opcoes: "Editar", "Copiar"
- No modo edição, transformar o balão num Textarea editavel com botões Salvar/Cancelar
- Chamar `wapi-send` com action `edit-text` passando `messageId` e `newContent`

### Correção com IA - Edge Function

Nova edge function `fix-text`:
- Recebe `{ text: string, language: "pt-BR" }`
- Usa OpenAI/modelo de IA para corrigir ortografia e gramática
- Retorna `{ corrected: string, hasChanges: boolean }`
- Requer configuração de API key da OpenAI como secret

### Undo Send - Fluxo

```text
Usuario clica Enviar
  |
  v
Mensagem otimista adicionada (status: "pending")
Toast aparece: "Mensagem enviada [Desfazer]"
Timer de 5 segundos inicia
  |
  +--> Usuario clica "Desfazer"
  |      Remove mensagem otimista
  |      Restaura texto no input
  |      Cancela timer
  |
  +--> Timer expira (5s)
         Envia para W-API de fato
         Atualiza status para "sent"
```

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/whatsapp/WhatsAppChat.tsx` | Modificar - adicionar menu de contexto, edição inline, botão correção, undo send |
| `supabase/functions/wapi-send/index.ts` | Modificar - adicionar action `edit-text` |
| `supabase/functions/fix-text/index.ts` | Criar - edge function de correção com IA |

### Pré-requisito

- Para a funcionalidade 2 (correção com IA), sera necessario configurar uma API key de IA (OpenAI ou similar) como secret do projeto. Precisarei confirmar se ja existe uma configurada.

