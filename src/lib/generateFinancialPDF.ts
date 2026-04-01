import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EnrichedPayment, Expense } from '@/hooks/useFinanceiroDashboard';

export type ReportType = 'despesas' | 'receitas' | 'resultado' | 'despesas_fixas' | 'despesas_variaveis' | 'despesas_festa' | 'despesas_baixadas' | 'receitas_a_receber' | 'receitas_atrasadas' | 'receitas_recebidas';

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
  paid: 'Pago', pending: 'Pendente', late: 'Atrasado', pago: 'Pago', pendente: 'Pendente',
};
const CATEGORY_LABELS: Record<string, string> = {
  fornecedor: 'Fornecedor', freela: 'Freela', compras: 'Compras',
  manutencao: 'Manutenção', aluguel: 'Aluguel', outros: 'Outros',
};
const TYPE_LABELS: Record<string, string> = {
  fixa: 'Fixa', variavel: 'Variável', festa: 'Festa', ajuste: 'Ajuste',
};

// Chart color palette
const CHART_COLORS: [number, number, number][] = [
  [59, 130, 246],   // blue
  [239, 68, 68],    // red
  [34, 197, 94],    // green
  [249, 115, 22],   // orange
  [139, 92, 246],   // purple
  [236, 72, 153],   // pink
  [20, 184, 166],   // teal
  [245, 158, 11],   // amber
  [99, 102, 241],   // indigo
  [107, 114, 128],  // gray
];

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
  items: T[], from: string, to: string, dateField: 'expense_date' | 'due_date' | 'paid_at'
): T[] {
  return items.filter(item => {
    const d = (item as any)[dateField];
    if (!d) return false;
    const date = d.slice(0, 10);
    return date >= from && date <= to;
  });
}

// ─── Chart Drawing Helpers ───────────────────────────────────────────────────

function drawPieChart(
  doc: jsPDF,
  cx: number, cy: number, radius: number,
  data: { label: string; value: number; color: [number, number, number] }[]
) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2; // start from top

  data.forEach(item => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sliceAngle;

    // Draw filled arc using small line segments
    doc.setFillColor(...item.color);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);

    const points: [number, number][] = [[cx, cy]];
    const steps = Math.max(20, Math.ceil(sliceAngle * 30));
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (sliceAngle * i) / steps;
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }

    // Draw as triangle fan
    for (let i = 1; i < points.length - 1; i++) {
      doc.triangle(
        points[0][0], points[0][1],
        points[i][0], points[i][1],
        points[i + 1][0], points[i + 1][1],
        'F'
      );
    }

    startAngle = endAngle;
  });

  // Draw white border lines between slices for separation
  startAngle = -Math.PI / 2;
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  data.forEach(item => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;
    doc.line(cx, cy, cx + radius * Math.cos(startAngle), cy + radius * Math.sin(startAngle));
    startAngle += sliceAngle;
  });

  // Legend
  const legendX = cx + radius + 8;
  let legendY = cy - (data.length * 5);
  if (legendY < cy - radius) legendY = cy - radius;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  data.forEach(item => {
    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
    doc.setFillColor(...item.color);
    doc.rect(legendX, legendY - 2.5, 3.5, 3.5, 'F');
    doc.setTextColor(40);
    doc.text(`${item.label} — ${pct}%`, legendX + 5.5, legendY);
    legendY += 6;
  });
  doc.setTextColor(0);
}

