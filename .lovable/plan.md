

## Otimizar Templates de Mensagem para Mobile

### Problema
Na tela de Configuracoes > Conteudo > Templates, os cards de template ficam grandes demais no mobile. O nome e o texto da mensagem ocupam muito espaco, e os botoes de acao (switch, editar, excluir) ficam apertados ao lado.

### Mudancas

**Arquivo: `src/components/whatsapp/settings/MessagesSection.tsx`**

1. **Layout do card de template no mobile**: Mudar de layout horizontal (tudo numa linha) para layout empilhado no mobile:
   - Nome do template + badge "Inativo" no topo
   - Texto da mensagem truncado com `line-clamp-1` no mobile (em vez de `line-clamp-2`)
   - Botoes de acao (switch, editar, excluir) numa linha separada embaixo, alinhados a direita
   - No desktop (sm+), manter o layout atual lado a lado

2. **Reducao de padding e gaps no mobile**:
   - Card padding: `p-3` no mobile, `sm:p-4` no desktop
   - Remover o icone `GripVertical` no mobile (ocupa espaco sem funcionalidade real de drag)
   - Botoes de acao menores no mobile: `size="sm"` com `h-7 w-7`

3. **Titulo do card header mais compacto no mobile**:
   - Titulo "Templates de Resposta Rapida" reduzido para "Templates" no mobile via classe `hidden sm:inline` no texto complementar
   - Botao "Novo Template" compacto: apenas icone `+` no mobile, texto completo no desktop

4. **Card de variaveis disponiveis**: Grid de 3 colunas no mobile em vez de 2, com font menor (`text-xs`)

### Resultado esperado
Cards de template compactos no mobile com nome visivel, texto truncado em 1 linha, e acoes acessiveis numa segunda linha. Mantendo o layout completo no desktop.

