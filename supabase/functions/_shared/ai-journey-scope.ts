// Onde a jornada da Bia vale (Configurar IA → Follow-up): empresas com o
// módulo IA Conversacional, no número da IA, com o acompanhamento ligado.
// Sem dependência de modelo de IA — usado também pela reativação fixa para
// não mandar mensagem por cima da Bia.

import { isAiConversationalEnabled } from "./ai-module.ts";
import { type AiFollowUpConfig, normalizeFollowUpConfig } from "./ai-followup.ts";
import { phoneVariantsBR } from "./ai-site-lead.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

const norm = (s: string | null | undefined) => String(s || "").trim().toLowerCase();

export interface AiTarget {
  settings: Json;
  instance: Json;
  companyName: string;
}

/** Instâncias (números) em que a Bia atende: empresa com o módulo ligado e IA ativa naquele número */
export async function loadAiJourneyTargets(supabase: Db, companyId?: string): Promise<AiTarget[]> {
  let q = supabase.from("ai_agent_settings").select("*").eq("enabled", true);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: allSettings } = await q;
  const out: AiTarget[] = [];
  for (const s of (allSettings || []) as Json[]) {
    if (!s.unit) continue;
    const { data: company } = await supabase.from("companies").select("name, settings").eq("id", s.company_id).maybeSingle();
    if (!isAiConversationalEnabled(company?.settings)) continue;
    const { data: instances } = await supabase.from("wapi_instances")
      .select("id, instance_id, instance_token, company_id, unit, provider, client_token")
      .eq("company_id", s.company_id);
    for (const inst of (instances || []) as Json[]) {
      if (norm(inst.unit) === norm(s.unit)) out.push({ settings: s, instance: inst, companyName: String(company?.name || "buffet") });
    }
  }
  return out;
}

export interface JourneyScope {
  cfg: AiFollowUpConfig;
  testVariants: string[] | null; // Modo de Teste da IA: só o número de teste
}

/**
 * Números em que a jornada da Bia está LIGADA (Configurar IA → Follow-up).
 * Só nesses números, e só nas conversas que a jornada cobre, os follow-ups
 * fixos pulam a conversa. Desligada = tudo como antes.
 */
export function journeyScopes(targets: AiTarget[]): Map<string, JourneyScope> {
  const out = new Map<string, JourneyScope>();
  for (const t of targets) {
    const cfg = normalizeFollowUpConfig(t.settings.followup_config);
    if (!cfg.enabled) continue;
    out.set(String(t.instance.id), {
      cfg,
      testVariants: t.settings.test_mode_enabled ? phoneVariantsBR(String(t.settings.test_mode_number || "")) : null,
    });
  }
  return out;
}

/** A jornada cobre esta conversa (pelo telefone)? */
export function journeyCovers(scope: JourneyScope | undefined, remoteJid: string): boolean {
  if (!scope) return false;
  if (!scope.testVariants) return true;
  const phone = String(remoteJid || "").replace(/@.*/, "");
  return phoneVariantsBR(phone).some((v) => scope.testVariants!.includes(v));
}


/**
 * Leads (desta empresa) cuja conversa está com a Bia e coberta pela jornada:
 * o lembrete antes da festa dessas conversas é escrito pela Bia, então a
 * reativação fixa pula esses leads. Empresa sem a jornada ligada = vazio.
 */
export async function biaJourneyLeadIds(supabase: Db, companyId: string, leadIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (leadIds.length === 0) return out;
  const scopes = journeyScopes(await loadAiJourneyTargets(supabase, companyId));
  if (scopes.size === 0) return out;
  for (let i = 0; i < leadIds.length; i += 100) {
    const { data, error } = await supabase.from("wapi_conversations")
      .select("lead_id, instance_id, remote_jid")
      .in("lead_id", leadIds.slice(i, i + 100))
      .in("instance_id", [...scopes.keys()])
      .eq("bot_step", "ai_agent")
      .eq("bot_enabled", true)
      .eq("bot_data->>ai_agent", "on");
    if (error) throw new Error(`conversas da Bia: ${error.message}`);
    for (const c of (data || []) as Json[]) {
      if (journeyCovers(scopes.get(String(c.instance_id)), String(c.remote_jid))) out.add(String(c.lead_id));
    }
  }
  return out;
}
