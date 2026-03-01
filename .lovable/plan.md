

# Manual PDF Celebrei -- eBook Visual Premium

## Objetivo

Criar um arquivo `src/lib/generateManualPDF.ts` que gera um PDF de ~30-40 paginas com design visual sofisticado, utilizando `jsPDF` + `jspdf-autotable` (ja instalados). Adicionar botoes de download nas paginas de Treinamento.

## Design Visual do PDF

O manual tera um design premium com elementos visuais que o `jsPDF` suporta nativamente:

```text
+------------------------------------------+
|  [Faixa roxa gradiente no topo]          |
|                                          |
|         CELEBREI                         |
|   Manual Completo da Plataforma          |
|                                          |
|      [Logo da empresa se houver]         |
|                                          |
|   Versao 1.0 - Marco 2026               |
|  [Faixa decorativa inferior]             |
+------------------------------------------+
```

### Elementos visuais por pagina

- **Capa**: fundo roxo (#7c3aed) com titulo em branco, nome da empresa, data, faixa decorativa
- **Sumario**: numeracao elegante com linhas pontilhadas ate o numero da pagina
- **Capitulos**: header com faixa colorida lateral (barra roxa de 4mm na esquerda), titulo grande, linha decorativa
- **Secoes**: subtitulos com icone unicode (circulo, seta, check) e cor de destaque
- **Caixas de dica**: retangulo com fundo roxo claro (#f3e8ff), borda roxa, icone de lampada (unicode), texto
- **Caixas de alerta**: retangulo com fundo amarelo claro, borda amarela
- **Listas**: bullets customizados com circulos roxos preenchidos
- **Tabelas**: usando `autoTable` com header roxo, linhas alternadas, bordas suaves
- **Rodape**: numero da pagina centralizado + "Celebrei - Manual da Plataforma" + linha fina roxa
- **Cabecalho**: linha fina roxa no topo de cada pagina (exceto capa)

### Paleta de cores

| Elemento | Cor (RGB) |
|----------|-----------|
| Primaria (roxo) | 124, 58, 237 |
| Primaria clara | 243, 232, 255 |
| Texto principal | 30, 30, 30 |
| Texto secundario | 100, 100, 100 |
| Fundo dica | 243, 232, 255 |
| Fundo alerta | 254, 249, 195 |
| Linha decorativa | 200, 200, 200 |

## Estrutura do Conteudo (14 capitulos)

1. Introducao -- O que e, como acessar, visao geral
2. Central de Atendimento (CRM) -- Kanban, filtros, metricas, exportar
3. WhatsApp -- Conexao, chat, midias, materiais, status
4. Automacoes e Bot -- Flow Builder, bots LP/festa, follow-ups
5. Inteligencia -- Resumo AI, prioridades, score, funil, temperatura
6. Agenda -- Calendario, eventos, checklists, resumo mensal
7. Operacoes (Controle de Festa) -- Hub da festa, checklist, equipe, manutencao
8. Formularios Publicos -- Avaliacao, pre-festa, contrato, cardapio
9. Freelancers -- Escalas, atribuicoes, avaliacoes, PDF
10. Landing Pages Dinamicas -- Editor, temas, publicar, chatbot
11. Configuracoes -- Dados empresa, WhatsApp, automacoes, notificacoes
12. Usuarios e Permissoes -- Papeis, permissoes granulares, por unidade
13. Multi-Unidades -- Criar unidades, cores, filtros, kanban separado
14. Treinamento -- Videoaulas, categorias, player

## Arquitetura Tecnica

### Novo arquivo: `src/lib/generateManualPDF.ts`

Funcoes internas do gerador:

- `addCoverPage(doc, companyName?, logoUrl?)` -- capa com fundo roxo, titulo branco, logo
- `addTableOfContents(doc, chapters)` -- sumario com linhas pontilhadas
- `addPageHeader(doc, pageNum)` -- linha roxa fina + texto discreto
- `addPageFooter(doc, pageNum, totalPages)` -- "Pagina X de Y" + nome
- `addChapterTitle(doc, num, title)` -- barra lateral roxa + titulo grande
- `addSectionTitle(doc, title)` -- subtitulo com icone unicode
- `addParagraph(doc, text, x, maxWidth)` -- texto com word-wrap automatico
- `addBulletList(doc, items)` -- bullets com circulos roxos
- `addTipBox(doc, text)` -- caixa roxa clara com icone lampada
- `addAlertBox(doc, text)` -- caixa amarela com icone atencao
- `checkPageBreak(doc, needed)` -- quebra de pagina automatica com header/footer
- `export async function generateManualPDF(companyName?, logoUrl?)` -- orquestra tudo

Tamanho estimado: ~1000-1400 linhas (conteudo textual + helpers visuais).

### Alteracao: `src/pages/Treinamento.tsx`

- Importar `Button` e `Download` icon
- Adicionar botao "Baixar Manual" no header ao lado do Select de categoria
- Ao clicar: chama `generateManualPDF()` com estado de loading

### Alteracao: `src/pages/HubTreinamento.tsx`

- Adicionar botao "Baixar Manual PDF" na barra de acoes ao lado de "Nova Aula"
- Mesma chamada `generateManualPDF()`

## Exemplo Visual de uma Pagina de Capitulo

```text
[linha roxa fina 0.5mm no topo]
                          Celebrei - Manual

+--+---------------------------------------+
|  |                                       |
|R | 2. Central de Atendimento             |
|O |                                       |
|X |    A Central de Atendimento e o       |
|O |    coracao do CRM da Celebrei...      |
|  |                                       |
|B |  > Visao Kanban vs Lista              |
|A |    O sistema oferece duas formas...   |
|R |                                       |
|R |  +----------------------------------+ |
|A |  | Dica: Use os filtros de unidade  | |
|  |  | para focar nos leads de cada     | |
|4 |  | filial separadamente.            | |
|m |  +----------------------------------+ |
|m |                                       |
|  |  * Filtrar por campanha               |
|  |  * Filtrar por status                 |
|  |  * Filtrar por responsavel            |
|  |  * Exportar para CSV                  |
|  |                                       |
+--+---------------------------------------+
              Pagina 5 de 38
       Celebrei - Manual da Plataforma
```

## O que NAO muda

- Nenhuma tabela nova no banco de dados
- Nenhuma Edge Function nova
- Nenhuma dependencia nova (jsPDF e jspdf-autotable ja instalados)
- Videoaulas existentes continuam funcionando normalmente
- Conteudo e 100% estatico (texto fixo em portugues), sem consultas ao banco

