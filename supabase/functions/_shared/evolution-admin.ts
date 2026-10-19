// Chamadas à Evolution Go com a CHAVE GLOBAL (secret EVOLUTION_GLOBAL_API_KEY).
// Só servem para criar e apagar os números dos buffets do cadastro pelo site.
// Regras (Victor, 19/10) — toda chamada com a chave global passa por aqui:
//   1) só nomes "celebrei-*"; nunca "prospecta-*", castelo-vendas1,
//      castelo-vendas2 nem planeta-vendas1 (esses só pelo token de cada um)
//   2) apagar só o que a Celebrei criou: ID salvo no wapi_instances com
//      managed_by_celebrei e evolution_name "celebrei-*" — e a Evolution tem
//      que confirmar que aquele ID tem aquele nome e não está conectado
//   3) a lista /instance/all traz o token de TODAS as instâncias: ele nunca sai
//      daqui (sem log, sem banco, sem tela)
// Cuidados do banco da Evolution (quedas de 12 e 14/10): limite de instâncias
// "celebrei-*" e nada de status/QR em instância esquecida.

import { evolutionBaseUrl } from "./evolution.ts";

// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

export const MANAGED_PREFIX = "celebrei-";
const PROTECTED_NAMES = new Set(["castelo-vendas1", "castelo-vendas2", "planeta-vendas1"]);
const PROTECTED_PREFIXES = ["prospecta-"];
/** Servidor atual aguenta ~20 instâncias no total (9 em 19/10): no máximo 10 dos buffets */
export const MAX_MANAGED_INSTANCES = 10;

export class EvolutionAdminError extends Error {}

export function isProtectedName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return PROTECTED_NAMES.has(n) || PROTECTED_PREFIXES.some((p) => n.startsWith(p));
}

/** Nome que a chave global pode tocar: "celebrei-*" e fora da lista protegida */
export function assertManagedName(name: unknown): string {
  const n = String(name || "").trim();
  if (!n.toLowerCase().startsWith(MANAGED_PREFIX) || n.length <= MANAGED_PREFIX.length) {
    throw new EvolutionAdminError(`nome fora do padrão celebrei-*: ${n || "(vazio)"}`);
  }
  if (isProtectedName(n)) throw new EvolutionAdminError(`instância protegida: ${n}`);
  return n;
}

