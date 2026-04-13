

## Problema identificado

O sidebar do Celebrei tem dois problemas principais comparado ao do Supabase:

1. **Lento**: A transição usa `duration-300` (300ms), enquanto o padrão Shadcn é `duration-200`. O hover-to-expand adiciona latência perceptível.
2. **Labels aparecendo quando fechado**: Na imagem 2, os nomes das funções aparecem como tooltips flutuantes persistentes quando o menu está colapsado. Isso acontece porque o `AdminSidebar` envolve cada item com `<Tooltip>` manualmente, além do mecanismo interno do `SidebarMenuButton`. O hover-to-expand conflita com os tooltips — ao passar o mouse, o sidebar abre ao invés de mostrar tooltip.

## Plano de melhoria

### 1. Remover hover-to-expand e simplificar interação
- Remover `onMouseEnter`/`onMouseLeave` do `<Sidebar>` — o menu colapsa/expande apenas por clique (pin/toggle), como o Supabase faz
- Remover os estados `isPinned`, `isLocked` e toda a lógica de lock/pin/hover que adiciona complexidade
- Adicionar um `SidebarTrigger` visível (ícone hamburger) no header do conteúdo principal para toggle simples

### 2. Usar tooltip nativo do SidebarMenuButton
- Remover os `<Tooltip>` manuais que envolvem cada `<SidebarMenuItem>`
- Passar a prop `tooltip={item.title}` diretamente no `<SidebarMenuButton>`, que já tem suporte nativo e só mostra quando `state === "collapsed"`

### 3. Acelerar a transição
- Reduzir `duration-300` para `duration-150` no sidebar para transição mais snappy
- Manter `ease-linear` que já é usado no componente base

### 4. Limpar UI do header do sidebar
- Remover botão de pin, botão de lock flutuante, e botão de quick-close
- Manter apenas logo + nome da empresa + nome do usuário no header
- O toggle fica no `SidebarTrigger` externo

### Arquivos alterados
- `src/components/admin/AdminSidebar.tsx` — simplificar drasticamente removendo hover/pin/lock, usar tooltip nativo
- Layout pai (onde o `AdminSidebar` é renderizado) — adicionar `SidebarTrigger` no header

