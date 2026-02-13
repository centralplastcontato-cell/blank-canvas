

## Compartilhamento de Contatos (vCard) no WhatsApp Chat

### Resumo
Adicionar a funcionalidade de enviar contatos (vCard) pelo chat, com um dialog para preencher nome e telefone do contato, e envio via W-API.

### O que muda para o usuario

1. No menu de anexos (icone de clipe), aparece uma nova opcao **"Contato"** com icone de pessoa
2. Ao clicar, abre um dialog simples com dois campos: **Nome** e **Telefone**
3. Ao confirmar, o contato e enviado como vCard para o destinatario
4. A mensagem aparece no chat como "[Contato] Nome - Telefone"

### Detalhes Tecnicos

#### 1. Edge Function `wapi-send` - novo case `send-contact`

Adicionar um novo case no switch de actions que:
- Recebe `contactName` e `contactPhone` no body
- Monta o vCard no formato padrao:
```text
BEGIN:VCARD
VERSION:3.0
FN:{contactName}
TEL;type=CELL;waid={phone}:+{phone}
END:VCARD
```
- Chama o endpoint W-API `POST /v1/message/send-contact?instanceId={id}` com o payload de contato
- Salva a mensagem no banco (`wapi_messages`) com `message_type: 'contact'` e conteudo `[Contato] Nome`
- Atualiza `last_message_content` na conversa

#### 2. Frontend `WhatsAppChat.tsx`

- Adicionar estado `showContactDialog` e campos `contactName` / `contactPhone`
- Adicionar funcao `handleSendContact` que:
  - Cria mensagem otimista (como os outros tipos)
  - Invoca `wapi-send` com action `send-contact`
  - Atualiza status da mensagem
- No menu de anexos (Paperclip dropdown), adicionar item **"Contato"** com icone `Users` - em ambos os layouts (desktop e mobile)
- Adicionar um `Dialog` com formulario simples (nome + telefone) e botao "Enviar"

#### 3. Renderizacao da mensagem

- No componente `MediaMessage` ou na renderizacao inline do chat, tratar `message_type === 'contact'` para exibir um card visual com icone de pessoa, nome e telefone

#### 4. Config TOML
Nenhuma alteracao necessaria - a funcao `wapi-send` ja existe.

#### 5. Banco de dados
Nenhuma migracao necessaria - o campo `message_type` em `wapi_messages` ja aceita texto livre e `content` armazena a informacao do contato.

### Arquivos modificados
- `supabase/functions/wapi-send/index.ts` - novo case `send-contact`
- `src/components/whatsapp/WhatsAppChat.tsx` - dialog, estado, funcao de envio, item no menu

