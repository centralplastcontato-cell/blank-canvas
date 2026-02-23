

# Numeros de telefone clicaveis no chat do WhatsApp

## Problema

Quando uma mensagem no chat contem um numero de telefone (ex: `15997151079`), ele aparece como texto simples. O usuario quer poder clicar no numero para iniciar uma conversa ou salvar o contato.

## Solucao

Criar uma funcao utilitaria `formatMessageContent` que detecta numeros de telefone e URLs dentro do texto das mensagens e os transforma em links clicaveis. Numeros de telefone abrem com `tel:` (para ligar/salvar) ou `https://wa.me/` (para abrir no WhatsApp).

## Detalhes tecnicos

### 1. Criar helper `formatMessageContent`

Novo arquivo: `src/lib/format-message.tsx`

- Recebe o texto da mensagem como string
- Usa regex para detectar:
  - Numeros de telefone brasileiros (8-13 digitos consecutivos, com ou sem DDI 55)
  - URLs (http/https)
- Retorna um array de `ReactNode` com textos normais e `<a>` clicaveis
- Links de telefone usam `href="https://wa.me/55XXXXXXXXXX"` com `target="_blank"` para abrir no WhatsApp
- Links de URL usam `href` com `target="_blank"`
- Estilizacao: underline + cor azul para destaque visual

Regex para telefones: `/\b(\d{10,13})\b/g` (captura sequencias de 10-13 digitos que representam telefones BR)

### 2. Aplicar nos renders de mensagem

No arquivo `src/components/whatsapp/WhatsAppChat.tsx`, substituir `{msg.content}` por `{formatMessageContent(msg.content)}` nos seguintes pontos:

| Local | Linha aprox. | Contexto |
|---|---|---|
| Mensagem de texto (desktop) | ~3734 | `<p className="whitespace-pre-wrap...">{msg.content}</p>` |
| Caption de midia (desktop) | ~3741 | `<p className="whitespace-pre-wrap...">{msg.content}</p>` |
| Mensagem de texto (mobile) | ~4633 | `<p className="whitespace-pre-wrap...">{msg.content}</p>` |
| Caption de midia (mobile) | Proximo ao 4633 | Similar ao desktop |

### 3. Comportamento esperado

- Numero `15997151079` no texto vira um link azul sublinhado
- Ao clicar, abre `https://wa.me/5515997151079` em nova aba
- URLs existentes (`https://...`) tambem ficam clicaveis
- Texto normal continua sem alteracao
- Funciona tanto no layout desktop quanto mobile

### Arquivos a criar/editar

| Arquivo | Acao |
|---|---|
| `src/lib/format-message.tsx` | Criar - funcao utilitaria |
| `src/components/whatsapp/WhatsAppChat.tsx` | Editar - usar a funcao nos 4 pontos de render |

