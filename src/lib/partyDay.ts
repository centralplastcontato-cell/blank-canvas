// Página do dia da festa: contas que não dependem da tela (roteiro, contagem
// para a festa, quanto está pronto), para poder testar.

export type ScheduleAnchor = "start" | "end";

/** Um momento do roteiro, relativo ao horário da festa (minutos; negativo = antes). */
export interface ScheduleStep {
  label: string;
  anchor: ScheduleAnchor;
  offset: number;
}

export const DEFAULT_SCHEDULE: ScheduleStep[] = [
  { label: "Equipe chega", anchor: "start", offset: -60 },
  { label: "Início da festa", anchor: "start", offset: 0 },
  { label: "Encerramento", anchor: "end", offset: 0 },
];

/** Lê o roteiro salvo em companies.settings.party_schedule (ou o padrão). */
export function parseSchedule(settings: Record<string, unknown> | null | undefined): ScheduleStep[] {
  const raw = settings?.party_schedule;
  if (!Array.isArray(raw)) return DEFAULT_SCHEDULE;
  const steps = raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      label: String(s.label ?? "").trim(),
      anchor: (s.anchor === "end" ? "end" : "start") as ScheduleAnchor,
      offset: Number.isFinite(Number(s.offset)) ? Math.round(Number(s.offset)) : 0,
    }))
    .filter((s) => s.label);
  return steps.length ? steps : DEFAULT_SCHEDULE;
}

const toMinutes = (time: string | null | undefined): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(time || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const fmt = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export type StepState = "done" | "next" | "later";

export interface TimelineItem {
  time: string;
  label: string;
  state: StepState;
}

/**
 * Roteiro com horários de verdade. No dia da festa marca o que já passou e o
 * próximo; em outro dia, tudo fica "later". Festa sem horário: sem roteiro.
 */
export function buildTimeline(
  steps: ScheduleStep[],
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  eventDate: string,
  now: Date,
): TimelineItem[] {
  const start = toMinutes(startTime);
  if (start === null) return [];
  let end = toMinutes(endTime);
  if (end !== null && end <= start) end += 1440; // termina depois da meia-noite
  const items = steps
    .filter((s) => s.anchor === "start" || end !== null)
    .map((s) => ({ at: (s.anchor === "end" ? (end as number) : start) + s.offset, label: s.label }))
    .sort((a, b) => a.at - b.at);

  const isToday = localDate(now) === eventDate;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nextMarked = false;
  return items.map((i) => {
    let state: StepState = "later";
    if (isToday) {
      if (i.at <= nowMin) state = "done";
      else if (!nextMarked) { state = "next"; nextMarked = true; }
    }
    return { time: fmt(i.at), label: i.label, state };
  });
}

export const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type PartyPhase =
  | { kind: "before"; text: string }
  | { kind: "live"; text: string }
  | { kind: "after"; text: string };

/** "A festa começa em 2h 05min" / "Acontecendo agora" / "Festa encerrada". */
export function partyPhase(eventDate: string, startTime: string | null | undefined, endTime: string | null | undefined, now: Date): PartyPhase {
  const [y, mo, d] = eventDate.split("-").map(Number);
  const start = toMinutes(startTime) ?? 0;
  let end = toMinutes(endTime);
  if (end !== null && end <= start) end += 1440;
  const startAt = new Date(y, mo - 1, d, 0, start);
  const endAt = end !== null ? new Date(y, mo - 1, d, 0, end) : new Date(y, mo - 1, d, 23, 59);
  const diffMin = Math.round((startAt.getTime() - now.getTime()) / 60000);

  if (now >= endAt) return { kind: "after", text: "Festa encerrada" };
  if (diffMin <= 0) {
    const left = Math.max(0, Math.round((endAt.getTime() - now.getTime()) / 60000));
    return { kind: "live", text: `Acontecendo agora · termina em ${duration(left)}` };
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((new Date(y, mo - 1, d).getTime() - today.getTime()) / 86400000);
  if (days >= 2) return { kind: "before", text: `Faltam ${days} dias` };
  if (days === 1) return { kind: "before", text: "É amanhã" };
  return { kind: "before", text: `Começa em ${duration(diffMin)}` };
}

const duration = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  return m ? `${h}h ${String(m).padStart(2, "0")}min` : `${h}h`;
};

/**
 * Quanto da festa está pronto (0–100): checklist pela fração feita, e cada
 * formulário do cliente ligado conta como um item (respondido ou não).
 * A avaliação fica de fora (é depois da festa). Nada para medir: null.
 */
export function readiness(checklist: { total: number; completed: number }, forms: boolean[]): number | null {
  const parts: number[] = [];
  if (checklist.total > 0) parts.push(checklist.completed / checklist.total);
  forms.forEach((f) => parts.push(f ? 1 : 0));
  if (!parts.length) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}
