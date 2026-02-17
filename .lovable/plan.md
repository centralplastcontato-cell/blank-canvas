

# Pagina de Conferencia da Lista de Presenca

## Objetivo

Criar uma pagina publica somente leitura que exiba a lista de convidados de forma visual e apresentavel, para o anfitriao conferir. O botao "Copiar Lista" sera mantido, mas sera adicionado um botao **"Compartilhar Lista"** que abre essa nova pagina em outra aba. O link dessa pagina pode ser enviado via WhatsApp para o anfitriao.

## Nova rota

`/lista-presenca/:recordId/conferencia`

## Layout da pagina de conferencia

```text
+-----------------------------------+
|  [Logo]  Nome do Buffet           |
|  Festa: Aniversario do Joao       |
|  Data: 15/02/2026                 |
|  Total: 25 convidados             |
+-----------------------------------+
|  Estatisticas por faixa etaria    |
|  [0-4: 3] [5-10: 8] [11-16: 5]   |
|  [17-18: 2] [18+: 5] [S/I: 2]    |
+-----------------------------------+
|                                   |
|  #1  Victor  ·  8 anos            |
|      Tel: (15) 98112-1710         |
|      [x] Quer info                |
|  -------------------------------- |
|  #2  Ana  ·  32 anos              |
|      Tel: (15) 98100-7979         |
|      [x] Quer info                |
|  -------------------------------- |
|  #3  Lucas  ·  3 anos             |
|      Crianca desacompanhada       |
|      Resp: Maria (15) 99999-0000  |
|  -------------------------------- |
|  ...                              |
+-----------------------------------+
```

## Detalhes tecnicos

### 1. Novo arquivo: `src/pages/PublicAttendanceReview.tsx`

- Pagina somente leitura (sem formularios, sem botoes de editar/remover)
- Busca os dados da `attendance_entries` + company + event (mesmo fetch do PublicAttendance)
- Exibe logo, nome da empresa, titulo do evento, data
- Card de estatisticas por faixa etaria (mesmo calculo do useMemo existente)
- Lista de convidados em cards limpos e legíveis, numerados
- Botao "Copiar Lista" no topo (reutiliza a mesma logica de texto)
- Design mobile-first, clean, fundo claro

### 2. Rota no `src/App.tsx`

- Adicionar `<Route path="/lista-presenca/:recordId/conferencia" element={<PublicAttendanceReview />} />`

### 3. Botao na pagina original `PublicAttendance.tsx`

- Trocar ou complementar o botao "Copiar Lista" com um botao **"Ver Lista"** (icone `ExternalLink`)
- Ao clicar, abre `window.open(/lista-presenca/${recordId}/conferencia)` em nova aba
- Manter o botao "Copiar Lista" ao lado para quem preferir o texto

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/PublicAttendanceReview.tsx` | Criar (pagina de conferencia read-only) |
| `src/App.tsx` | Adicionar rota |
| `src/pages/PublicAttendance.tsx` | Adicionar botao "Ver Lista" |

