import { describe, expect, it } from "vitest";
import { buildCommercialReport, normalizeChannel, type ReportEvent, type ReportLead, type ReportVisit } from "../commercialReport";

// 09/10/2026 18:30 em Brasília
const NOW = new Date("2026-10-09T21:30:00Z");
const FROM = "2026-09-10";
const TO = "2026-10-09";

const lead = (status: string, unit = "VENDAS 3"): ReportLead => ({ status, unit, campaign_id: "ai-agent" });
const visit = (status_visita: string, data_visita: string, unit = "VENDAS 3", horario_visita: string | null = "15:00"): ReportVisit => ({
  lead_id: null, status_visita, data_visita, horario_visita, unit,
});
const event = (total_value: number | null, data_fechamento_venda: string | null, lead_id: string | null = null, created_date: string | null = null): ReportEvent => ({
  lead_id, total_value, data_fechamento_venda, created_date,
});

function report(over: Partial<Parameters<typeof buildCommercialReport>[0]> = {}) {
  return buildCommercialReport({
    leads: [], leadsReturned: 0, visits: [], events: [], eventLeadUnits: new Map(), from: FROM, to: TO, now: NOW, ...over,
  });
}

describe("festas e conversão", () => {
  it("conta festas pela data de venda no período, com ou sem valor", () => {
    const r = report({
      leads: [lead("novo"), lead("orcamento_enviado"), lead("fechado"), lead("perdido")],
      events: [
        event(8000, "2026-10-01"),
        event(null, "2026-09-15"),
        event(6000, "2026-09-01"), // antes do período
        event(5000, null, null, "2026-10-05"), // sem data de venda: vale o cadastro
      ],
    });
    expect(r.salesCount).toBe(3);
    expect(r.salesWithValue).toBe(2);
    expect(r.salesTotal).toBe(13000);
    expect(r.ticketMedio).toBe(6500);
    expect(r.conversionRate).toBe(75); // 3 festas ÷ 4 leads
  });

  it("não conta quem caiu na unidade Trabalhe Conosco", () => {
    const r = report({ leads: [lead("novo"), lead("novo", "Trabalhe Conosco")] });
    expect(r.leadsReceived).toBe(1);
    expect(r.byChannel.some((c) => c.channel === "TRABALHE CONOSCO")).toBe(false);
  });

  it("sem leads, conversão zero", () => {
    expect(report({ events: [event(1000, "2026-10-01")] }).conversionRate).toBe(0);
  });
});

describe("visitas e comparecimento", () => {
  it("separa realizadas, faltas, sem resposta e próximas", () => {
    const r = report({
      visits: [
        visit("realizada", "2026-10-01"),
        visit("realizada", "2026-10-02"),
        visit("nao_compareceu", "2026-10-03"),
        visit("confirmada", "2026-10-05"), // passou e ninguém respondeu
        visit("agendada", "2026-10-09", "VENDAS 3", "20:00"), // hoje, ainda vai acontecer
        visit("cancelada", "2026-10-04"),
        visit("realizada", "2026-08-01"), // fora do período
      ],
    });
    expect(r.visitsRealized).toBe(2);
    expect(r.visitsNoShow).toBe(1);
    expect(r.visitsPendingAnswer).toBe(1);
    expect(r.visitsUpcoming).toBe(1);
    expect(r.visitsCancelled).toBe(1);
    expect(r.attendanceRate).toBeCloseTo(66.67, 1);
  });

  it("sem nenhuma visita com resultado, comparecimento fica vazio", () => {
    expect(report({ visits: [visit("confirmada", "2026-10-05")] }).attendanceRate).toBeNull();
  });
});

describe("situação dos leads", () => {
  it("mostra cliente retorno só quando existe e soma 100%", () => {
    const r = report({ leads: [lead("novo"), lead("cliente_retorno"), lead("fechado"), lead("novo")] });
    const total = r.funnelSteps.reduce((s, f) => s + f.pct, 0);
    expect(total).toBeCloseTo(100, 0);
    expect(r.funnelSteps.find((f) => f.status === "cliente_retorno")?.count).toBe(1);
    expect(report({ leads: [lead("novo")] }).funnelSteps.some((f) => f.status === "cliente_retorno")).toBe(false);
  });
});

describe("por canal de atendimento", () => {
  it("junta leads, visitas realizadas e festas de cada canal", () => {
    const r = report({
      leads: [lead("novo", "VENDAS 3"), lead("novo", "VENDAS 3"), lead("novo", "VENDAS 2")],
      visits: [visit("realizada", "2026-10-01", "Vendas 2"), visit("realizada", "2026-10-02", "VENDAS 3")],
      events: [event(5000, "2026-10-01", "lead-a"), event(5000, "2026-10-02", "lead-b"), event(5000, "2026-10-03", null)],
      eventLeadUnits: new Map([["lead-a", "VENDAS 3"], ["lead-b", "vendas 2"]]),
      aiChannel: "Vendas 3",
    });
    const v3 = r.byChannel.find((c) => c.channel === "VENDAS 3")!;
    const v2 = r.byChannel.find((c) => c.channel === "VENDAS 2")!;
    expect(v3).toMatchObject({ leads: 2, visitsRealized: 1, sales: 1, conversion: 50, isAi: true });
    expect(v2).toMatchObject({ leads: 1, visitsRealized: 1, sales: 1, conversion: 100, isAi: false });
    expect(r.byChannel.find((c) => c.channel === "SEM CANAL")?.sales).toBe(1);
  });

  it("normaliza o nome do canal", () => {
    expect(normalizeChannel(" Vendas 2 ")).toBe("VENDAS 2");
    expect(normalizeChannel(null)).toBe("SEM CANAL");
  });
});
