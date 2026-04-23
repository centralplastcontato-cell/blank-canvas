

## Respostas Pré-Festa: Cards maiores + Sheet lateral

### O que muda

1. **Cards de resposta maiores**: Cada resposta terá um card mais alto com mais informações visíveis (nome, data, quantidade de respostas preenchidas), em vez do botão fino atual.

2. **Detalhes abrem em Sheet lateral (padrão da plataforma)**: Ao clicar em um card de resposta, os detalhes abrem em um `Sheet` (painel lateral direito), seguindo o mesmo padrão usado em Leads, Visitas, Campanhas etc. O comportamento atual de expandir para baixo será removido.

### Detalhes técnicos

**Arquivo: `src/pages/PreFesta.tsx`**

- Refatorar `PreFestaResponseCards`:
  - Substituir o botão compacto por um `Card` com padding maior (`p-4`), exibindo nome em fonte maior, data formatada, e um contador de respostas preenchidas (ex: "12 respostas").
  - Remover a lógica de expandir inline (`isOpen`, conteúdo condicional abaixo do botão).
  - Ao clicar no card, abrir um `Sheet` lateral (`side="right"`) com os detalhes.

- Criar seção de Sheet dentro do componente:
  - Header com nome do respondente e data.
  - Lista de perguntas/respostas formatadas (mesmo conteúdo atual mas dentro do Sheet).
  - Botão "Apagar resposta" no rodapé do Sheet (mantendo o `AlertDialog` de confirmação).
  - Usar `SheetContent`, `SheetHeader`, `SheetTitle` dos componentes UI existentes.

