
## Menu de contexto nas mensagens do chat (estilo WhatsApp Business)

### Implementado ✅

| Ação | Quando aparece | O que faz |
|------|---------------|-----------|
| **Reagir** | Mensagens com message_id (enviadas via W-API) | Mostra 6 emojis rápidos (👍❤️😂😮😢🙏) e envia reação via W-API |
| **Copiar** | Mensagens de texto | Copia o conteúdo para a área de transferência |
| **Editar** | Mensagens enviadas por você, texto, menos de 15min | Abre o campo de edição inline |
| **Baixar** | Mensagens com mídia (imagem, vídeo, áudio, documento) | Abre o link da mídia em nova aba |
| **Fixar** | Todas as mensagens | Fixa/desafixa mensagem no topo do chat com banner clicável |
| **Apagar** | Mensagens enviadas por você | Exclui a mensagem do banco de dados |

### Detalhes técnicos
- Edge function `wapi-send` atualizada com ação `send-reaction` (PUT para W-API)
- Coluna `pinned_message_id` adicionada em `wapi_conversations` (FK para `wapi_messages`)
- Banner de mensagem fixada aparece no topo da área de mensagens (desktop)
- Scroll suave até a mensagem fixada ao clicar no banner