function drawBarChart(
  doc: jsPDF,
  x: number, y: number, width: number, height: number,
  bars: { label: string; value: number; color: [number, number, number] }[]
) {
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const barCount = bars.length;
  const gap = 6;
  const barWidth = Math.min(30, (width - gap * (barCount + 1)) / barCount);
  const chartLeft = x + (width - (barWidth * barCount + gap * (barCount - 1))) / 2;

  // Y-axis baseline
  const baseY = y + height;
  const chartHeight = height - 10; // leave room for labels on top

  // Draw baseline
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.line(x, baseY, x + width, baseY);

  // Draw grid lines
  doc.setDrawColor(230);
  for (let i = 1; i <= 4; i++) {
    const gy = baseY - (chartHeight * i) / 4;
    doc.line(x, gy, x + width, gy);
  }

  bars.forEach((bar, i) => {
    const bx = chartLeft + i * (barWidth + gap);
    const barH = (bar.value / maxVal) * chartHeight;
    const by = baseY - barH;

    // Bar with rounded top effect
    doc.setFillColor(...bar.color);
    doc.roundedRect(bx, by, barWidth, barH, 1.5, 1.5, 'F');

    // Value on top
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text(fmt(bar.value), bx + barWidth / 2, by - 2, { align: 'center' });

    // Label below
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(bar.label, bx + barWidth / 2, baseY + 5, { align: 'center' });
  });

  doc.setTextColor(0);
}

// ─── Reports ─────────────────────────────────────────────────────────────────

