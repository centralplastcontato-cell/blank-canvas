import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface VisitData {
  id: string;
  data_visita: string;
  horario_visita?: string | null;
  status_visita: string;
  lead_name?: string;
  lead_phone?: string;
  unit?: string | null;
  interest_level?: string | null;
  como_conheceu?: string | null;
  observacoes?: string | null;
  visit_type?: string;
}

export interface VisitasReportParams {
  type: string;
  companyName: string;
  periodLabel: string;
  from: string;
  to: string;
  visits: VisitData[];
}

const fmtDate = (d: string) => { if (!d) return '—'; const [y, m, day] = d.slice(0, 10).split('-'); return `${day}/${m}/${y}`; };

const STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada', confirmada: 'Confirmada', realizada: 'Realizada',
  nao_compareceu: 'Não compareceu', remarcada: 'Remarcada', cancelada: 'Cancelada',
};

const INTEREST_LABELS: Record<string, string> = {
  muito_alto: 'Muito Alto', alto: 'Alto', medio: 'Médio', baixo: 'Baixo',
};

const CHART_COLORS: [number, number, number][] = [
  [59, 130, 246], [34, 197, 94], [16, 185, 129], [239, 68, 68],
  [249, 115, 22], [139, 92, 246], [236, 72, 153], [20, 184, 166],
];

function addHeader(doc: jsPDF, companyName: string, reportTitle: string, periodLabel: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text(companyName, 14, 20);
  doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.text(reportTitle, 14, 28);
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text(`Período: ${periodLabel}`, 14, 35);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pw - 14, 35, { align: 'right' });
  doc.setTextColor(0); doc.setDrawColor(200); doc.line(14, 38, pw - 14, 38);
  return 44;
}

function filterByPeriod(visits: VisitData[], from: string, to: string): VisitData[] {
  return visits.filter(v => v.data_visita >= from && v.data_visita <= to);
}

function drawBarChart(doc: jsPDF, x: number, y: number, w: number, h: number, bars: { label: string; value: number; color: [number, number, number] }[]) {
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const gap = 6; const bw = Math.min(30, (w - gap * (bars.length + 1)) / bars.length);
  const cl = x + (w - (bw * bars.length + gap * (bars.length - 1))) / 2;
  const baseY = y + h; const ch = h - 10;
  doc.setDrawColor(230); doc.setLineWidth(0.3);
  for (let i = 1; i <= 4; i++) doc.line(x, baseY - (ch * i) / 4, x + w, baseY - (ch * i) / 4);
  doc.setDrawColor(180); doc.line(x, baseY, x + w, baseY);
  bars.forEach((bar, i) => {
    const bx = cl + i * (bw + gap); const bh = (bar.value / maxVal) * ch; const by = baseY - bh;
    doc.setFillColor(...bar.color); doc.roundedRect(bx, by, bw, bh, 1.5, 1.5, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(40);
    doc.text(String(bar.value), bx + bw / 2, by - 2, { align: 'center' });
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80);
    const lbl = bar.label.length > 14 ? bar.label.slice(0, 13) + '…' : bar.label;
    doc.text(lbl, bx + bw / 2, baseY + 5, { align: 'center' });
  });
  doc.setTextColor(0);
}

