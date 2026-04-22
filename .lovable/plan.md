

# Plano: Persistir Rascunho de Mensagem por Conversa

## Resumo
Quando o usuario sai da Central de Atendimento (para ver a Agenda, por exemplo) e volta, o texto que estava digitando desaparece. A solucao e salvar o rascunho automaticamente por conversa no `sessionStorage` do navegador.

## Como vai funcionar
- Ao digitar, o rascunho e salvo automaticamente (com debounce de 500ms) associado ao ID da conversa
- Ao trocar de conversa, o rascunho da conversa anterior e salvo e o da nova conversa e restaurado
- Ao navegar para outra pagina e voltar, os rascunhos continuam disponiveis (sessionStorage persiste na aba)
- Ao enviar a mensagem, o rascunho daquela conversa e apagado

## Alteracoes

### 1. Criar hook `useDraftMessages` (`src/hooks/useDraftMessages.ts`)
Hook simples que gerencia rascunhos no `sessionStorage`:
- `getDraft(conversationId)` — retorna o rascunho salvo
- `saveDraft(conversationId, text)` — salva (ou remove se vazio)
- `clearDraft(conversationId)` — remove o rascunho
- Chave de storage: `chat-draft:{conversationId}`

### 2. Modificar `WhatsAppChat.tsx`
- Importar e usar `useDraftMessages`
- Ao trocar de conversa (`selectedConversation` muda): salvar rascunho da conversa anterior e carregar o da nova
- No `setNewMessage` via input: salvar com debounce no sessionStorage
- No `handleSendMessage`: chamar `clearDraft` apos enviar com sucesso
- Manter compatibilidade com `initialDraft` (que tem prioridade sobre o rascunho salvo)

### Arquivos
- **Novo**: `src/hooks/useDraftMessages.ts`
- **Modificado**: `src/components/whatsapp/WhatsAppChat.tsx`

