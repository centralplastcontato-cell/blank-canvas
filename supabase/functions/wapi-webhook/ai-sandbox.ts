// Modo de teste isolado da IA (simulador): a IA roda de verdade — mesma
// configuração, agenda, grade de preços e pacotes —, mas
//   * nada sai pelo WhatsApp (os envios ficam numa "caixa de saída" em memória);
//   * conversa, mensagens, lead, histórico, visitas, avisos e consumo ficam num
//     banco em memória (as visitas reais entram como cópia, para conferir
//     conflito de horário);
//   * todo o resto é lido do banco real e qualquer escrita nele é recusada;
//   * as esperas (juntar mensagens, confirmação de mídia) são puladas.
// O contexto vale só dentro de aiSandbox.run(...), então execuções reais que
// rodem ao mesmo tempo no mesmo processo não são afetadas.

// deno-lint-ignore-file no-explicit-any

import { AsyncLocalStorage } from "node:async_hooks";

export type Row = Record<string, any>;

/** Tabelas que, no simulador, vivem só em memória */
export const SANDBOX_MEMORY_TABLES = new Set([
  "wapi_conversations",
  "wapi_messages",
  "campaign_leads",
  "lead_history",
  "lead_visits",
  "notifications",
  "ai_agent_usage",
]);

export interface SandboxOutMessage {
  action: string;
  message?: string;
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
  at: string;
}

export interface SandboxToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface SandboxState {
  memory: Record<string, Row[]>;
  clockMs: number;
  seq: number;
  outbox: SandboxOutMessage[];
  tools: SandboxToolCall[];
}

export class SandboxContext {
  constructor(public state: SandboxState, public model: string | null = null) {}

  /** Relógio da conversa simulada: avança a cada mensagem (respostas da IA 2 s, cliente 30 s) */
  tick(ms: number): string {
    this.state.clockMs = Math.max(this.state.clockMs + ms, Date.now());
    return new Date(this.state.clockMs).toISOString();
  }

  nextId(prefix: string): string {
    this.state.seq += 1;
    return `${prefix}-${this.state.seq}`;
  }

  /** Envio da IA: vai para a caixa de saída e para a conversa em memória */
  send(action: string, conversationId: string, payload: Record<string, any>): string {
    const at = this.tick(2000);
    this.state.outbox.push({ action, message: payload.message, mediaUrl: payload.mediaUrl, caption: payload.caption, fileName: payload.fileName, at });
    const type = action === "send-text" ? "text" : action.replace("send-", "");
    (this.state.memory.wapi_messages ||= []).push({
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      message_id: this.nextId("sim-out"),
      from_me: true,
      content: payload.message || payload.caption || "",
      message_type: type === "document" ? "document" : type,
      media_url: payload.mediaUrl || null,
      status: "sent",
      timestamp: at,
      metadata: { source: "ai_agent", simulated: true },
    });
    // '' = provedor sem rastreio: a IA não espera confirmação do WhatsApp
    return "";
  }
}

export const aiSandbox = new AsyncLocalStorage<SandboxContext>();

export const inSandbox = (): SandboxContext | undefined => aiSandbox.getStore();

