

# Remover botão "Copiar para Área de Transferência" da Lista de Presença

## O que muda
Remover o botão com ícone de "Copy" (clipboard) dos cards da lista de presença no painel admin. Os botoes restantes ficam: Compartilhar link, Editar e Excluir.

## Detalhes Tecnicos

### Arquivo: `src/components/agenda/AttendanceManager.tsx`

1. **Remover import** do icone `Copy` do lucide-react
2. **Remover o botao** com icone `<Copy>` que chama `copyToClipboard(record)` dentro do header do card
3. **Remover a funcao** `copyToClipboard` inteira, que nao sera mais utilizada

Isso simplifica a interface e reduz de 4 para 3 botoes de acao por card, melhorando a experiencia no mobile.

