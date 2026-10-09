// Números (unidades) em que a IA atende.
//
// ai_agent_settings.unit + activated_at: o número principal (o primeiro que
// recebeu a IA). ai_agent_settings.extra_units: outros números, cada um com a
// SUA data de liberação — a IA só pega conversas novas daquele número a partir
// dessa data (não entra no meio do que o bot fixo/equipe já está atendendo).

export interface AiUnit {
  unit: string;
  activated_at: string | null;
}

interface UnitsSettings {
  unit?: string | null;
  activated_at?: string | null;
  extra_units?: unknown;
}

const norm = (u: unknown) => String(u ?? "").trim().toLowerCase();

/** Todos os números com a IA (o principal primeiro), sem repetir */
export function aiUnits(settings: UnitsSettings | null | undefined): AiUnit[] {
  if (!settings) return [];
  const out: AiUnit[] = [];
  const seen = new Set<string>();
  const add = (unit: unknown, activatedAt: unknown) => {
    const name = String(unit ?? "").trim();
    if (!name || seen.has(norm(name))) return;
    seen.add(norm(name));
    out.push({ unit: name, activated_at: typeof activatedAt === "string" && activatedAt ? activatedAt : null });
  };
  add(settings.unit, settings.activated_at);
  if (Array.isArray(settings.extra_units)) {
    for (const e of settings.extra_units) {
      if (e && typeof e === "object") add((e as Record<string, unknown>).unit, (e as Record<string, unknown>).activated_at);
    }
  }
  return out;
}

/** O número desta instância tem a IA? Devolve a configuração dele (com a data de liberação) */
export function aiUnitFor(settings: UnitsSettings | null | undefined, instanceUnit: string | null | undefined): AiUnit | null {
  if (!instanceUnit) return null;
  return aiUnits(settings).find((u) => norm(u.unit) === norm(instanceUnit)) || null;
}
