

## Problema

O container da página Inteligência usa `max-w-7xl mx-auto` (1280px máximo), o que deixa espaço vazio nas laterais em telas grandes. As 5 colunas ficam comprimidas dentro desse limite.

## Solução

Fazer a aba Follow-ups "escapar" do container `max-w-7xl` usando margens negativas, ocupando toda a largura disponível da área de conteúdo.

**Arquivo: `src/components/inteligencia/FollowUpsTab.tsx`**

- Envolver o grid em um wrapper com margens negativas para cancelar o `max-w-7xl` do parent:
  - Classes: `-mx-3 md:-mx-5 px-3 md:px-5` (corresponde ao padding do `PullToRefresh` parent)
  - Isso faz o grid de colunas ocupar 100% da largura da viewport (menos a sidebar), aproveitando o espaço verde que o usuário indicou

Essa é a única alteração necessária -- o grid `xl:grid-cols-5` já distribui as colunas uniformemente, só precisa de mais espaço horizontal.

