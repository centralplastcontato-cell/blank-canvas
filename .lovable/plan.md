
# Remover botao de correcao por IA e ativar spellcheck nativo

## Resumo
Remover o botao de correcao de texto via IA (SpellCheck) do chat do WhatsApp e garantir que o spellcheck nativo do navegador esteja ativo nos campos de mensagem. Isso elimina o consumo de creditos de IA para essa funcionalidade.

---

## Alteracoes

### 1. `src/components/whatsapp/WhatsAppChat.tsx`

**Remover:**
- Import do icone `SpellCheck` (linha 21)
- Estado `isFixingText` (linha 217)
- Funcao `handleFixText` (linhas ~1691-1718)
- Botao de correcao desktop (linhas ~3599-3611)
- Botao de correcao mobile (linhas ~4205-4217)

**Adicionar:**
- Propriedade `spellCheck={true}` nos 2 Textareas principais de envio de mensagem (desktop linha ~3585 e mobile linha ~4191)

### 2. `src/components/ui/textarea.tsx`

Nenhuma alteracao necessaria - o componente Textarea ja aceita a prop `spellCheck` via `TextareaHTMLAttributes`.

---

## Resultado
- Zero consumo de creditos de IA para correcao de texto
- O navegador sublinha automaticamente palavras com erro ortografico
- Interface mais limpa com um botao a menos na area de digitacao
