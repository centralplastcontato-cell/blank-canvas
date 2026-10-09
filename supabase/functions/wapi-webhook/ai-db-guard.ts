// Trava de escrita da IA (beta): ela LÊ o que precisar (agenda, pré-reservas,
// pacotes...), mas só GRAVA nas tabelas abaixo. Qualquer insert/update/upsert/
// delete fora da lista estoura erro antes de sair daqui — festas, pré-reservas,
// contratos, pagamentos e financeiro ficam fora do alcance dela, nem por engano.
//
// Segunda camada, no banco: o cliente da IA manda o cabeçalho
// "x-celebrei-actor: ai-agent", e o gatilho block_ai_agent_writes (migration
// 20261006120000) recusa alterações vindas dele nas tabelas de festas e
// financeiro.

// deno-lint-ignore-file no-explicit-any

export const AI_ACTOR_HEADER = "x-celebrei-actor";
export const AI_ACTOR = "ai-agent";

// O que a IA pode alterar: conversa/mensagens, lead (status e dados), histórico
// do lead, visitas, avisos no sininho, o registro de consumo dela e o link
// curto do cadastro de candidatos que ela manda para quem quer trabalhar.
export const AI_WRITABLE_TABLES = new Set([
  "wapi_conversations",
  "wapi_messages",
  "campaign_leads",
  "lead_history",
  "lead_visits",
  "notifications",
  "ai_agent_usage",
  "freelancer_invites",
  "visit_confirmation_history", // marcar que o cliente respondeu a confirmação da visita
]);

// Funções do banco que ela pode chamar (todas só de leitura)
export const AI_ALLOWED_RPCS = new Set(["get_company_notification_targets"]);

const WRITE_METHODS = new Set(["insert", "update", "upsert", "delete"]);

export class AiWriteBlockedError extends Error {
  constructor(what: string) {
    super(`IA (beta) sem permissão para alterar ${what}`);
    this.name = "AiWriteBlockedError";
  }
}

const bindAll = (target: any, prop: PropertyKey) => {
  const value = target[prop];
  return typeof value === "function" ? value.bind(target) : value;
};

/** Embrulha o cliente do Supabase com a trava de escrita da IA */
export function guardAiDb<T>(db: T): T {
  if (!db || (db as any).__aiGuarded) return db;
  return new Proxy(db as any, {
    get(target, prop) {
      if (prop === "__aiGuarded") return true;
      if (prop === "from") {
        return (table: string) => {
          const builder = target.from(table);
          if (AI_WRITABLE_TABLES.has(table)) return builder;
          return new Proxy(builder, {
            get(b, p) {
              if (typeof p === "string" && WRITE_METHODS.has(p)) {
                return () => {
                  console.error(`[AI Guard] Bloqueado: ${p} em ${table}`);
                  throw new AiWriteBlockedError(table);
                };
              }
              return bindAll(b, p);
            },
          });
        };
      }
      if (prop === "rpc") {
        return (fn: string, ...args: unknown[]) => {
          if (!AI_ALLOWED_RPCS.has(fn)) {
            console.error(`[AI Guard] Bloqueado: rpc ${fn}`);
            throw new AiWriteBlockedError(`a função ${fn}`);
          }
          return target.rpc(fn, ...args);
        };
      }
      if (prop === "storage" || prop === "functions") {
        throw new AiWriteBlockedError(String(prop));
      }
      return bindAll(target, prop);
    },
  }) as T;
}
