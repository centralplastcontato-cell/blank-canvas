
# Otimizar espaço vertical na aba de Leads para telas menores

## Problema
Em telas menores (como a do comercial), a aba de Leads mostra muitos elementos empilhados antes da tabela:
1. Header (titulo + botoes Chat/Leads + som + usuario)
2. Banners de alerta (transferencia, cliente, visita, perguntas)
3. Toggle Lista/CRM
4. 6 cards de metricas (Total, Hoje, Novos, Em Contato, Fechados, Perdidos)
5. Filtros (campanha, unidade, status, responsavel, etc.)
6. **Somente aqui comeca a tabela de leads**

Isso faz com que os leads praticamente nao aparecam na tela.

## Solucao proposta: Metricas e Filtros colapsaveis

A ideia e manter todas as informacoes acessiveis, mas esconde-las por padrao para maximizar o espaco dos leads.

### O que muda:

1. **Cards de metricas colapsaveis** -- Adicionar um botao "Metricas" que mostra/esconde os 6 cards. Por padrao ficam escondidos, e o usuario clica para ver quando precisar. Os numeros mais importantes (Total e Novos) podem aparecer inline no botao como badges para manter a visibilidade rapida.

2. **Filtros colapsaveis** -- Os filtros ja ocupam bastante espaco. Colocar tudo dentro de um botao "Filtros" que expande/colapsa. Quando houver filtros ativos, mostrar um badge com a quantidade de filtros aplicados.

3. **Toggle Lista/CRM movido para o header** -- Mover o toggle Lista/CRM para dentro do header, ao lado dos botoes Chat/Leads, eliminando uma linha inteira de espaco.

### Resultado visual:

```text
Antes (tela menor):                    Depois (tela menor):
+---------------------------+          +---------------------------+
| Header + Chat/Leads       |          | Header + Chat/Leads/CRM  |
+---------------------------+          +---------------------------+
| Banner Alerta             |          | Banner Alerta             |
+---------------------------+          +---------------------------+
| [Lista] [CRM]             |          | [Metricas v] [Filtros v]  |
+---------------------------+          +---------------------------+
| [Card][Card][Card]         |          |                           |
| [Card][Card][Card]         |          |  TABELA DE LEADS          |
+---------------------------+          |  (espaco maximizado)      |
| Filtros (campanha, etc.)   |          |                           |
+---------------------------+          |                           |
| Tabela de Leads (pouco     |          |                           |
| espaco visivel)            |          +---------------------------+
+---------------------------+
```

## Detalhes tecnicos

### 1. Mover toggle Lista/CRM para o header (CentralAtendimento.tsx)
- Quando `activeTab === "leads"`, mostrar os botoes Lista e CRM no header, ao lado dos botoes Chat/Leads
- Remover o bloco de toggle duplicado dentro do TabsContent de leads

### 2. Tornar MetricsCards colapsavel (CentralAtendimento.tsx)
- Adicionar estado `showMetrics` (default: `false`)
- Criar botao "Metricas" com badges inline mostrando Total e Novos
- Ao clicar, expande/colapsa os MetricsCards
- Usar componente Collapsible do Radix ja instalado

### 3. Tornar LeadsFilters colapsavel (CentralAtendimento.tsx)
- Adicionar estado `showFilters` (default: `false`)
- Criar botao "Filtros" com badge mostrando quantidade de filtros ativos
- Ao clicar, expande/colapsa os filtros

### 4. Layout compacto da toolbar
- Os botoes Metricas e Filtros ficam em uma unica linha horizontal compacta
- Economiza no minimo 150-200px de altura vertical

### Arquivos modificados:
- `src/pages/CentralAtendimento.tsx` -- Reorganizar layout, adicionar estados de colapso, mover toggle
