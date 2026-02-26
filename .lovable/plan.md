

## Reordenação de Perguntas do Bot por Arraste (Drag & Drop)

### Contexto
Um cliente pediu para trocar a ordem das perguntas do bot (primeiro "Tipo", depois "Nome"). Hoje o sistema ja suporta ordens diferentes via `sort_order`, mas a interface nao permite reordenar. Vamos adicionar essa funcionalidade para todos os clientes.

### O que muda para o usuario
Na aba **Perguntas** das Automacoes, cada pergunta tera uma alca de arraste (icone de "grip") ao lado do numero. O usuario podera arrastar e soltar para mudar a ordem. Ao salvar, o `sort_order` sera atualizado no banco.

### Plano Tecnico

**1. Adicionar drag-and-drop na lista de perguntas (AutomationsSection.tsx)**

- Importar componentes do `@dnd-kit` (ja instalado no projeto -- usado no FlowNodeEditor)
- Envolver o `Accordion` de perguntas com `DndContext` + `SortableContext`
- Cada `AccordionItem` sera envolvido por um wrapper sortavel (`useSortable`)
- Adicionar icone `GripVertical` como alca de arraste em cada pergunta
- No `handleDragEnd`, reordenar o array `botQuestions` localmente e atualizar os `sort_order`
- O botao "Salvar" ja existente persistira a nova ordem no banco

**2. Atualizar funcao `saveQuestions` para incluir sort_order**

- Garantir que ao salvar, o `sort_order` de cada pergunta reflita a posicao atual no array reordenado

**3. Nenhuma alteracao no webhook necessaria**

- O `getBotQuestions` ja ordena por `sort_order` e constroi a cadeia dinamicamente
- As validacoes e handlers especiais (tipo "Ja sou cliente", "Trabalhe conosco") ja usam fallbacks como `updated.nome || contactName || contactPhone`, entao funciona independente da ordem

### Impacto
- Apenas o arquivo `src/components/whatsapp/settings/AutomationsSection.tsx` sera editado
- Zero risco para o webhook -- a logica ja e dinamica
- Cada empresa podera definir sua propria ordem de perguntas

