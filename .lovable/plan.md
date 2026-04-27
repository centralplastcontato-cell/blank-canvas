## Objetivo

Na LP do **Espaço Carrossel** (`espacocarrossel.online`), separar fotos e vídeos em duas seções dentro da MESMA página, com abas: **Espaço Interno** e **Espaço Externo**. O CTA do WhatsApp continua o mesmo número, mas a mensagem inicial muda conforme a aba ativa quando o cliente abre o chat.

## Como vai ficar (visual)

```text
[ Hero ]
[ Benefícios ]

== Galeria ==
( 🏛️ Espaço Interno )  ( 🌳 Espaço Externo )   <- abas
[ grid de fotos da aba selecionada ]

== Vídeos ==
( 🏛️ Espaço Interno )  ( 🌳 Espaço Externo )   <- abas
[ vídeo da aba selecionada ]

[ Depoimentos / Oferta / Footer ]
[ Botão flutuante WhatsApp ]
```

Quando o usuário clica no CTA dentro da seção (ou no botão flutuante após navegar pelas abas), a mensagem inicial do chatbot já entra com o interesse: *"Olá! Tenho interesse no Espaço Interno do Carrossel..."* (ou Externo).

## O que vou fazer

1. **Reaproveitar a estrutura `units` que já existe** nos componentes `DLPGallery` e `DLPVideo` — eles já suportam abas. Vou cadastrar no banco da LP do Carrossel duas "unidades virtuais" chamadas `Espaço Interno` e `Espaço Externo`, cada uma com suas próprias fotos e vídeo. Não é uma unidade real do buffet, é só o agrupador visual da LP.

2. **Carregar os arquivos que você vai me enviar** para o storage e popular as duas abas (fotos + vídeo de cada espaço).

3. **Mensagem de WhatsApp diferenciada por aba**:
   - Adicionar um estado compartilhado na `DynamicLandingPage` que guarda o "espaço de interesse" (Interno/Externo) baseado na última aba que o usuário viu/clicou.
   - Passar esse contexto para o `LeadChatbot`, que vai injetar no template da mensagem de boas-vindas: *"Olá! Vim pelo site do Espaço Carrossel e tenho interesse no **Espaço Interno** 🏛️ ..."* (ou Externo 🌳).
   - O número de WhatsApp e o fluxo de perguntas (mês/convidados/nome) permanecem iguais.

4. **Sem impacto em outras LPs**: como a separação por abas usa o campo `units` da galeria/vídeo que já existe, nenhuma outra LP é afetada — quem não tiver `units` continua mostrando a galeria flat.

## Detalhes técnicos

- **Componentes**: `DLPGallery.tsx` e `DLPVideo.tsx` já normalizam `units[]` com nome + fotos/vídeo. Vou apenas:
  - Adicionar um callback `onActiveUnitChange(unitName)` em ambos para reportar a aba ativa pra `DynamicLandingPage`.
  - Passar esse nome para o `LeadChatbot` como prop `interestContext`.
- **Mensagem WhatsApp**: estender a montagem em `LeadChatbot.tsx` (linhas ~400) para incluir `🏛️ Interesse: {interestContext}` quando presente. Manter o `whatsapp_welcome_template` atual como fallback.
- **Dados**: rodar UPDATE na linha de `company_landing_pages` do Carrossel ajustando `gallery.units` e `video.videos` com as duas abas. Isso preserva tudo o mais (tema, hero, depoimentos).
- **Nomes das abas**: "Espaço Interno" e "Espaço Externo" (com ícones `Home` e `Trees` da lucide).

## O que preciso de você (para a próxima etapa)

Mande os arquivos separados em duas pastas/blocos:
- **Espaço Interno**: fotos (até 12) + 1 vídeo (YouTube ou upload)
- **Espaço Externo**: fotos (até 12) + 1 vídeo (YouTube ou upload)

Pode me mandar tudo de uma vez na próxima mensagem. Assim que aprovar este plano, eu já preparo a estrutura e te aviso quando puder enviar.