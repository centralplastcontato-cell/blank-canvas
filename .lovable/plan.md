

# Plano: Módulo de Relatórios Gerenciais (além do Financeiro)

## Visão Geral

Criar um sistema de relatórios gerenciais expandido, reutilizando a infraestrutura já existente (PDF via jsPDF + autoTable, Excel via XLSX), adicionando **3 novos tipos de relatório** acessíveis a partir de seus respectivos módulos.

---

## Novos Relatórios

### 1. Relatório de Agenda (Festas/Eventos)
- **Dados**: tabela `company_events` filtrada por período e unidade
- **Conteúdo**:
  - Resumo: total de festas, realizadas, canceladas, ocupação
  - Tabela: data, título, pacote, convidados, unidade, status, valor
  - Gráfico: distribuição por tipo de festa e por pacote
  - Faturamento agendado vs realizado
- **Acesso**: botão "Relatório" na página Agenda (`src/pages/Agenda.tsx`)

### 2. Relatório de Visitas
- **Dados**: tabela `lead_visits` filtrada por período e unidade
- **Conteúdo**:
  - Resumo: total de visitas, realizadas, não compareceu, taxa de comparecimento, fechou na visita
  - Tabela: data, lead, status, nível de interesse, canal de origem
  - Gráfico: visitas por status, por canal de origem ("Como nos conheceu")
  - Taxa de conversão (visita → fechamento)
- **Acesso**: botão "Relatório" na página Visitas (`src/pages/Visitas.tsx`)

### 3. Relatório Comercial (Leads/CRM)
- **Dados**: `campaign_leads`, `lead_visits`, `company_events`
- **Conteúdo**:
  - Resumo: novos leads, conversão, perdidos, tempo médio de resposta
  - Funil: quantidade por status (novo → em_contato → orçamento → negociação → fechado)
  - Gráfico: leads por canal de origem, por unidade
  - Evolução mensal de leads
- **Acesso**: botão "Relatório" na página Inteligência ou no CRM

---

## Implementação Técnica

### Arquivos novos
1. **`src/lib/generateAgendaPDF.ts`** — gerador PDF de agenda (segue padrão do `generateFinancialPDF.ts`: header, tabelas autoTable, mini-charts)
2. **`src/lib/generateVisitasPDF.ts`** — gerador PDF de visitas
3. **`src/lib/generateComercialPDF.ts`** — gerador PDF comercial/CRM
4. **`src/components/reports/ReportDialog.tsx`** — dialog reutilizável de seleção de relatório (tipo, período, unidade, formato PDF/Excel), similar ao `FinancialReportDialog` mas genérico

### Arquivos modificados
5. **`src/pages/Agenda.tsx`** — adicionar botão "Relatório" + importar dialog
6. **`src/pages/Visitas.tsx`** — adicionar botão "Relatório" + importar dialog
7. **`src/pages/Inteligencia.tsx`** — adicionar botão "Relatório Comercial"

### Padrão de cada PDF
- Header com nome da empresa + título do relatório + período
- Cards de resumo (KPIs principais)
- Tabela detalhada com autoTable
- Mini-gráficos de barras (distribuição por categoria)
- Footer com data de geração
- Opção de exportar Excel (mesmos dados em planilha)

### Dados necessários
Todos os dados já estão disponíveis via queries Supabase existentes nos hooks (`useCommercialReports`, `useFinanceiroDashboard`, etc.) — não precisa de novas tabelas ou migrações.

---

## Etapas de Implementação

1. Criar `ReportDialog.tsx` genérico (reutilizável entre módulos)
2. Criar `generateAgendaPDF.ts` + integrar na Agenda
3. Criar `generateVisitasPDF.ts` + integrar nas Visitas
4. Criar `generateComercialPDF.ts` + integrar na Inteligência
5. Adicionar suporte Excel para cada tipo

