

## Plan: Tornar a barra de tabs/unidades expansível no mobile

### O que será feito

Na Central de Atendimento mobile, a barra que contém as tabs (Chat/Leads) e o seletor de unidade (Manchester/Trujillo) será envolvida em um `Collapsible`, permitindo recolher e expandir com um toque — liberando mais espaço vertical para a lista de conversas.

### Implementação

**Arquivo**: `src/pages/CentralAtendimento.tsx`

1. Adicionar um estado `isTabBarCollapsed` (inicia expandido)
2. Envolver o bloco das tabs + seletor de unidade (linhas ~762-861) em um `Collapsible`
3. Adicionar um botão fino/discreto de toggle (chevron) abaixo da barra, que ao clicar recolhe ou expande
4. Quando recolhido:
   - As tabs e o seletor de unidade ficam ocultos
   - Um indicador compacto mostra a aba ativa (ex: "Chat · Manchester") + botão para expandir
5. Quando expandido: layout atual sem mudanças
6. A transição usa a animação nativa do `CollapsibleContent` (accordion-down/up)

### Detalhes técnicos

- O `Collapsible` já é usado no mesmo arquivo (métricas, filtros) — segue o mesmo padrão
- As `TabsContent` continuam fora do collapsible (só a barra de controles recolhe)
- O estado da tab ativa (`activeTab`) e da unidade (`selectedChatUnit`) continuam funcionando normalmente mesmo recolhido
- Desktop não é afetado (o collapsible só aparece no bloco mobile `if (isMobile)`)

