// Onde a jornada da Bia vale (Configurar IA → Follow-up): empresas com o
// módulo IA Conversacional, no número da IA, com o acompanhamento ligado.
// Sem dependência de modelo de IA — usado também pela reativação fixa para
// não mandar mensagem por cima da Bia.

import { isAiConversationalEnabled } from "./ai-module.ts";
import { aiUnitFor } from "./ai-units.ts";
import { type AiFollowUpConfig, normalizeFollowUpConfig, partyReference } from "./ai-followup.ts";
import { phoneVariantsBR } from "./ai-site-lead.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;


export interface AiTarget {
  settings: Json;
  instance: Json;
  companyName: string;
}

/** Instâncias (números) em que a Bia atende: empresa com o módulo ligado e IA ativa naquele número */
export async function loadAiJourneyTargets(supabase: Db, companyId?: string): Promise<AiTarget[]> {
  let q = supabase.from("ai_agent_settings").select("*").eq("enabled", true);
  if (companyId) q = q.eq("company_id", companyId);
  const { data: allSettings, error } = await q;
  // Erro de leitura: quem chama decide (sem silêncio que vire mensagem dupla)
  if (error) throw new Error(`ai_agent_settings: ${error.message}`);
  const out: AiTarget[] = [];
  for (const s of (allSettings || []) as Json[]) {
    if (!s.unit) continue;
    const { data: company, error: cErr } = await supabase.from("companies").select("name, settings").eq("id", s.company_id).maybeSingle();
    if (cErr) throw new Error(`companies: ${cErr.message}`);
    if (!isAiConversationalEnabled(company?.settings)) continue;
    const { data: instances, error: iErr } = await supabase.from("wapi_instances")
      .select("id, instance_id, instance_token, company_id, unit, provider, client_token")
      .eq("company_id", s.company_id);
    if (iErr) throw new Error(`wapi_instances: ${iErr.message}`);
    for (const inst of (instances || []) as Json[]) {
      if (aiUnitFor(s, inst.unit as string)) out.push({ settings: s, instance: inst, companyName: String(company?.name || "buffet") });
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
 * Conversas (desta empresa) em que o lembrete antes da festa é da Bia: com a
 * Bia atendendo, coberta pela jornada, com os lembretes ligados e ainda sendo
 * acompanhada (ativa nos últimos 100 dias ou com lembrete agendado). A
 * reativação fixa pula SÓ essas conversas. Empresa sem a jornada = vazio.
 */
export async function biaReminderConversationIds(supabase: Db, companyId: string, leadIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (leadIds.length === 0) return out;
  let targets: AiTarget[];
  try {
    targets = await loadAiJourneyTargets(supabase, companyId);
  } catch (err) {
    // Erro de leitura: só trava (quem chama pula a rodada) se a empresa tem a Bia;
    // as outras seguem a reativação fixa normalmente
    const { data: company, error } = await supabase.from("companies").select("settings").eq("id", companyId).maybeSingle();
    if (!error && !isAiConversationalEnabled(company?.settings)) return out;
    throw err;
  }
  const scopes = journeyScopes(targets);
  const withReminders = [...scopes.entries()].filter(([, sc]) => sc.cfg.reactivation.enabled);
  if (withReminders.length === 0) return out;
  const activeSince = Date.now() - 100 * 86400000;
  for (let i = 0; i < leadIds.length; i += 100) {
    const { data, error } = await supabase.from("wapi_conversations")
      .select("id, instance_id, remote_jid, last_message_at, bot_data, ai_journey_next_at")
      .in("lead_id", leadIds.slice(i, i + 100))
      .in("instance_id", withReminders.map(([id]) => id))
      .eq("bot_step", "ai_agent")
      .eq("bot_enabled", true)
      .eq("bot_data->>ai_agent", "on");
    if (error) throw new Error(`conversas da Bia: ${error.message}`);
    for (const c of (data || []) as Json[]) {
      const scope = scopes.get(String(c.instance_id));
      if (!scope || !journeyCovers(scope, String(c.remote_jid))) continue;
      const last = Date.parse(String(c.last_message_at || ""));
      if (!(last >= Date.parse(scope.cfg.since as string))) continue;
      // Lembrete da Bia já agendado: é dela
      if (c.ai_journey_next_at) {
        out.add(String(c.id));
        continue;
      }
      // Ainda nas etapas e com data/mês da festa (a Bia vai agendar o lembrete): é dela.
      // Sem data/mês na conversa da Bia, ou etapas já encerradas sem lembrete: fica com a reativação fixa
      const bd = (c.bot_data || {}) as Json;
      const lastStepMs = Math.max(0, ...scope.cfg.steps.map((st) => st.delay_hours)) * 3600000;
      const ref = partyReference(bd.data_festa, bd.mes, new Date(last - 3 * 3600000).toISOString().slice(0, 10));
      if (ref && last >= Math.max(activeSince, Date.now() - lastStepMs - 15 * 86400000)) out.add(String(c.id));
    }
  }
  return out;
}
