
## Menu de contexto nas mensagens do chat (estilo WhatsApp Business)

### O que sera feito
Adicionar um menu de acoes em cada mensagem do chat na Central de Atendimento, similar ao WhatsApp Business. Atualmente, o menu so aparece em mensagens editaveis (enviadas por voce, texto, menos de 15min). A proposta e expandir para **todas as mensagens** com opcoes relevantes.

### Acoes do menu

| Acao | Quando aparece | O que faz |
|------|---------------|-----------|
| **Copiar** | Mensagens de texto | Copia o conteudo para a area de transferencia |
| **Editar** | Mensagens enviadas por voce, texto, menos de 15min | Abre o campo de edicao inline (ja existe) |
| **Baixar** | Mensagens com midia (imagem, video, audio, documento) | Abre o link da midia em nova aba |
| **Apagar** | Mensagens enviadas por voce | Exclui a mensagem do banco de dados |

### Como vai funcionar
- O botao de contexto (icone de seta/chevron) aparecera ao passar o mouse sobre **qualquer mensagem** (hover), nao apenas as editaveis
- Ao clicar, abre um `DropdownMenu` com as opcoes aplicaveis para aquela mensagem
- As opcoes sao filtradas dinamicamente com base no tipo e origem da mensagem

### Detalhes tecnicos

**Arquivo modificado:** `src/components/whatsapp/WhatsAppChat.tsx`

1. **Expandir o menu de contexto** (linhas 3609-3640):
   - Remover a condicao `isMessageEditable(msg)` que limita o menu
   - Exibir o botao de contexto em **todas as mensagens** usando `ChevronDown` (ja importado)
   - Montar as opcoes do menu dinamicamente:
     - "Copiar" - se `msg.content` existe
     - "Editar" - se `isMessageEditable(msg)`
     - "Baixar" - se `msg.media_url` existe
     - Separador
     - "Apagar" - se `msg.from_me` (com confirmacao)

2. **Adicionar handler de exclusao de mensagem individual**:
   - Criar funcao `handleDeleteMessage(msgId)` que deleta de `wapi_messages` e remove do state local
   - Adicionar um `AlertDialog` simples para confirmar a exclusao

3. **Replicar as mesmas mudancas no bloco de renderizacao mobile** (linhas ~4200+), que tem uma copia do mesmo template de mensagem

O menu aparecera discretamente no hover, sem atrapalhar a leitura, e tera visual consistente com o DropdownMenu ja usado no chat.
