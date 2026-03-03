

## Expandir/Recolher festas individualmente dentro da escala

Atualmente, quando a escala é expandida, **todas as festas** são mostradas abertas de uma vez. A ideia é que cada festa tenha seu próprio controle de expandir/recolher, permitindo ao usuário abrir uma por uma.

### Como será feito

**Arquivo**: `src/components/freelancer/ScheduleCard.tsx`

1. **Novo estado local** — Adicionar `expandedEvents: Set<string>` para rastrear quais festas estão abertas individualmente.

2. **Header clicável por festa** — O bloco de cada festa (data, nome, badge de disponíveis) vira um header clicável com ícone de chevron. Ao clicar, alterna aquela festa no `expandedEvents`.

3. **Conteúdo colapsável** — As seções abaixo do header da festa (observação, filtros de cargo, lista de freelancers) só aparecem quando o `eventId` está no `expandedEvents`.

4. **Expandir todas** — O header "Festas da escala" ganha um botão "Expandir todas / Recolher todas" para conveniência quando há muitas festas.

5. **Visual** — Cada festa mostra um resumo compacto quando recolhida (data, nome, contagem de disponíveis) e o conteúdo completo quando expandida, com uma transição suave via chevron.

### Resultado
- Com 1 festa: abre automaticamente expandida
- Com 2+ festas: todas começam recolhidas, usuário expande uma a uma ou usa "Expandir todas"

