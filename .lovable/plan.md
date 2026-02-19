
## Padronizar o layout da pagina de Configuracoes

### Problema
A pagina de Configuracoes tem um layout diferente das paginas de Inteligencia e Operacoes. O conteudo comeca direto na lateral sem o mesmo padrao de header (icone + titulo + descricao) e sem o mesmo espacamento interno.

### O que muda

**Arquivo:** `src/pages/Configuracoes.tsx`

1. **Remover o `SidebarInset`** e usar o mesmo wrapper `div flex-1` que Inteligencia e Operacoes usam
2. **Adicionar header desktop padronizado** com icone de Settings dentro de container colorido, titulo "Configuracoes" em negrito e subtitulo descritivo — igual ao padrao das outras paginas
3. **Ajustar o padding do conteudo** para usar `p-3 md:p-5` consistente com as outras paginas
4. **Manter o header mobile** sem alteracoes, ja que o mobile esta funcionando corretamente

### Resultado esperado
A pagina de Configuracoes tera o mesmo visual e espacamento que Inteligencia e Operacoes: um header com icone arredondado, titulo grande e subtitulo, seguido do conteudo com padding uniforme.

### Detalhes tecnicos

Substituir o bloco desktop (linhas 166-206) para:
- Trocar `SidebarInset` por `div className="flex-1 flex flex-col overflow-hidden"`
- Remover o header atual que usa `SidebarTrigger` e avatar pill
- Adicionar header desktop no padrao: `hidden md:flex` com icone `Settings` em `bg-primary/10`, titulo `text-2xl font-bold` e subtitulo `text-sm text-muted-foreground`
- Manter `main` com padding `p-3 md:p-5`
