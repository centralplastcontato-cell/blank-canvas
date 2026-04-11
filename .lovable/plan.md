

# Plano: Fundo estilizado na area de mensagens do chat

## O que sera feito

Adicionar um fundo decorativo na area de mensagens do WhatsApp dentro do app Celebrei, similar ao fundo do WhatsApp real - com uma cor suave e um pattern de icones/desenhos sutis (baloes, estrelas, emojis de festa, etc).

## Como

**Arquivo: `src/index.css`**
- Criar uma classe CSS `.whatsapp-chat-bg` com:
  - Cor de fundo suave (bege claro no light mode, cinza escuro no dark mode, similar ao WhatsApp)
  - Pattern SVG inline com desenhos sutis e repetitivos (baloes de mensagem, estrelas, coracoes, bolos, confetes) em opacidade baixa (~5-8%)
  - O pattern sera feito com `background-image` usando SVG data URI para nao precisar de arquivos externos

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**
- Nas duas `ScrollArea` de mensagens (desktop linha ~4546 e mobile linha ~5693), trocar `bg-muted/30` por `whatsapp-chat-bg`
- Sao apenas 2 linhas de mudanca

## Resultado esperado

A area de mensagens tera um visual mais bonito e acolhedor, com um fundo decorativo sutil que nao atrapalha a leitura das mensagens.