/** "celebrei-" + identificador do buffet (só letras minúsculas, números e hífen) */
export function managedNameFor(slug: string): string {
  const s = String(slug || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  if (!s) throw new EvolutionAdminError("buffet sem identificador");
  return assertManagedName(`${MANAGED_PREFIX}${s}`);
}

/** O que sai da lista: nunca o token */
export interface InstanceSummary { id: string; name: string; connected: boolean; jid: string }

export function summarize(raw: unknown): InstanceSummary[] {
  const list = (raw as Json)?.data;
  if (!Array.isArray(list)) return [];
  return list.map((i: Json) => ({
    id: String(i?.id || ""),
    name: String(i?.name || ""),
    connected: i?.connected === true,
    jid: String(i?.jid || ""),
  }));
}

/** Pareada de verdade (jid preenchido): nunca apagar */
export function isPaired(i: InstanceSummary): boolean {
  return !!i.jid;
}

function globalKey(): string {
  const key = Deno.env.get("EVOLUTION_GLOBAL_API_KEY");
  if (!key) throw new EvolutionAdminError("EVOLUTION_GLOBAL_API_KEY não configurada");
  return key;
}

// Só estes caminhos usam a chave global
type GlobalCall = { method: "GET"; path: "/instance/all" } | { method: "POST"; path: "/instance/create" } | { method: "DELETE"; path: `/instance/delete/${string}` };

async function globalRequest(call: GlobalCall, body?: unknown): Promise<{ ok: boolean; status?: number; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${evolutionBaseUrl()}${call.path}`, {
      method: call.method,
      headers: { "Content-Type": "application/json", apikey: globalKey() },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = null; }
    if (!res.ok) {
      const msg = data && typeof data === "object" ? ((data as Json).message || (data as Json).error) : null;
      // Texto cru pode ecoar a lista: só a mensagem curta
      return { ok: false, status: res.status, error: String(msg || `HTTP ${res.status}`).slice(0, 200) };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Lista (só leitura) sem tokens */
export async function listInstances(): Promise<InstanceSummary[]> {
  const r = await globalRequest({ method: "GET", path: "/instance/all" });
  if (!r.ok) throw new EvolutionAdminError(`não consegui listar as instâncias (${r.error})`);
  return summarize(r.data);
}

export function countManaged(list: InstanceSummary[]): number {
  return list.filter((i) => i.name.toLowerCase().startsWith(MANAGED_PREFIX)).length;
}

/** Cria "celebrei-*" com o token gerado por nós. Devolve o ID da Evolution */
export async function createManagedInstance(name: string, token: string): Promise<string> {
  const n = assertManagedName(name);
  if (!token || token.length < 20) throw new EvolutionAdminError("token inválido");
  const list = await listInstances();
  if (list.some((i) => i.name.toLowerCase() === n.toLowerCase())) throw new EvolutionAdminError(`já existe uma instância ${n}`);
  if (countManaged(list) >= MAX_MANAGED_INSTANCES) {
    throw new EvolutionAdminError(`limite de ${MAX_MANAGED_INSTANCES} números de buffets no servidor atingido`);
  }
  const r = await globalRequest({ method: "POST", path: "/instance/create" }, {
    name: n,
    token,
    advancedSettings: { alwaysOnline: false, rejectCall: false, msgRejectCall: "", readMessages: false, ignoreGroups: false, ignoreStatus: true },
  });
  const id = String(((r.data as Json)?.data as Json)?.id || "");
  if (!r.ok || !id) throw new EvolutionAdminError(`não consegui criar a instância (${r.error || "sem ID"})`);
  return id;
}

/** Linha do wapi_instances que autoriza apagar */
export interface ManagedRow { instance_id: string; evolution_name: string | null; managed_by_celebrei: boolean | null; provider: string }

/** Confere tudo antes de apagar; devolve o motivo para NÃO apagar, ou null */
export function deleteBlockReason(row: ManagedRow | null, live: InstanceSummary | undefined, opts: { allowPaired?: boolean } = {}): string | null {
  if (!row) return "sem registro no wapi_instances";
  if (row.managed_by_celebrei !== true) return "não foi criada pela Celebrei";
  if (row.provider !== "evolution") return "não é da Evolution";
  try { assertManagedName(row.evolution_name); } catch (e) { return (e as Error).message; }
  if (!live) return "já não existe na Evolution";
  if (live.id !== row.instance_id) return "ID diferente do salvo";
  if (live.name.toLowerCase() !== String(row.evolution_name).toLowerCase()) return "nome diferente do salvo";
  if (isPaired(live) && !opts.allowPaired) return "número já conectado";
  return null;
}

/**
 * Apaga uma "celebrei-*" que a Celebrei criou. Sem opção, só se nunca pareou.
 * Remoção pedida por um admin (allowPaired + token da própria instância):
 * desconecta antes (logout pelo token dela) e depois apaga.
 */
export async function deleteManagedInstance(row: ManagedRow, opts: { allowPaired?: boolean; instanceToken?: string } = {}): Promise<boolean> {
  const list = await listInstances();
  const live = list.find((i) => i.id === row.instance_id);
  const reason = deleteBlockReason(row, live, { allowPaired: opts.allowPaired && !!opts.instanceToken });
  if (reason === "já não existe na Evolution") return true;
  if (reason) throw new EvolutionAdminError(`não apago ${row.evolution_name || row.instance_id}: ${reason}`);
  if (live && isPaired(live) && opts.instanceToken) {
    try {
      const out = await fetch(`${evolutionBaseUrl()}/instance/logout`, {
        method: "DELETE", headers: { "Content-Type": "application/json", apikey: opts.instanceToken }, signal: AbortSignal.timeout(30000),
      });
      if (!out.ok) console.warn(`[evolution-admin] logout de ${row.evolution_name}: HTTP ${out.status} — apagando mesmo assim`);
    } catch (e) {
      console.warn(`[evolution-admin] logout de ${row.evolution_name} falhou — apagando mesmo assim:`, e instanceof Error ? e.message : e);
    }
  }
  const r = await globalRequest({ method: "DELETE", path: `/instance/delete/${encodeURIComponent(row.instance_id)}` });
  if (!r.ok) throw new EvolutionAdminError(`não consegui apagar ${row.evolution_name} (${r.error})`);
  return true;
}
