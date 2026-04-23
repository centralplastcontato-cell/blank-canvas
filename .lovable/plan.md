

## Objetivo
Refazer a visualização das respostas do **Cardápio** para ficar **idêntica** à do **Pré-Festa**: cards em grid 3 colunas com nome, data de envio, data da festa e contador de respostas, e ao clicar abrir um **Sheet lateral** com todas as respostas formatadas.

## Como está hoje (Cardápio)
- Lista vertical em formato "accordion": botão fino expande um card inline mostrando as respostas.
- Sem foto/avatar, sem data da festa, sem contador de respostas, sem visual em grid.

## Como ficará (igual ao Pré-Festa)
Cards em grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) contendo:
- Avatar circular com ícone de usuário
- Nome do respondente
- 📅 Data e hora do envio
- 🎉 Data da festa (quando houver `event_id`)
- 📄 Contador "X respostas preenchidas"

Ao clicar no card → abre **Sheet lateral direito** com:
- Cabeçalho com nome, data de envio e data da festa
- Lista de seções (emoji + título) com as opções escolhidas
- Botão "Apagar resposta" (com confirmação) — adicionando também a função de delete que hoje não existe no Cardápio

## Mudanças técnicas

**Arquivo único:** `src/pages/Cardapio.tsx`

1. **Refatorar `CardapioResponseCards`**: substituir o accordion por estrutura de cards em grid + Sheet lateral, espelhando o componente `PreFestaResponseCards`. Manter a lógica específica de Cardápio (mapear `a.sectionId` → seção com emoji e título; renderizar `a.selected` que pode ser array).

2. **Ajustar `toggleResponses`** (linhas 232–244): incluir join com `company_events` para trazer a data da festa:
   ```ts
   .select("*, company_events(event_date)")
   ```

3. **Adicionar handler `handleDeleteResponse(id)`**: nova função que remove um único registro de `cardapio_responses` por id e recarrega a lista (passada como prop `onDelete` ao componente).

4. **Imports a adicionar**: `Sheet, SheetContent, SheetHeader, SheetTitle` (já existe no PreFesta), `PartyPopper`, `FileText`, `Trash2`, `Loader2`, `AlertDialog*`.

## Fora de escopo
- Layout da listagem de templates (cards "Cardápio Festa Premium" etc.) permanece como está — a alteração é somente na visualização das **respostas** após clicar em "Respostas (N)".
- Nenhuma mudança em rotas, RLS ou edge functions.

