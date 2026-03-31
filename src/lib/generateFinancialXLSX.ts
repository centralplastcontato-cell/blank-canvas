import * as XLSX from 'xlsx';
import type { EnrichedPayment, Expense } from '@/hooks/useFinanceiroDashboard';
import type { ReportType } from './generateFinancialPDF';

interface ReportParams {
  type: ReportType;
  companyName: string;
  periodLabel: string;
  from: string;
  to: string;
  payments: EnrichedPayment[];
  expenses: Expense[];
}

const CATEGORY_LABELS: Record<string, string> = {
  fornecedor: 'Fornecedor', freela: 'Freela', compras: 'Compras',
  manutencao: 'Manutenção', aluguel: 'Aluguel', outros: 'Outros',
};
const TYPE_LABELS: Record<string, string> = {
  fixa: 'Fixa', variavel: 'Variável', festa: 'Festa', ajuste: 'Ajuste',
};
const STATUS_LABELS: Record<string, string> = {
  paid: 'Pago', pending: 'Pendente', late: 'Atrasado', pago: 'Pago', pendente: 'Pendente',
};

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

function filterByPeriod<T extends Record<string, any>>(items: T[], from: string, to: string, field: string): T[] {
  return items.filter(item => {
    const d = item[field];
    if (!d) return false;
    return d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  });
}

function buildExpenseSheet(params: ReportParams): XLSX.WorkSheet {
  const periodExpenses = filterByPeriod(params.expenses, params.from, params.to, 'expense_date')
    .sort((a, b) => a.expense_date.localeCompare(b.expense_date));

  const rows = periodExpenses.map(e => ({
    Data: fmtDate(e.expense_date),
    Descrição: e.description,
    Categoria: CATEGORY_LABELS[e.category] || e.category,
    Tipo: TYPE_LABELS[e.expense_type] || e.expense_type,
    Valor: e.amount,
    Status: STATUS_LABELS[e.status] || e.status,
  }));

  const total = periodExpenses.reduce((s, e) => s + e.amount, 0);
  rows.push({ Data: '', Descrição: '', Categoria: '', Tipo: 'TOTAL', Valor: total, Status: '' });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
  return ws;
}

function buildRevenueSheet(params: ReportParams): XLSX.WorkSheet {
  const paid = params.payments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) >= params.from && p.paid_at.slice(0, 10) <= params.to);
  const pending = params.payments.filter(p => p.status === 'pending' && p.due_date >= params.from && p.due_date <= params.to);
  const late = params.payments.filter(p => p.status === 'late');

  const all = [...late, ...pending, ...paid];
  const rows = all.map(p => ({
    Vencimento: fmtDate(p.due_date),
    Cliente: p.lead_name || '—',
    Evento: p.event_title || '—',
    Tipo: p.type === 'entrada' ? 'Entrada' : 'Parcela',
    Forma: p.payment_method || '—',
    Valor: p.amount,
    Status: STATUS_LABELS[p.status] || p.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 12 }];
  return ws;
}

function buildResultSheets(params: ReportParams): { resumo: XLSX.WorkSheet; categorias: XLSX.WorkSheet } {
  const paid = params.payments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) >= params.from && p.paid_at.slice(0, 10) <= params.to);
  const totalReceived = paid.reduce((s, p) => s + p.amount, 0);
  const periodExpenses = filterByPeriod(params.expenses, params.from, params.to, 'expense_date');
  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);

  const resumo = XLSX.utils.aoa_to_sheet([
    ['Indicador', 'Valor'],
    ['Total Recebido', totalReceived],
    ['Total Despesas', totalExpenses],
    ['Saldo do Período', totalReceived - totalExpenses],
  ]);
  resumo['!cols'] = [{ wch: 20 }, { wch: 18 }];

  const byCategory = new Map<string, number>();
  periodExpenses.forEach(e => {
    const cat = CATEGORY_LABELS[e.category] || e.category;
    byCategory.set(cat, (byCategory.get(cat) || 0) + e.amount);
  });

  const catRows: any[][] = [['Categoria', 'Valor', '% do Total']];
  [...byCategory.entries()].sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => {
    catRows.push([cat, val, totalExpenses > 0 ? `${((val / totalExpenses) * 100).toFixed(1)}%` : '0%']);
  });
  catRows.push(['TOTAL', totalExpenses, '100%']);

  const categorias = XLSX.utils.aoa_to_sheet(catRows);
  categorias['!cols'] = [{ wch: 18 }, { wch: 15 }, { wch: 12 }];

  return { resumo, categorias };
}

export function generateFinancialXLSX(params: ReportParams) {
  const wb = XLSX.utils.book_new();

  switch (params.type) {
    case 'despesas':
      XLSX.utils.book_append_sheet(wb, buildExpenseSheet(params), 'Despesas');
      break;
    case 'receitas':
      XLSX.utils.book_append_sheet(wb, buildRevenueSheet(params), 'Receitas');
      break;
    case 'resultado': {
      const { resumo, categorias } = buildResultSheets(params);
      XLSX.utils.book_append_sheet(wb, resumo, 'Resumo');
      XLSX.utils.book_append_sheet(wb, categorias, 'Categorias');
      break;
    }
  }

  const typeLabel = params.type === 'despesas' ? 'Despesas' : params.type === 'receitas' ? 'Receitas' : 'Resultado';
  XLSX.writeFile(wb, `Relatorio_${typeLabel}_${params.from}_a_${params.to}.xlsx`);
}
