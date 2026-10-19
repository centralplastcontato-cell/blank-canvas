// Conexão automática do WhatsApp dos buffets do cadastro pelo site (Evolution Go).
// A instância "celebrei-*" nasce desligada no wapi_instances (o monitor não
// consulta e as mensagens não entram) e só liga quando o número pareia
// ("PairSuccess" que chega pelo webhook — durante o QR não se pergunta nada à
// Evolution: status/check reiniciam o ciclo). Quem não pareia em ~6 min é
// apagado da Evolution: instância esquecida em loop de QR esgota o banco dela.

import { deleteManagedInstance, EvolutionAdminError, isPaired, listInstances, type ManagedRow } from "./evolution-admin.ts";

// deno-lint-ignore no-explicit-any
type SB = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

/** ~2 ciclos de QR (cada um ~2 min) e uma folga */
export const PENDING_TTL_MS = 6 * 60 * 1000;

export interface ProvisionRow extends ManagedRow {
  id: string;
  company_id: string;
  status: string | null;
  is_active: boolean;
  updated_at: string;
  unit: string | null;
}

export function isExpired(row: { updated_at: string }, nowMs = Date.now()): boolean {
  return nowMs - Date.parse(row.updated_at) > PENDING_TTL_MS;
}

/** Número do "PairSuccess" (jid 5515999990000:12@s.whatsapp.net) */
export function phoneFromPayload(payload: unknown): string | null {
  const m = JSON.stringify(payload ?? "").match(/(\d{10,15})(?::\d+)?@s\.whatsapp\.net/);
  return m ? m[1] : null;
}

/** Pareou depois do início? Lê só os eventos que já chegaram no nosso banco */
export async function pairedFromEvents(supabase: SB, row: ProvisionRow): Promise<{ phone: string | null } | null> {
  const { data } = await supabase.from("wapi_webhook_raw_events").select("payload")
    .eq("instance_id", row.instance_id).eq("event_type", "PairSuccess").gte("received_at", row.updated_at)
    .order("received_at", { ascending: false }).limit(1);
  if (!data || !data[0]) return null;
  return { phone: phoneFromPayload(data[0].payload) };
}

export async function activate(supabase: SB, row: ProvisionRow, phone: string | null): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("wapi_instances").update({
    is_active: true, status: "connected", connected_at: now, ...(phone ? { phone_number: phone } : {}),
  }).eq("id", row.id);
  const { data: company } = await supabase.from("companies").select("name").eq("id", row.company_id).maybeSingle();
  const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  const ids = [...new Set(((admins || []) as Json[]).map((a) => a.user_id))];
  if (ids.length) {
    await supabase.from("notifications").insert(ids.map((user_id) => ({
      user_id, company_id: row.company_id, type: "self_signup_whatsapp", title: "📱 Buffet conectou o WhatsApp",
      message: `${company?.name || "Um buffet"} conectou o número${phone ? ` ${phone}` : ""} pelo cadastro.`, data: { company_id: row.company_id },
    })));
  }
  console.log(`[provision] ${row.evolution_name} pareou${phone ? ` (${phone})` : ""} — número ligado`);
}

/** Apaga da Evolution e marca o registro como não conectado (o registro fica) */
export async function abandon(supabase: SB, row: ProvisionRow): Promise<void> {
  await deleteManagedInstance(row);
  await supabase.from("wapi_instances").update({ status: "not_connected", is_active: false }).eq("id", row.id);
  console.log(`[provision] ${row.evolution_name} não pareou — apagada da Evolution`);
}

/**
 * Resolve uma instância esperando QR: pareou → liga; venceu (ou force) → apaga.
 * Nunca apaga número pareado (confere o evento e a própria Evolution).
 */
export async function settle(supabase: SB, row: ProvisionRow, opts: { force?: boolean; nowMs?: number } = {}): Promise<"connected" | "pending" | "expired"> {
  const paired = await pairedFromEvents(supabase, row);
  if (paired) { await activate(supabase, row, paired.phone); return "connected"; }
  if (!opts.force && !isExpired(row, opts.nowMs)) return "pending";
  const live = (await listInstances()).find((i) => i.id === row.instance_id);
  if (live && isPaired(live)) {
    await activate(supabase, row, live.jid.match(/^(\d{10,15})/)?.[1] || null);
    return "connected";
  }
  await abandon(supabase, row);
  return "expired";
}

const PENDING_SELECT = "id, company_id, instance_id, evolution_name, managed_by_celebrei, provider, status, is_active, updated_at, unit";

/** Rede de segurança (monitor, a cada 5 min): instâncias esquecidas esperando QR */
export async function cleanupAbandoned(supabase: SB, nowMs = Date.now()): Promise<string[]> {
  const before = new Date(nowMs - PENDING_TTL_MS).toISOString();
  const { data } = await supabase.from("wapi_instances").select(PENDING_SELECT)
    .eq("managed_by_celebrei", true).eq("status", "pending_qr").lt("updated_at", before);
  const done: string[] = [];
  for (const row of (data || []) as ProvisionRow[]) {
    try {
      done.push(`${row.evolution_name}: ${await settle(supabase, row, { nowMs })}`);
    } catch (e) {
      console.error(`[provision] limpeza de ${row.evolution_name}:`, e instanceof EvolutionAdminError ? e.message : e);
    }
  }
  return done;
}

export { PENDING_SELECT };
