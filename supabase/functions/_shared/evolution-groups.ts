// Nome dos grupos nos números da Evolution: a mensagem de grupo chega só com o
// JID, e a conversa fica "Grupo 1203…". O monitor (que acabou de confirmar que
// o número está logado) busca os nomes com UMA chamada GET /group/list, no
// máximo 1x por hora por número e só se houver grupo sem nome. Nunca no fluxo
// de cada mensagem (rate-overlimit do WhatsApp) e nunca em número desconectado
// (a Evolution reabriria o cliente e vazaria conexões do banco dela).

import { evolutionRequest } from "./evolution.ts";

// deno-lint-ignore no-explicit-any
type SB = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

export const GROUP_NAMES_EVERY_MS = 60 * 60 * 1000;

/** Nome provisório que o webhook grava ("Grupo <id>") ou nenhum */
export function needsGroupName(name: string | null, remoteJid: string): boolean {
  const n = (name || "").trim();
  if (!n) return true;
  const id = remoteJid.replace(/@g\.us$/, "");
  return n === `Grupo ${id}` || n === id || /^Grupo [\d-]+$/.test(n);
}

/** JID → nome, a partir da resposta do /group/list */
export function groupNamesFrom(raw: unknown): Map<string, string> {
  const data = (raw as Json)?.data;
  const list = Array.isArray(data) ? data : Array.isArray((data as Json)?.groups) ? (data as Json).groups : [];
  const out = new Map<string, string>();
  for (const g of list as Json[]) {
    const jid = String(g?.JID || g?.jid || "");
    const name = String(g?.Name || g?.name || g?.Subject || "").trim();
    if (jid.endsWith("@g.us") && name) out.set(jid, name.slice(0, 120));
  }
  return out;
}

/** Preenche os nomes; devolve quantos grupos ganharam nome */
export async function fillGroupNames(supabase: SB, inst: { id: string; instance_token: string; unit: string | null }, nowMs = Date.now()): Promise<number> {
  const key = `groups:${inst.id}`;
  const { data: last } = await supabase.from("provider_health").select("last_check_at").eq("key", key).maybeSingle();
  if (last?.last_check_at && nowMs - Date.parse(last.last_check_at) < GROUP_NAMES_EVERY_MS) return 0;

  const { data: convs } = await supabase.from("wapi_conversations").select("id, remote_jid, contact_name")
    .eq("instance_id", inst.id).like("remote_jid", "%@g.us").limit(500);
  const missing = ((convs || []) as Json[]).filter((c) => needsGroupName(c.contact_name, String(c.remote_jid)));
  if (missing.length === 0) return 0;

  const nowIso = new Date(nowMs).toISOString();
  // Grava a tentativa antes: se a chamada falhar, só tenta de novo daqui a 1 h
  await supabase.from("provider_health").upsert(
    { key, instance_id: inst.id, state: "online", state_since: nowIso, last_check_at: nowIso, updated_at: nowIso },
    { onConflict: "key" },
  );
  const res = await evolutionRequest(inst.instance_token, "/group/list", "GET", undefined, 20000);
  if (!res.ok) {
    console.warn(`[groups] ${inst.unit}: /group/list falhou (${res.error})`);
    return 0;
  }
  const names = groupNamesFrom(res.data);
  let filled = 0;
  for (const c of missing) {
    const name = names.get(String(c.remote_jid));
    if (!name) continue;
    const { error } = await supabase.from("wapi_conversations").update({ contact_name: name }).eq("id", c.id);
    if (!error) filled++;
  }
  console.log(`[groups] ${inst.unit}: ${filled}/${missing.length} grupo(s) com nome`);
  return filled;
}
