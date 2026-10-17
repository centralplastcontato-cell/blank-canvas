/**
 * Passo a passo do buffet que se cadastrou sozinho (/setup): as respostas da IA,
 * as datas ocupadas e os dias da agenda rápida.
 */
import { BUFFET_FIELDS } from "@/lib/aiBuffetFields";

/** Marca das datas ocupadas criadas no cadastro (só essas podem ser desmarcadas no passo a passo) */
export const BUSY_NOTE = "Marcado no cadastro";

/** Segunda primeiro — o mesmo índice de serializeVisitHours (0 = segunda … 6 = domingo) */
export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export interface Slot {
  start: string;
  end: string;
}

export interface SetupAnswers {
  assistant_name: string;
  slots: Slot[];
  visit_days: number[];
  visit_start: string;
  visit_end: string;
  team_days: number[];
  team_start: string;
  team_end: string;
  duracao: string;
  estrutura: string;
  diferenciais: string;
  comida_externa: string;
  monitores: string;
  regras: string;
  proibido: string;
}

/** Perguntas de resposta pronta (mesmas opções do Configurar IA) */
export const SETUP_SELECTS = (["comida_externa", "monitores"] as const).map((key) => {
  const f = BUFFET_FIELDS.find((x) => x.key === key)!;
  return { key, label: f.label, options: f.options || [] };
});

/** [{13:00,17:00},{19:00,23:00}] → "13:00-17:00, 19:00-23:00" (formato de party_slots) */
export function buildPartySlots(slots: Slot[]): string {
  return slots.filter((s) => s.start && s.end).map((s) => `${s.start}-${s.end}`).join(", ");
}

/** AAAA-MM-DD no horário local */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface MonthGrid {
  key: string;
  label: string;
  /** Casas vazias antes do dia 1 (semana começando na segunda) */
  offset: number;
  days: string[];
}

/** Os próximos N meses, a partir do mês de hoje */
export function monthsAhead(from: Date, count: number): MonthGrid[] {
  const out: MonthGrid[] = [];
  for (let i = 0; i < count; i++) {
    const first = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const total = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    out.push({
      key: dayKey(first).slice(0, 7),
      label: first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      offset: (first.getDay() + 6) % 7,
      days: Array.from({ length: total }, (_, d) => dayKey(new Date(first.getFullYear(), first.getMonth(), d + 1))),
    });
  }
  return out;
}

/** Status do cadastro automático guardado em companies.settings.signup */
export type SignupStatus = "cadastro" | "aguardando_aprovacao" | "aprovado";

export function signupStatus(settings: unknown): SignupStatus | null {
  const s = (settings as { signup?: { status?: string } } | null)?.signup?.status;
  return s === "cadastro" || s === "aguardando_aprovacao" || s === "aprovado" ? s : null;
}
