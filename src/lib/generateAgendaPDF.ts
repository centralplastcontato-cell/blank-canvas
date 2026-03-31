import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface EventData {
  id: string;
  title: string;
  event_date: string;
  event_type?: string | null;
  package_name?: string | null;
  guest_count?: number | null;
  unit?: string | null;
  status: string;
  total_value?: number | null;
  start_time?: string | null;
}

export interface AgendaReportParams {
  type: string;
  companyName: string;
  periodLabel: string;
  from: string;
  to: string;
  events: EventData[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => { if (!d) return '—'; const [y, m, day] = d.slice(0, 10).split('-'); return `${day}/${m}/${y}`; };

const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Confirmado', pendente: 'Pendente', cancelado: 'Cancelado', realizado: 'Realizado',
};

const CHART_COLORS: [number, number, number][] = [
  [59, 130, 246], [239, 68, 68], [34, 197, 94], [249, 115, 22],
  [139, 92, 246], [236, 72, 153], [20, 184, 166], [245, 158, 11],
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

function filterByPeriod(events: EventData[], from: string, to: string): EventData[] {
  return events.filter(e => e.event_date >= from && e.event_date <= to);
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
    const lbl = bar.label.length > 12 ? bar.label.slice(0, 11) + '…' : bar.label;
    doc.text(lbl, bx + bw / 2, baseY + 5, { align: 'center' });
  });
  doc.setTextColor(0);
}

export function generateAgendaPDF(params: AgendaReportParams) {
  const periodEvents = filterByPeriod(params.events, params.from, params.to);
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = addHeader(doc, params.companyName, 'Relatório de Agenda — Festas/Eventos', params.periodLabel);

  const total = periodEvents.length;
  const confirmados = periodEvents.filter(e => e.status === 'confirmado').length;
  const cancelados = periodEvents.filter(e => e.status === 'cancelado').length;
  const revenue = periodEvents.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (e.total_value || 0), 0);

  // KPI cards
  const kpis = [
    { label: 'Total Eventos', value: String(total) },
    { label: 'Confirmados', value: String(confirmados) },
    { label: 'Cancelados', value: String(cancelados) },
    { label: 'Faturamento', value: fmt(revenue) },
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
  const sorted = [...periodEvents].sort((a, b) => a.event_date.localeCompare(b.event_date));
  autoTable(doc, {
    startY: y,
    head: [['Data', 'Título', 'Tipo', 'Pacote', 'Convid.', 'Unidade', 'Status', 'Valor']],
    body: sorted.map(e => [
      fmtDate(e.event_date), e.title, e.event_type || '—', e.package_name || '—',
      e.guest_count != null ? String(e.guest_count) : '—', e.unit || '—',
      STATUS_LABELS[e.status] || e.status, e.total_value != null ? fmt(e.total_value) : '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Chart: by event type
  const byType = new Map<string, number>();
  periodEvents.filter(e => e.status !== 'cancelado').forEach(e => {
    const t = e.event_type || 'Outros';
    byType.set(t, (byType.get(t) || 0) + 1);
  });
  if (byType.size > 0) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Distribuição por Tipo de Festa', 14, y); y += 5;
    const bars = [...byType.entries()].slice(0, 8).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    drawBarChart(doc, 14, y, doc.internal.pageSize.getWidth() - 28, 45, bars);
    y += 55;
  }

  // Chart: by package
  const byPkg = new Map<string, number>();
  periodEvents.filter(e => e.status !== 'cancelado').forEach(e => {
    const p = e.package_name || 'Sem pacote';
    byPkg.set(p, (byPkg.get(p) || 0) + 1);
  });
  if (byPkg.size > 0) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Distribuição por Pacote', 14, y); y += 5;
    const bars = [...byPkg.entries()].slice(0, 8).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    drawBarChart(doc, 14, y, doc.internal.pageSize.getWidth() - 28, 45, bars);
  }

  doc.save(`relatorio-agenda-${params.from}-${params.to}.pdf`);
}

export function generateAgendaXLSX(params: AgendaReportParams) {
  const periodEvents = filterByPeriod(params.events, params.from, params.to).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const rows = periodEvents.map(e => ({
    Data: fmtDate(e.event_date),
    Título: e.title,
    Tipo: e.event_type || '—',
    Pacote: e.package_name || '—',
    Convidados: e.guest_count ?? '—',
    Unidade: e.unit || '—',
    Status: STATUS_LABELS[e.status] || e.status,
    'Valor (R$)': e.total_value ?? 0,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Eventos');

  // Summary sheet
  const total = periodEvents.length;
  const confirmados = periodEvents.filter(e => e.status === 'confirmado').length;
  const cancelados = periodEvents.filter(e => e.status === 'cancelado').length;
  const revenue = periodEvents.filter(e => e.status !== 'cancelado').reduce((s, e) => s + (e.total_value || 0), 0);
  const summaryRows = [
    { Métrica: 'Período', Valor: params.periodLabel },
    { Métrica: 'Total de Eventos', Valor: total },
    { Métrica: 'Confirmados', Valor: confirmados },
    { Métrica: 'Cancelados', Valor: cancelados },
    { Métrica: 'Faturamento Total', Valor: revenue },
  ];
  const ws2 = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumo');

  XLSX.writeFile(wb, `relatorio-agenda-${params.from}-${params.to}.xlsx`);
}