/** setTimeout que não espera no simulador */
export function sandboxSleep(ms: number): Promise<void> {
  if (aiSandbox.getStore()) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- banco em memória (subconjunto do query builder do supabase-js) ----------

const cmp = (a: any, b: any) => (a === b ? 0 : a === null || a === undefined ? -1 : b === null || b === undefined ? 1 : a > b ? 1 : -1);

export function memoryBuilder(memory: Record<string, Row[]>, table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  const sorts: Array<[string, boolean]> = [];
  let op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  let payload: any = null;
  let limitN: number | null = null;
  let single = false;
  let maybe = false;
  let returning = false;

  const b: any = {
    select() { if (op !== "select") returning = true; return b; },
    eq(c: string, v: any) { filters.push((r) => r[c] === v); return b; },
    neq(c: string, v: any) { filters.push((r) => r[c] !== v); return b; },
    in(c: string, v: any[]) { filters.push((r) => (v || []).includes(r[c])); return b; },
    gt(c: string, v: any) { filters.push((r) => r[c] !== null && r[c] !== undefined && cmp(r[c], v) > 0); return b; },
    gte(c: string, v: any) { filters.push((r) => r[c] !== null && r[c] !== undefined && cmp(r[c], v) >= 0); return b; },
    lt(c: string, v: any) { filters.push((r) => r[c] !== null && r[c] !== undefined && cmp(r[c], v) < 0); return b; },
    lte(c: string, v: any) { filters.push((r) => r[c] !== null && r[c] !== undefined && cmp(r[c], v) <= 0); return b; },
    is(c: string, v: any) { filters.push((r) => (v === null ? r[c] === null || r[c] === undefined : r[c] === v)); return b; },
    not(c: string, operator: string, v: any) {
      if (operator === "is" && (v === null || v === "null")) filters.push((r) => r[c] !== null && r[c] !== undefined);
      else if (operator === "eq") filters.push((r) => r[c] !== v);
      return b;
    },
    or() { return b; },
    ilike(c: string, pattern: string) {
      const re = new RegExp(`^${String(pattern).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*")}$`, "i");
      filters.push((r) => re.test(String(r[c] ?? "")));
      return b;
    },
    order(c: string, o?: { ascending?: boolean }) { sorts.push([c, o?.ascending !== false]); return b; },
    limit(n: number) { limitN = n; return b; },
    range() { return b; },
    maybeSingle() { maybe = true; return b; },
    single() { single = true; return b; },
    insert(p: any) { op = "insert"; payload = p; return b; },
    upsert(p: any) { op = "upsert"; payload = p; return b; },
    update(p: any) { op = "update"; payload = p; return b; },
    delete() { op = "delete"; return b; },
    then(res: any, rej: any) {
      try { return Promise.resolve(run()).then(res, rej); } catch (e) { return Promise.reject(e).then(res, rej); }
    },
  };

  const clone = (r: Row) => JSON.parse(JSON.stringify(r));

  function run() {
    const rows = (memory[table] ||= []);
    if (op === "insert" || op === "upsert") {
      const list = (Array.isArray(payload) ? payload : [payload]).map((r: Row) => ({ id: r.id || crypto.randomUUID(), created_at: new Date().toISOString(), ...r }));
      for (const r of list) {
        const existing = op === "upsert" ? rows.find((x) => x.id === r.id) : null;
        if (existing) Object.assign(existing, r);
        else rows.push(r);
      }
      const out = list.map(clone);
      return { data: returning || single || maybe ? (single || maybe ? out[0] ?? null : out) : null, error: null };
    }
    let matched = rows.filter((r) => filters.every((f) => f(r)));
    if (op === "update") {
      matched.forEach((r) => Object.assign(r, JSON.parse(JSON.stringify(payload))));
      const out = matched.map(clone);
      return { data: returning ? (single || maybe ? out[0] ?? null : out) : null, error: null };
    }
    if (op === "delete") {
      memory[table] = rows.filter((r) => !matched.includes(r));
      return { data: null, error: null };
    }
    if (sorts.length > 0) {
      matched = [...matched].sort((x, y) => {
        for (const [c, asc] of sorts) {
          const d = cmp(x[c], y[c]);
          if (d !== 0) return asc ? d : -d;
        }
        return 0;
      });
    }
    if (limitN !== null) matched = matched.slice(0, limitN);
    const out = matched.map(clone);
    if (single) return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: `esperava 1 linha em ${table}, achou ${out.length}` } };
    if (maybe) return { data: out[0] ?? null, error: null };
    return { data: out, error: null };
  }
  return b;
}

const WRITE_METHODS = new Set(["insert", "update", "upsert", "delete"]);
const rejected = (what: string) => {
  const result = { data: null, error: { message: `simulador: ${what} é só leitura` } };
  const chain: any = new Proxy({}, {
    get(_t, p) {
      if (p === "then") return (res: any, rej: any) => Promise.resolve(result).then(res, rej);
      return () => chain;
    },
  });
  return chain;
};

/**
 * Cliente do simulador: tabelas da conversa em memória, o resto lido do banco
 * real (escrita recusada), rpc devolve vazio (ninguém é avisado de verdade).
 */
export function createSandboxDb(real: any, memory: Record<string, Row[]>): any {
  return {
    __sandbox: true,
    from(table: string) {
      if (SANDBOX_MEMORY_TABLES.has(table)) return memoryBuilder(memory, table);
      const builder = real.from(table);
      return new Proxy(builder, {
        get(target, prop) {
          if (typeof prop === "string" && WRITE_METHODS.has(prop)) {
            console.warn(`[Simulador] Escrita recusada: ${prop} em ${table}`);
            return () => rejected(table);
          }
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
    rpc: async () => ({ data: [], error: null }),
    get storage() { throw new Error("simulador: storage indisponível"); },
    get functions() { throw new Error("simulador: functions indisponível"); },
  };
}
