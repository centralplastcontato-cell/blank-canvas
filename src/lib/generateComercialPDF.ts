import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LeadData {
  id: string;
  name: string;
  whatsapp: string;
  status: string;
  unit?: string | null;
  created_at: string;
  month?: string | null;
  guests?: string | null;
}

interface EventData {
  id: string;
  lead_id?: string | null;
  data_fechamento_venda?: string | null;
  status: string;
  unit?: string | null;
  total_value?: number | null;
}

export interface ComercialReportParams {
  type: string;
  companyName: string;
  periodLabel: string;
  from: string;
  to: string;
  leads: LeadData[];
  events?: EventData[];
}

const fmtDate = (d: string) => { if (!d) return '—'; const [y, m, day] = d.slice(0, 10).split('-'); return `${day}/${m}/${y}`; };

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo', em_contato: 'Em Contato', orcamento_enviado: 'Orçamento Enviado',
  aguardando_resposta: 'Aguardando', negociacao: 'Negociação', fechado: 'Fechado',
  perdido: 'Perdido', sem_interesse: 'Sem Interesse',
};

const FUNNEL_ORDER = ['novo', 'em_contato', 'orcamento_enviado', 'aguardando_resposta', 'negociacao', 'fechado', 'perdido'];

const CHART_COLORS: [number, number, number][] = [
  [59, 130, 246], [249, 115, 22], [139, 92, 246], [245, 158, 11],
  [34, 197, 94], [16, 185, 129], [239, 68, 68], [236, 72, 153],
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

function filterByPeriod(leads: LeadData[], from: string, to: string): LeadData[] {
  return leads.filter(l => l.created_at.slice(0, 10) >= from && l.created_at.slice(0, 10) <= to);
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

function drawFunnel(doc: jsPDF, x: number, y: number, w: number, data: { label: string; value: number; color: [number, number, number] }[]) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const rowH = 12;
  data.forEach((item, i) => {
    const ry = y + i * (rowH + 2);
    const ratio = item.value / maxVal;
    const barW = Math.max(20, ratio * (w - 80));
    doc.setFillColor(...item.color);
    doc.roundedRect(x, ry, barW, rowH, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(255);
    if (barW > 30) doc.text(String(item.value), x + 5, ry + 8);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(50);
    doc.text(item.label, x + barW + 4, ry + 8);
  });
  doc.setTextColor(0);
}

export function generateComercialPDF(params: ComercialReportParams) {
  const periodLeads = filterByPeriod(params.leads, params.from, params.to);
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = addHeader(doc, params.companyName, 'Relatório Comercial — Leads/CRM', params.periodLabel);

  const novos = periodLeads.length;
  // Count "fechados" using events with data_fechamento_venda in the period
  const events = params.events || [];
  const fechadosNoPeriodo = events.filter(e => {
    const dt = e.data_fechamento_venda?.slice(0, 10);
    return dt && dt >= params.from && dt <= params.to && e.status !== 'cancelado';
  });
  const fechados = fechadosNoPeriodo.length;
  const perdidos = periodLeads.filter(l => l.status === 'perdido').length;
  const taxaConversao = novos > 0 ? ((fechados / novos) * 100).toFixed(1) : '0';
  const faturamentoFechado = fechadosNoPeriodo.reduce((sum, e) => sum + (e.total_value || 0), 0);

  // Build comprehensive lead set: created in period + leads linked to closings in period
  const closedLeadIds = new Set(fechadosNoPeriodo.map(e => e.lead_id).filter(Boolean));
  const periodLeadIds = new Set(periodLeads.map(l => l.id));
  const closedLeadsNotInPeriod = params.leads.filter(l => closedLeadIds.has(l.id) && !periodLeadIds.has(l.id));
  const allRelevantLeads = [...periodLeads, ...closedLeadsNotInPeriod];

  // KPI cards
  const fmtCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  const kpis = [
    { label: 'Novos Leads', value: String(novos) },
    { label: 'Fechados', value: String(fechados) },
    { label: 'Perdidos', value: String(perdidos) },
    { label: 'Tx. Conversão', value: `${taxaConversao}%` },
    { label: 'Faturamento', value: fmtCurrency(faturamentoFechado) },
  ];
  const kw = (doc.internal.pageSize.getWidth() - 28 - 16) / 5;
  kpis.forEach((k, i) => {
    const kx = 14 + i * (kw + 4);
    doc.setFillColor(245, 247, 250); doc.roundedRect(kx, y, kw, 16, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); doc.text(k.label, kx + kw / 2, y + 5.5, { align: 'center' });
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30); doc.text(k.value, kx + kw / 2, y + 12.5, { align: 'center' });
  });
  y += 22;

  // Funnel — all relevant leads (created in period + closed in period)
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Funil de Vendas (Leads do Período)', 14, y); y += 5;
  const funnelData = FUNNEL_ORDER
    .map((status, i) => ({ label: STATUS_LABELS[status] || status, value: allRelevantLeads.filter(l => l.status === status).length, color: CHART_COLORS[i % CHART_COLORS.length] }))
    .filter(d => d.value > 0);
  if (funnelData.length > 0) {
    drawFunnel(doc, 14, y, doc.internal.pageSize.getWidth() - 28, funnelData);
    y += funnelData.length * 14 + 10;
  } else {
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
    doc.text('Nenhum lead no período selecionado.', 14, y + 5);
    doc.setTextColor(0);
    y += 15;
  }

  // Table: all relevant leads
  if (y + 30 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
  const sorted = [...allRelevantLeads].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (sorted.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Nome', 'WhatsApp', 'Status', 'Unidade', 'Mês Int.', 'Convid.']],
      body: sorted.map(l => [
        fmtDate(l.created_at), l.name, l.whatsapp,
        STATUS_LABELS[l.status] || l.status, l.unit || '—',
        l.month || '—', l.guests || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Chart: by unit
  const byUnit = new Map<string, number>();
  allRelevantLeads.forEach(l => { const u = l.unit || 'Sem unidade'; byUnit.set(u, (byUnit.get(u) || 0) + 1); });
  if (byUnit.size > 1) {
    if (y + 60 > doc.internal.pageSize.getHeight() - 20) { doc.addPage(); y = 20; }
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Leads por Unidade', 14, y); y += 5;
    const bars = [...byUnit.entries()].map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
    drawBarChart(doc, 14, y, doc.internal.pageSize.getWidth() - 28, 45, bars);
  }

  doc.save(`relatorio-comercial-${params.from}-${params.to}.pdf`);
}

export function generateComercialXLSX(params: ComercialReportParams) {
  const periodLeads = filterByPeriod(params.leads, params.from, params.to);
  const events = params.events || [];
  const fechadosNoPeriodo = events.filter(e => {
    const dt = e.data_fechamento_venda?.slice(0, 10);
    return dt && dt >= params.from && dt <= params.to && e.status !== 'cancelado';
  });

  // Build comprehensive lead set
  const closedLeadIds = new Set(fechadosNoPeriodo.map(e => e.lead_id).filter(Boolean));
  const periodLeadIds = new Set(periodLeads.map(l => l.id));
  const closedLeadsNotInPeriod = params.leads.filter(l => closedLeadIds.has(l.id) && !periodLeadIds.has(l.id));
  const allRelevantLeads = [...periodLeads, ...closedLeadsNotInPeriod].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const rows = allRelevantLeads.map(l => ({
    Data: fmtDate(l.created_at),
    Nome: l.name,
    WhatsApp: l.whatsapp,
    Status: STATUS_LABELS[l.status] || l.status,
    Unidade: l.unit || '—',
    'Mês Interesse': l.month || '—',
    Convidados: l.guests || '—',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Funnel sheet
  const funnelRows = FUNNEL_ORDER.map(status => ({
    Etapa: STATUS_LABELS[status] || status,
    Quantidade: allRelevantLeads.filter(l => l.status === status).length,
  })).filter(r => r.Quantidade > 0);
  const ws2 = XLSX.utils.json_to_sheet(funnelRows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Funil');

  // Summary
  const novos = periodLeads.length;
  const events = params.events || [];
  const fechadosNoPeriodo = events.filter(e => {
    const dt = e.data_fechamento_venda?.slice(0, 10);
    return dt && dt >= params.from && dt <= params.to && e.status !== 'cancelado';
  });
  const fechados = fechadosNoPeriodo.length;
  const faturamento = fechadosNoPeriodo.reduce((sum, e) => sum + (e.total_value || 0), 0);
  const summaryRows = [
    { Métrica: 'Período', Valor: params.periodLabel },
    { Métrica: 'Novos Leads', Valor: novos },
    { Métrica: 'Fechados no Período', Valor: fechados },
    { Métrica: 'Perdidos', Valor: periodLeads.filter(l => l.status === 'perdido').length },
    { Métrica: 'Taxa de Conversão', Valor: novos > 0 ? `${((fechados / novos) * 100).toFixed(1)}%` : '0%' },
    { Métrica: 'Faturamento Fechado', Valor: faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
  ];
  const ws3 = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Resumo');

  XLSX.writeFile(wb, `relatorio-comercial-${params.from}-${params.to}.xlsx`);
}
