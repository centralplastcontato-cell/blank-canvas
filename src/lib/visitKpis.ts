// Números da aba Visitas (mês do calendário).
// "Comparecimento" = vieram ÷ (vieram + não vieram): só conta visita com resultado.
import { PENDING_VISIT_STATUSES, isVisitOutcomeDue } from "@/lib/visitOutcome";

export interface KpiVisit {
  status_visita: string;
  visit_type?: string | null;
  data_visita: string;
  horario_visita: string | null;
}

const isPending = (s: string) => (PENDING_VISIT_STATUSES as readonly string[]).includes(s);

export function visitSummary(visits: KpiVisit[], now: Date = new Date()) {
  const comerciais = visits.filter((v) => (v.visit_type || "visita") !== "atendimento");
  const vieram = comerciais.filter((v) => v.status_visita === "realizada").length;
  const naoVieram = comerciais.filter((v) => v.status_visita === "nao_compareceu").length;
  const pendentes = comerciais.filter((v) => isPending(v.status_visita));
  const semResultado = pendentes.filter((v) => isVisitOutcomeDue(v.data_visita, v.horario_visita, now)).length;
  const comResultado = vieram + naoVieram;
  return {
    visitas: comerciais.length,
    atendimentos: visits.length - comerciais.length,
    /** marcadas que ainda vão acontecer */
    aAcontecer: pendentes.length - semResultado,
    vieram,
    naoVieram,
    canceladas: comerciais.filter((v) => v.status_visita === "cancelada").length,
    /** já passaram e ninguém disse se o cliente veio */
    semResultado,
    /** % de quem veio entre as visitas com resultado (null sem nenhuma) */
    comparecimento: comResultado > 0 ? Math.round((vieram / comResultado) * 100) : null,
    comResultado,
  };
}
