import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnrichedPayment, Expense } from '@/hooks/useFinanceiroDashboard';

export type ReportType = 'despesas' | 'receitas' | 'resultado';

interface ReportParams {
  type: ReportType;
  companyName: string;
  periodLabel: string;
  from: string;
  to: string;
  payments: EnrichedPayment[];
  expenses: Expense[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  late: 'Atrasado',
  pago: 'Pago',
  pendente: 'Pendente',
};

const CATEGORY_LABELS: Record<string, string> = {
  fornecedor: 'Fornecedor',
  freela: 'Freela',
  compras: 'Compras',
  manutencao: 'Manutenção',
  aluguel: 'Aluguel',
  outros: 'Outros',
};

const TYPE_LABELS: Record<string, string> = {
  fixa: 'Fixa',
  variavel: 'Variável',
  festa: 'Festa',
  ajuste: 'Ajuste',
};

function addHeader(doc: jsPDF, companyName: string, reportTitle: string, periodLabel: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 14, 20);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(reportTitle, 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Período: ${periodLabel}`, 14, 35);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 35, { align: 'right' });
  doc.setTextColor(0);

  doc.setDrawColor(200);
  doc.line(14, 38, pageWidth - 14, 38);

  return 44;
}

function filterByPeriod<T extends { expense_date?: string; due_date?: string; paid_at?: string | null }>(
  items: T[],
  from: string,
  to: string,
  dateField: 'expense_date' | 'due_date' | 'paid_at'
): T[] {
  return items.filter(item => {
    const d = (item as any)[dateField];
    if (!d) return false;
    const date = d.slice(0, 10);
    return date >= from && date <= to;
  });
}

function generateExpenseReport(doc: jsPDF, params: ReportParams) {
  let y = addHeader(doc, params.companyName, 'Relatório de Despesas', params.periodLabel);

  const periodExpenses = filterByPeriod(params.expenses, params.from, params.to, 'expense_date');
  const sorted = [...periodExpenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date));

  const total = sorted.reduce((s, e) => s + e.amount, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de despesas no período: ${fmt(total)}  (${sorted.length} registros)`, 14, y);
  y += 8;

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma despesa encontrada no período selecionado.', 14, y);
    return;
  }

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status']],
    body: sorted.map(e => [
      fmtDate(e.expense_date),
      e.description,
      CATEGORY_LABELS[e.category] || e.category,
      TYPE_LABELS[e.expense_type] || e.expense_type,
      fmt(e.amount),
      STATUS_LABELS[e.status] || e.status,
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    foot: [['', '', '', 'TOTAL', fmt(total), '']],
    footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
  });
}

function generateRevenueReport(doc: jsPDF, params: ReportParams) {
  let y = addHeader(doc, params.companyName, 'Relatório de Receitas', params.periodLabel);

  const paid = params.payments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) >= params.from && p.paid_at.slice(0, 10) <= params.to);
  const pending = params.payments.filter(p => p.status === 'pending' && p.due_date >= params.from && p.due_date <= params.to);
  const late = params.payments.filter(p => p.status === 'late');

  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalLate = late.reduce((s, p) => s + p.amount, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Recebido: ${fmt(totalPaid)}  |  A receber: ${fmt(totalPending)}  |  Em atraso: ${fmt(totalLate)}`, 14, y);
  y += 8;

  const renderSection = (title: string, items: EnrichedPayment[], statusColor: [number, number, number]) => {
    if (items.length === 0) return;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor);
    const currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y;
    doc.text(title, 14, currentY);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['Vencimento', 'Cliente', 'Evento', 'Tipo', 'Forma', 'Valor', 'Status']],
      body: items.map(p => [
        fmtDate(p.due_date),
        p.lead_name || '—',
        p.event_title || '—',
        p.type === 'entrada' ? 'Entrada' : 'Parcela',
        p.payment_method || '—',
        fmt(p.amount),
        STATUS_LABELS[p.status] || p.status,
      ]),
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      foot: [[`${items.length} registros`, '', '', '', 'TOTAL', fmt(items.reduce((s, p) => s + p.amount, 0)), '']],
      footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
    });

    y = (doc as any).lastAutoTable?.finalY || y;
  };

  renderSection(`Em Atraso (${late.length})`, late, [220, 50, 50]);
  renderSection(`A Receber (${pending.length})`, pending, [200, 150, 0]);
  renderSection(`Recebidos (${paid.length})`, paid, [50, 180, 80]);
}

function generateResultReport(doc: jsPDF, params: ReportParams) {
  let y = addHeader(doc, params.companyName, 'Relatório de Resultado', params.periodLabel);

  const paid = params.payments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) >= params.from && p.paid_at.slice(0, 10) <= params.to);
  const totalReceived = paid.reduce((s, p) => s + p.amount, 0);

  const periodExpenses = filterByPeriod(params.expenses, params.from, params.to, 'expense_date');
  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);

  const balance = totalReceived - totalExpenses;

  // Summary table
  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Total Recebido', fmt(totalReceived)],
      ['Total Despesas', fmt(totalExpenses)],
      ['Saldo do Período', fmt(balance)],
    ],
    styles: { fontSize: 11, cellPadding: 5 },
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', fontStyle: 'bold' },
    },
    bodyStyles: { textColor: [0, 0, 0] },
  });

  y = (doc as any).lastAutoTable?.finalY + 12 || y + 40;

  // Expense breakdown by category
  const byCategory = new Map<string, number>();
  periodExpenses.forEach(e => {
    const cat = CATEGORY_LABELS[e.category] || e.category;
    byCategory.set(cat, (byCategory.get(cat) || 0) + e.amount);
  });

  if (byCategory.size > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Despesas por Categoria', 14, y);

    autoTable(doc, {
      startY: y + 4,
      head: [['Categoria', 'Valor', '% do Total']],
      body: [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([cat, val]) => [
          cat,
          fmt(val),
          totalExpenses > 0 ? `${((val / totalExpenses) * 100).toFixed(1)}%` : '0%',
        ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      foot: [['TOTAL', fmt(totalExpenses), '100%']],
      footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
    });

    y = (doc as any).lastAutoTable?.finalY + 12 || y + 40;
  }

  // Revenue breakdown by type
  const byType = new Map<string, number>();
  paid.forEach(p => {
    const t = p.type === 'entrada' ? 'Entradas' : 'Parcelas';
    byType.set(t, (byType.get(t) || 0) + p.amount);
  });

  if (byType.size > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Receitas por Tipo', 14, y);

    autoTable(doc, {
      startY: y + 4,
      head: [['Tipo', 'Valor', '% do Total']],
      body: [...byType.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, val]) => [
          type,
          fmt(val),
          totalReceived > 0 ? `${((val / totalReceived) * 100).toFixed(1)}%` : '0%',
        ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      foot: [['TOTAL', fmt(totalReceived), '100%']],
      footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
    });
  }
}

export function generateFinancialPDF(params: ReportParams) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  switch (params.type) {
    case 'despesas':
      generateExpenseReport(doc, params);
      break;
    case 'receitas':
      generateRevenueReport(doc, params);
      break;
    case 'resultado':
      generateResultReport(doc, params);
      break;
  }

  const typeLabel = params.type === 'despesas' ? 'Despesas' : params.type === 'receitas' ? 'Receitas' : 'Resultado';
  doc.save(`Relatorio_${typeLabel}_${params.from}_a_${params.to}.pdf`);
}