function generateExpenseReport(doc: jsPDF, params: ReportParams, filterType?: string, titleSuffix?: string, filterStatus?: string) {
  const title = titleSuffix ? `Relatório de Despesas — ${titleSuffix}` : 'Relatório de Despesas';
  let y = addHeader(doc, params.companyName, title, params.periodLabel);

  let periodExpenses = filterByPeriod(params.expenses, params.from, params.to, 'expense_date');
  if (filterType) periodExpenses = periodExpenses.filter(e => e.expense_type === filterType);
  if (filterStatus) periodExpenses = periodExpenses.filter(e => e.status === filterStatus);
  const sorted = [...periodExpenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date));
  const total = sorted.reduce((s, e) => s + e.amount, 0);

  // Build category data for pie chart
  const byCategory = new Map<string, number>();
  sorted.forEach(e => {
    const cat = CATEGORY_LABELS[e.category] || e.category;
    byCategory.set(cat, (byCategory.get(cat) || 0) + e.amount);
  });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de despesas no período: ${fmt(total)}  (${sorted.length} registros)`, 14, y);
  y += 4;

  if (sorted.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhuma despesa encontrada no período selecionado.', 14, y + 4);
    return;
  }

  // Pie chart of categories
  if (byCategory.size > 1) {
    const pieData = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Despesas por Categoria', 14, y + 6);
    drawPieChart(doc, 55, y + 35, 22, pieData);
    y += 62;
  } else {
    y += 4;
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

function generateRevenueReport(doc: jsPDF, params: ReportParams, filterStatus?: 'pending' | 'late' | 'paid') {
  const titleMap: Record<string, string> = {
    pending: 'Relatório de Receitas — A Receber',
    late: 'Relatório de Receitas — Em Atraso',
    paid: 'Relatório de Receitas — Recebidas',
  };
  const title = filterStatus ? titleMap[filterStatus] : 'Relatório de Receitas';
  let y = addHeader(doc, params.companyName, title, params.periodLabel);

  const paid = params.payments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) >= params.from && p.paid_at.slice(0, 10) <= params.to);
  const pending = params.payments.filter(p => p.status === 'pending' && p.due_date >= params.from && p.due_date <= params.to);
  const late = params.payments.filter(p => p.status === 'late');

  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalLate = late.reduce((s, p) => s + p.amount, 0);

  // Bar chart: Recebido vs A receber vs Atrasado
  drawBarChart(doc, 14, y, 120, 45, [
    { label: 'Recebido', value: totalPaid, color: [34, 197, 94] },
    { label: 'A Receber', value: totalPending, color: [249, 115, 22] },
    { label: 'Em Atraso', value: totalLate, color: [239, 68, 68] },
  ]);

  y += 58;

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

  if (!filterStatus || filterStatus === 'late') renderSection(`Em Atraso (${late.length})`, late, [220, 50, 50]);
  if (!filterStatus || filterStatus === 'pending') renderSection(`A Receber (${pending.length})`, pending, [200, 150, 0]);
  if (!filterStatus || filterStatus === 'paid') renderSection(`Recebidos (${paid.length})`, paid, [50, 180, 80]);
}

function generateResultReport(doc: jsPDF, params: ReportParams) {
  let y = addHeader(doc, params.companyName, 'Relatório de Resultado', params.periodLabel);

  const paid = params.payments.filter(p => p.status === 'paid' && p.paid_at && p.paid_at.slice(0, 10) >= params.from && p.paid_at.slice(0, 10) <= params.to);
  const totalReceived = paid.reduce((s, p) => s + p.amount, 0);
  const periodExpenses = filterByPeriod(params.expenses, params.from, params.to, 'expense_date');
  const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalReceived - totalExpenses;

  // ── Bar chart: Receitas vs Despesas vs Saldo ──
  const pageWidth = doc.internal.pageSize.getWidth();

  drawBarChart(doc, 14, y, pageWidth / 2 - 20, 50, [
    { label: 'Receitas', value: totalReceived, color: [34, 197, 94] },
    { label: 'Despesas', value: totalExpenses, color: [239, 68, 68] },
    { label: 'Saldo', value: Math.abs(balance), color: balance >= 0 ? [59, 130, 246] : [249, 115, 22] },
  ]);

  // ── Pie chart: Despesas por categoria ──
  const byCategory = new Map<string, number>();
  periodExpenses.forEach(e => {
    const cat = CATEGORY_LABELS[e.category] || e.category;
    byCategory.set(cat, (byCategory.get(cat) || 0) + e.amount);
  });

  if (byCategory.size > 0) {
    const pieData = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Despesas por Categoria', pageWidth / 2 + 10, y);
    drawPieChart(doc, pageWidth / 2 + 40, y + 28, 22, pieData);
  }

  y += 60;

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
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    bodyStyles: { textColor: [0, 0, 0] },
    tableWidth: pageWidth / 2 - 20,
    margin: { left: 14 },
  });

  y = (doc as any).lastAutoTable?.finalY + 12 || y + 40;

  // Category table
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
          cat, fmt(val),
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

  // Revenue by type table
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
          type, fmt(val),
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
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  switch (params.type) {
    case 'despesas':
      generateExpenseReport(doc, params);
      break;
    case 'despesas_fixas':
      generateExpenseReport(doc, params, 'fixa', 'Fixas');
      break;
    case 'despesas_variaveis':
      generateExpenseReport(doc, params, 'variavel', 'Variáveis');
      break;
    case 'despesas_festa':
      generateExpenseReport(doc, params, 'festa', 'Festa');
      break;
    case 'despesas_baixadas':
      generateExpenseReport(doc, params, undefined, 'Baixadas', 'pago');
      break;
    case 'receitas':
      generateRevenueReport(doc, params);
      break;
    case 'receitas_a_receber':
      generateRevenueReport(doc, params, 'pending');
      break;
    case 'receitas_atrasadas':
      generateRevenueReport(doc, params, 'late');
      break;
    case 'receitas_recebidas':
      generateRevenueReport(doc, params, 'paid');
      break;
    case 'resultado':
      generateResultReport(doc, params);
      break;
  }

  const TYPE_FILE_LABELS: Record<string, string> = {
    despesas: 'Despesas', receitas: 'Receitas', resultado: 'Resultado',
    despesas_fixas: 'Despesas_Fixas', despesas_variaveis: 'Despesas_Variaveis', despesas_festa: 'Despesas_Festa', despesas_baixadas: 'Despesas_Baixadas',
    receitas_a_receber: 'Receitas_A_Receber', receitas_atrasadas: 'Receitas_Atrasadas', receitas_recebidas: 'Receitas_Recebidas',
  };
  const typeLabel = TYPE_FILE_LABELS[params.type] || 'Relatorio';
  doc.save(`Relatorio_${typeLabel}_${params.from}_a_${params.to}.pdf`);
}