export function generateVisitasPDF(params: VisitasReportParams) {
  const periodVisits = filterByPeriod(params.visits, params.from, params.to);
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = addHeader(doc, params.companyName, 'Relatório de Visitas', params.periodLabel);

  const total = periodVisits.length;
  const realizadas = periodVisits.filter(v => v.status_visita === 'realizada').length;
  const naoComp = periodVisits.filter(v => v.status_visita === 'nao_compareceu').length;
  const taxaComp = total > 0 ? ((realizadas / total) * 100).toFixed(1) : '0';

  // KPI cards
  const kpis = [
    { label: 'Total Visitas', value: String(total) },
    { label: 'Realizadas', value: String(realizadas) },
    { label: 'Não compareceu', value: String(naoComp) },
    { label: 'Taxa Comparec.', value: `${taxaComp}%` },
  ];
  const kw = (doc.internal.pageSize.getWidth() - 28 - 12) / 4;
  kpis.forEach((k, i) => {
    const kx = 14 + i * (kw + 4);
    doc.setFillColor(245, 247, 250); doc.roundedRect(kx, y, kw, 16, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); doc.text(k.label, kx + kw / 2, y + 5.5, { align: 'center' });
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30); doc.text(k.value, kx + kw / 2, y + 12.5, { align: 'center' });
  });
  y += 22;

  // Table
  const sorted = [...periodVisits].sort((a, b) => a.data_visita.localeCompare(b.data_visita));
  autoTable(doc, {
    startY: y,
    head: [['Data', 'Horário', 'Lead', 'Tipo', 'Status', 'Interesse', 'Canal', 'Unidade']],
    body: sorted.map(v => [
      fmtDate(v.data_visita), v.horario_visita || '—', v.lead_name || '—',
      (v.visit_type || 'visita') === 'retirada_entrega' ? 'Entrega' : 'Visita',
      STATUS_LABELS[v.status_visita] || v.status_visita,
      INTEREST_LABELS[v.interest_level || ''] || v.interest_level || '—',
      v.como_conheceu || '—', v.unit || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Chart: by status
  const byStatus = new Map<string, number>();
  periodVisits.forEach(v => {
    const s = STATUS_LABELS[v.status_visita] || v.status_visita;
    byStatus.set(s, (byStatus.get(s) || 0) + 1);
  });
  if (byStatus.size > 0) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Visitas por Status', 14, y); y += 5;
    const bars = [...byStatus.entries()].map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    drawBarChart(doc, 14, y, doc.internal.pageSize.getWidth() - 28, 45, bars);
    y += 55;
  }

  // Chart: by canal de origem ("como conheceu")
  const byCanal = new Map<string, number>();
  periodVisits.forEach(v => {
    const c = v.como_conheceu || 'Não informado';
    byCanal.set(c, (byCanal.get(c) || 0) + 1);
  });
  if (byCanal.size > 0) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Como nos Conheceram', 14, y); y += 5;
    const bars = [...byCanal.entries()].slice(0, 8).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    drawBarChart(doc, 14, y, doc.internal.pageSize.getWidth() - 28, 45, bars);
  }

  doc.save(`relatorio-visitas-${params.from}-${params.to}.pdf`);
}

export function generateVisitasXLSX(params: VisitasReportParams) {
  const periodVisits = filterByPeriod(params.visits, params.from, params.to).sort((a, b) => a.data_visita.localeCompare(b.data_visita));
  const rows = periodVisits.map(v => ({
    Data: fmtDate(v.data_visita),
    Horário: v.horario_visita || '—',
    Lead: v.lead_name || '—',
    Telefone: v.lead_phone || '—',
    Status: STATUS_LABELS[v.status_visita] || v.status_visita,
    'Nível de Interesse': INTEREST_LABELS[v.interest_level || ''] || v.interest_level || '—',
    'Como Conheceu': v.como_conheceu || '—',
    Unidade: v.unit || '—',
    Observações: v.observacoes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Visitas');

  const total = periodVisits.length;
  const realizadas = periodVisits.filter(v => v.status_visita === 'realizada').length;
  const naoComp = periodVisits.filter(v => v.status_visita === 'nao_compareceu').length;
  const summaryRows = [
    { Métrica: 'Período', Valor: params.periodLabel },
    { Métrica: 'Total de Visitas', Valor: total },
    { Métrica: 'Realizadas', Valor: realizadas },
    { Métrica: 'Não Compareceu', Valor: naoComp },
    { Métrica: 'Taxa de Comparecimento', Valor: total > 0 ? `${((realizadas / total) * 100).toFixed(1)}%` : '0%' },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

  XLSX.writeFile(wb, `relatorio-visitas-${params.from}-${params.to}.xlsx`);
}
