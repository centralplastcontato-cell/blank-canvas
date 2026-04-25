import { supabase } from "@/integrations/supabase/client";

export interface DuplicateMatch {
  event_id: string;
  event_title: string;
  event_date: string;
  amount: number;
  payment_method: string | null;
  paid_at: string;
  source: "entry" | "payment";
}

/**
 * Verifica se um pagamento idêntico (mesmo valor + método) foi lançado em OUTRO evento
 * nas últimas 24 horas. Útil para detectar duplicidade acidental quando o usuário
 * está com várias festas abertas ao mesmo tempo.
 */
export async function checkDuplicatePayment({
  companyId,
  currentEventId,
  amount,
  paymentMethod,
  windowHours = 24,
  tolerance = 0.01,
}: {
  companyId: string;
  currentEventId: string;
  amount: number;
  paymentMethod?: string | null;
  windowHours?: number;
  tolerance?: number;
}): Promise<DuplicateMatch[]> {
  if (!amount || amount <= 0 || !companyId) return [];

  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const minAmount = amount - tolerance;
  const maxAmount = amount + tolerance;

  const matches: DuplicateMatch[] = [];

  // 1) Verifica entradas parciais (event_payment_entries) recém-criadas
  const entriesQuery = supabase
    .from("event_payment_entries" as any)
    .select("amount, payment_method, paid_at, payment_id, event_payments!inner(event_id, company_id)")
    .gte("amount", minAmount)
    .lte("amount", maxAmount)
    .gte("created_at", sinceIso);

  const { data: entries } = await entriesQuery;

  // 2) Verifica parcelas inteiras (event_payments) recém-criadas/pagas
  const { data: payments } = await supabase
    .from("event_payments" as any)
    .select("event_id, amount, payment_method, paid_at, created_at")
    .eq("company_id", companyId)
    .neq("event_id", currentEventId)
    .gte("amount", minAmount)
    .lte("amount", maxAmount)
    .gte("created_at", sinceIso);

  const candidateEventIds = new Set<string>();
  const tempMatches: Array<Omit<DuplicateMatch, "event_title" | "event_date">> = [];

  (entries as any[] | null)?.forEach((e) => {
    const ep = e.event_payments;
    if (!ep || ep.company_id !== companyId) return;
    if (ep.event_id === currentEventId) return;
    if (paymentMethod && e.payment_method && e.payment_method !== paymentMethod) return;
    candidateEventIds.add(ep.event_id);
    tempMatches.push({
      event_id: ep.event_id,
      amount: Number(e.amount),
      payment_method: e.payment_method,
      paid_at: e.paid_at,
      source: "entry",
    });
  });

  (payments as any[] | null)?.forEach((p) => {
    if (paymentMethod && p.payment_method && p.payment_method !== paymentMethod) return;
    candidateEventIds.add(p.event_id);
    tempMatches.push({
      event_id: p.event_id,
      amount: Number(p.amount),
      payment_method: p.payment_method,
      paid_at: p.paid_at || p.created_at,
      source: "payment",
    });
  });

  if (candidateEventIds.size === 0) return [];

  // Busca detalhes dos eventos para mostrar contexto
  const { data: eventsData } = await supabase
    .from("company_events")
    .select("id, title, event_date")
    .in("id", Array.from(candidateEventIds));

  const eventMap = new Map<string, { title: string; date: string }>();
  (eventsData || []).forEach((ev: any) => {
    eventMap.set(ev.id, { title: ev.title, date: ev.event_date });
  });

  tempMatches.forEach((m) => {
    const ev = eventMap.get(m.event_id);
    if (!ev) return;
    matches.push({
      ...m,
      event_title: ev.title,
      event_date: ev.date,
    });
  });

  // Deduplica por event_id (mostra só 1 alerta por festa)
  const seen = new Set<string>();
  return matches.filter((m) => {
    if (seen.has(m.event_id)) return false;
    seen.add(m.event_id);
    return true;
  });
}
