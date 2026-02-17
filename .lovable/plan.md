

# Adicionar botao "Abrir Lista" no painel de Presenca

## O que sera feito

Adicionar um botao de "abrir/visualizar" ao lado do botao de compartilhar em cada card da lista de presenca no `AttendanceManager.tsx`. Ao clicar, abre o mesmo link publico (`/lista-presenca/:recordId`) em uma nova aba do navegador.

## Detalhes tecnicos

### Arquivo: `src/components/agenda/AttendanceManager.tsx`

- Importar o icone `ExternalLink` do `lucide-react`
- Adicionar um novo botao entre o `SendBotButton` e o botao de `Share2`
- O botao usara `window.open()` para abrir a URL publica em nova aba
- A URL sera construida da mesma forma que o compartilhamento: usando `custom_domain` se disponivel, senao `window.location.origin`

### Ordem dos botoes na barra de acoes

```text
[SendBot] [Abrir] [Compartilhar] [Editar] [Excluir]
```

O botao "Abrir" tera o icone `ExternalLink` e abrira `{baseUrl}/lista-presenca/{record.id}` em nova aba via `window.open(..., '_blank')`.

