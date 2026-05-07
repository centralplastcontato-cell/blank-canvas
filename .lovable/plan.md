# Remover o "fundo azul gigante" das mensagens com imagem na Central de Atendimento

## O que está acontecendo hoje

Na Central de Atendimento, toda mensagem enviada por você (`from_me = true`) ganha um balão com fundo azul (`bg-primary`). Para mensagens de **texto** isso fica certinho — o balão acompanha o tamanho do texto. Mas para mensagens de **imagem com legenda** (caso da campanha "Dia das Mães"), acontece o seguinte:

- O balão é forçado a ter até 75% da largura do chat (porque a legenda é um texto longo que ocupa quase a linha toda).
- A imagem fica encostada à esquerda, com a legenda embaixo.
- O fundo azul preenche todo o espaço livre à direita da imagem, criando aquela "faixa azul gigante" que você quer eliminar.

No WhatsApp oficial, mensagens com mídia não têm esse bloco azul ao redor — a imagem aparece "solta", e só a legenda recebe um leve contraste.

## Plano

Ajustar apenas a aparência das mensagens de mídia (imagem e vídeo) enviadas por você, para deixar igual ao WhatsApp:

1. Em `src/components/whatsapp/WhatsAppChat.tsx`, no bloco que renderiza o balão da mensagem (por volta da linha 5148):
   - Quando o tipo for `image` ou `video`, **não aplicar mais** `bg-primary` no balão (deixar fundo transparente).
   - A imagem aparece sem moldura azul ao redor.
   - Se houver legenda, ela recebe um pequeno fundo discreto só atrás do texto (para continuar legível), seguindo o padrão visual do WhatsApp.
2. Mensagens só de texto continuam com o balão azul atual — sem mudança.
3. Mensagens recebidas (do cliente) continuam exatamente como estão.
4. Áudio, documento e contato continuam como estão (já têm tratamento próprio).

## Onde mexe

- Apenas em `src/components/whatsapp/WhatsAppChat.tsx` (mudança visual no balão de mídia).
- Nenhuma alteração em lógica de envio, banco, campanhas ou WhatsApp.

## Resultado esperado

A imagem da campanha aparece "limpa" no chat, sem aquele retângulo azul vazio à direita — exatamente como o cliente vê no WhatsApp dele.
