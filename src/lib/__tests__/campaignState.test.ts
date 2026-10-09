import { describe, expect, it } from "vitest";
import { campaignState, nextSendLabel, reactivatedStatus } from "../campaignState";

const c = (status: string, total: number, sent: number, errors = 0) => ({ status, total_recipients: total, sent_count: sent, error_count: errors });

describe("campaignState", () => {
  it("draft sem envio é rascunho e pode iniciar", () => {
    expect(campaignState(c("draft", 82, 0))).toMatchObject({ kind: "draft", label: "Rascunho", action: "start", pending: 82 });
  });

  it("draft com parte enviada é pausada e mostra quantos faltam", () => {
    expect(campaignState(c("draft", 82, 40))).toMatchObject({ kind: "paused", label: "Pausada · faltam 42", action: "continue", pending: 42 });
  });

  it("draft com todos enviados é concluída (caso do limite de 50 no último envio)", () => {
    expect(campaignState(c("draft", 50, 50))).toMatchObject({ kind: "completed", label: "Concluída", action: null });
    expect(campaignState(c("draft", 30, 28, 2))).toMatchObject({ kind: "completed" });
  });

  it("enviando: neste aparelho não oferece retomar; em outro, oferece", () => {
    expect(campaignState(c("sending", 10, 3), true).action).toBeNull();
    expect(campaignState(c("sending", 10, 3)).action).toBe("resume");
  });

  it("cancelada e concluída não têm botão de envio", () => {
    expect(campaignState(c("cancelled", 10, 3)).action).toBeNull();
    expect(campaignState(c("completed", 10, 10)).action).toBeNull();
  });

  it("reativar volta para concluída quando ninguém falta", () => {
    expect(reactivatedStatus(c("cancelled", 50, 50))).toBe("completed");
    expect(reactivatedStatus(c("cancelled", 50, 20))).toBe("draft");
    expect(reactivatedStatus(c("cancelled", 50, 0))).toBe("draft");
  });
});

describe("campaignState no servidor", () => {
  it("enviando pelo servidor: mostra quantos faltam e permite pausar", () => {
    const s = campaignState({ ...c("sending", 100, 40, 2), server_send: true });
    expect(s).toEqual({ kind: "sending", label: "Enviando · faltam 58", pending: 58, action: "pause" });
  });
  it("envio antigo pela tela que parou no meio: Retomar", () => {
    expect(campaignState({ ...c("sending", 100, 40), server_send: false }).action).toBe("resume");
  });
});

describe("nextSendLabel", () => {
  // 09/10/2026 é sexta
  const now = new Date("2026-10-09T10:00:00-03:00");
  it("hoje, amanhã e dia da semana, no horário de Brasília", () => {
    expect(nextSendLabel(new Date("2026-10-09T14:32:00-03:00"), now)).toBe("hoje às 14:32");
    expect(nextSendLabel(new Date("2026-10-10T09:05:00-03:00"), now)).toBe("amanhã às 09:05");
    expect(nextSendLabel(new Date("2026-10-12T09:10:00-03:00"), now)).toBe("segunda às 09:10");
    expect(nextSendLabel(new Date("2026-10-09T09:00:00-03:00"), now)).toBe("em instantes");
  });
});
