// Proteção das chamadas à Evolution Go (incidente VENDAS 1, 13/10 18:47):
// depois de um "Disconnected" a Evolution reconecta sozinha em ~3 s. Uma
// chamada nossa nesse meio-tempo (/instance/status, /user/check, reconnect)
// reabre o cliente e cria uma 2ª conexão do mesmo aparelho → "StreamReplaced"
// e a sessão cai, exigindo QR. Regras:
//   1) evento de conexão daquele número nos últimos 2 min → não chama nada
//   2) uma chamada por vez por número (trava em provider_health.lock_until)

// deno-lint-ignore no-explicit-any
type SB = any;

export const EVENT_QUIET_MS = 2 * 60 * 1000;

// ATÉ SEGUNDA ORDEM (15/10): números bloqueados pelo WhatsApp. Consultar uma
// instância deslogada reinicia o ciclo de QR e cada ciclo vaza conexões no
// banco da Evolution (esgotou de novo em 14/10 19:28 e derrubou o VENDAS 1).
// Nada automático consulta a Evolution sobre eles (monitor nem tela de Conexão)
// e os alertas saem só pela Z-API.
export const PAUSED_INSTANCE_ROW_IDS = new Set<string>([
  "3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7", // VENDAS 2 — bloqueado, em análise
]);
export const CELEBREI_GO_PAUSED = true; // 15 97400-0152 bloqueado: sem consultas e sem enviar alertas por ela

export const CONNECTION_EVENTS = [
  "Connected", "PairSuccess", "KeepAliveRestored",
  "Disconnected", "StreamReplaced", "ConnectFailure", "KeepAliveTimeout", "StreamError", "TemporaryBan",
  "LoggedOut", "ClientOutdated",
];

const ONLINE_EVENTS = new Set(["Connected", "PairSuccess", "KeepAliveRestored"]);
const LOGGED_OUT_EVENTS = new Set(["LoggedOut", "ClientOutdated"]);

export interface RecentEvent {
  event: string;
  at: string;
  /** O que o evento diz do número (sem perguntar à Evolution) */
  hint: "online" | "reconnecting" | "needs_qr";
}

/** Último evento de conexão do número nos últimos 2 min (null = pode chamar a Evolution) */
export async function recentConnectionEvent(supabase: SB, externalInstanceId: string, nowMs = Date.now()): Promise<RecentEvent | null> {
  const since = new Date(nowMs - EVENT_QUIET_MS).toISOString();
  const { data, error } = await supabase.from("wapi_webhook_raw_events").select("event_type, received_at")
    .eq("instance_id", externalInstanceId).in("event_type", CONNECTION_EVENTS).gte("received_at", since)
    .order("received_at", { ascending: false }).limit(1);
  if (error || !data || !data[0]) return null;
  const event = String(data[0].event_type);
  return { event, at: data[0].received_at, hint: eventHint(event) };
}

export function eventHint(event: string): RecentEvent["hint"] {
  if (ONLINE_EVENTS.has(event)) return "online";
  if (LOGGED_OUT_EVENTS.has(event)) return "needs_qr";
  return "reconnecting";
}

/**
 * Trava por número: só um processo conversa com a Evolution sobre ele por vez.
 * Devolve true se conseguiu a trava (vale por holdMs ou até soltar).
 */
export async function claimEvolutionLock(supabase: SB, instanceRowId: string, holdMs: number): Promise<boolean> {
  const key = `instance:${instanceRowId}`;
  const now = new Date();
  const until = new Date(now.getTime() + holdMs).toISOString();
  // Garante a linha (primeira vez)
  await supabase.from("provider_health").upsert({ key, instance_id: instanceRowId }, { onConflict: "key", ignoreDuplicates: true });
  const { data, error } = await supabase.from("provider_health").update({ lock_until: until })
    .eq("key", key).or(`lock_until.is.null,lock_until.lt."${now.toISOString()}"`).select("key");
  if (error) {
    // Sem a coluna (migração ainda não rodou): segue sem trava, como antes
    console.warn("[evolution-guard] Trava indisponível:", error.message);
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}

export async function releaseEvolutionLock(supabase: SB, instanceRowId: string): Promise<void> {
  await supabase.from("provider_health").update({ lock_until: null }).eq("key", `instance:${instanceRowId}`);
}
