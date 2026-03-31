

## Plano: Geração de Relatórios Financeiros (PDF)

### Abordagem Arquitetural

A melhor abordagem é **centralizada dentro da página Financeiro**, com um botão "Gerar Relatório" que abre um dialog onde o usuário escolhe o tipo de relatório e o período. Isso evita fragmentação e mantém tudo no contexto financeiro.

Cada aba (Receitas, Despesas, Resultado) já tem os dados filtrados — o relatório vai usar esses mesmos dados para gerar o PDF.

### O que será construído

1. **Componente `FinancialReportDialog`** — Dialog com:
   - Seletor de tipo de relatório: Despesas, Receitas (a receber/recebidas), Resultado Geral
   - Seletor de período (reutilizando os mesmos presets do Financeiro)
   - Filtro opcional de unidade
   - Botão "Gerar PDF"

2. **Gerador de PDF `generateFinancialPDF.ts`** — usando `jsPDF` + `jspdf-autotable` (já no projeto), gera:
   - **Relatório de Despesas**: lista todas despesas do período com categoria, tipo, valor, status, comprovante
   - **Relatório de Receitas**: parcelas por cliente/evento com status (pago/pendente/atrasado)
   - **Relatório de Resultado**: resumo consolidado (receitas vs despesas, saldo, breakdown por categoria)
   - Cabeçalho com nome da empresa, período e data de geração
   - Totalizadores ao final de cada seção

3. **Botão na página Financeiro** — ícone de download/relatório no header, abre o dialog

### Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/lib/generateFinancialPDF.ts` | Criar — lógica de geração do PDF |
| `src/components/financial/FinancialReportDialog.tsx` | Criar — dialog de seleção |
| `src/pages/Financeiro.tsx` | Editar — adicionar botão que abre o dialog |

### Detalhes técnicos

- Reutiliza `jsPDF` e `jspdf-autotable` já instalados (usados em `SchedulePDFGenerator.ts`)
- Os dados vêm do hook `useFinanceiroDashboard` já existente, passados como props ao dialog
- O PDF é gerado client-side e baixado diretamente no dispositivo do usuário
- Formatação em pt-BR com moeda BRL

