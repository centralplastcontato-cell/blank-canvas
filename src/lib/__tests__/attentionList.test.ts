import { describe, expect, it } from "vitest";
import { buildAttentionList, describeElapsed, type AttentionConversation, type AttentionLead } from "../attentionList";

// 09/10/2026 18:30 em Brasília
const NOW = new Date("2026-10-09T21:30:00Z");
const HOUR = 60 * 60 * 1000;
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

const lead = (id: string, status = "orcamento_enviado"): AttentionLead => ({ id, name: `Lead ${id}`, whatsapp: "5511999999999", status, unit: "VENDAS 3" });
const conv = (lead_id: string, msAgo: number, fromMe: boolean, extra: Partial<AttentionConversation> = {}): AttentionConversation => ({
  lead_id, last_message_at: ago(msAgo), last_message_from_me: fromMe, last_message_content: "Oi, e o valor?", is_closed: false, ...extra,
});

function sections(input: Partial<Parameters<typeof buildAttentionList>[0]>) {
  const r = buildAttentionList({ leads: [], conversations: [], visits: [], now: NOW, ...input });
  return Object.fromEntries(r.map((s) => [s.kind, s.items.map((i) => i.leadId)]));
}

describe("cliente esperando resposta", () => {
  it("entre 30 min e 7 dias, quem espera há mais tempo primeiro", () => {
    const r = sections({
      leads: [lead("a"), lead("b"), lead("c"), lead("d"), lead("e")],
      conversations: [
        conv("a", 2 * HOUR, false),
        conv("b", 20 * 60 * 1000, false), // 20 min: ainda não
        conv("c", 8 * 24 * HOUR, false), // 8 dias: já passou
        conv("d", 5 * HOUR, false),
        conv("e", 3 * HOUR, true), // a equipe respondeu por último
      ],
    });
    expect(r.cliente_esperando).toEqual(["d", "a"]);
  });

  it("vale a conversa mais recente do lead e ignora conversa encerrada", () => {
    const r = sections({
      leads: [lead("a"), lead("b")],
      conversations: [
        conv("a", 5 * HOUR, false), // cliente escreveu num número...
        conv("a", 1 * HOUR, true), // ...e foi respondido em outro
        conv("b", 2 * HOUR, false, { is_closed: true }),
      ],
    });
    expect(r.cliente_esperando).toEqual([]);
  });

  it("não mostra lead fechado ou perdido", () => {
    const r = sections({
      leads: [lead("a", "fechado"), lead("b", "perdido"), lead("c", "novo")],
      conversations: [conv("a", 2 * HOUR, false), conv("b", 2 * HOUR, false), conv("c", 2 * HOUR, false)],
    });
    expect(r.cliente_esperando).toEqual(["c"]);
  });

  it("traz a última mensagem do cliente e há quanto tempo espera", () => {
    const [s] = buildAttentionList({ leads: [lead("a")], conversations: [conv("a", 3 * HOUR, false)], visits: [], now: NOW });
    expect(s.items[0]).toMatchObject({ detail: "esperando há 3 h", preview: "Oi, e o valor?", statusLabel: "Orçamento enviado" });
  });
});

describe("visitou e não fechou", () => {
  it("visita nos últimos 30 dias e ninguém conversou há 2 dias", () => {
    const r = sections({
      leads: [lead("a", "em_contato"), lead("b", "em_contato"), lead("c", "fechado"), lead("d", "em_contato"), lead("e", "em_contato")],
      conversations: [conv("a", 3 * 24 * HOUR, true), conv("b", 5 * HOUR, true), conv("c", 3 * 24 * HOUR, true), conv("d", 3 * 24 * HOUR, true)],
      visits: [
        { lead_id: "a", data_visita: "2026-10-01" },
        { lead_id: "b", data_visita: "2026-10-01" }, // conversou hoje
        { lead_id: "c", data_visita: "2026-10-01" }, // já fechou
        { lead_id: "d", data_visita: "2026-08-01" }, // visita antiga
        { lead_id: "e", data_visita: "2026-10-05" }, // sem conversa nenhuma
      ],
    });
    expect(r.visitou_sem_fechar).toEqual(["e", "a"]);
  });

  it("quem está esperando resposta aparece só lá", () => {
    const r = sections({
      leads: [lead("a", "em_contato")],
      conversations: [conv("a", 3 * 24 * HOUR, false)],
      visits: [{ lead_id: "a", data_visita: "2026-10-01" }],
    });
    expect(r.cliente_esperando).toEqual(["a"]);
    expect(r.visitou_sem_fechar).toEqual([]);
  });

  it("mostra o dia da visita", () => {
    const r = buildAttentionList({
      leads: [lead("a", "em_contato")],
      conversations: [conv("a", 4 * 24 * HOUR, true)],
      visits: [{ lead_id: "a", data_visita: "2026-10-02" }],
      now: NOW,
    });
    expect(r[1].items[0].detail).toBe("visitou em 02/10 · sem conversa há 4 dias");
  });
});

describe("negociação parada", () => {
  it("em Negociando, sem conversa entre 3 e 30 dias, a mais recente primeiro", () => {
    const r = sections({
      leads: [lead("a", "aguardando_resposta"), lead("b", "aguardando_resposta"), lead("c", "aguardando_resposta"), lead("d", "aguardando_resposta"), lead("e", "orcamento_enviado")],
      conversations: [
        conv("a", 10 * 24 * HOUR, true),
        conv("b", 1 * 24 * HOUR, true), // conversou ontem
        conv("c", 40 * 24 * HOUR, true), // parado há muito tempo
        conv("d", 4 * 24 * HOUR, true),
        conv("e", 10 * 24 * HOUR, true), // não está negociando
      ],
    });
    expect(r.negociacao_parada).toEqual(["d", "a"]);
  });
});

describe("describeElapsed", () => {
  it("minutos, horas e dias", () => {
    expect(describeElapsed(45 * 60 * 1000)).toBe("45 min");
    expect(describeElapsed(3 * HOUR + 59 * 60 * 1000)).toBe("3 h");
    expect(describeElapsed(30 * HOUR)).toBe("1 dia");
    expect(describeElapsed(5 * 24 * HOUR)).toBe("5 dias");
  });
});
