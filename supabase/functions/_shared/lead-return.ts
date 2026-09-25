// Retorno de lead pelo WhatsApp.
//
// Quando alguém que já é lead volta a escrever depois de um bom tempo parado,
// ele "retornou": sobe para o topo do CRM, ganha a etiqueta "Retornou · Nª vez"
// e a sequência de follow-ups pode recomeçar para essa nova tentativa.
//
// Regra (vale para todos os bufês):
// - "Bom tempo parado" depende do follow-up de cada bufê: fim da sequência de
//   follow-ups (+ o prazo do "perdido automático", se ligado) + 7 dias de
//   tolerância, com mínimo de 15 dias. Se o bufê tem números com configurações
//   diferentes, vale a mais longa. É contado a partir da última mensagem do
//   CLIENTE (ou da chegada/último retorno do lead, o que for mais recente).
// - Lead marcado como Perdido por alguém da equipe que volta a escrever
//   retornou na hora. O perdido automático sozinho não conta: segue a regra
//   do tempo.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

const HOUR = 60 * 60 * 1000;
export const RETURN_TOLERANCE_HOURS = 7 * 24;
export const RETURN_MIN_HOURS = 15 * 24;

export const WHATSAPP_RETURN_ACTION = 'Lead retornou pelo WhatsApp';
export const LP_RETURN_ACTION = 'Lead retornou pela Landing Page';
const AUTO_LOST_ACTION = 'Lead movido para perdido automaticamente';

export interface FollowUpTimingSettings {
  follow_up_enabled?: boolean | null;
  follow_up_delay_hours?: number | null;
  follow_up_2_enabled?: boolean | null;
  follow_up_2_delay_hours?: number | null;
  follow_up_3_enabled?: boolean | null;
  follow_up_3_delay_hours?: number | null;
  follow_up_4_enabled?: boolean | null;
  follow_up_4_delay_hours?: number | null;
  auto_lost_enabled?: boolean | null;
  auto_lost_delay_hours?: number | null;
}

/**
 * Horas sem o cliente escrever para a nova mensagem contar como retorno.
 * Cada follow-up conta a partir do anterior, então a sequência dura a soma dos
 * prazos ligados.
 */
export function returnWindowHours(settings: FollowUpTimingSettings[]): number {
  let longest = 0;
  for (const s of settings) {
    let total = 0;
    if (s.follow_up_enabled) total += Number(s.follow_up_delay_hours) || 24;
    if (s.follow_up_2_enabled) total += Number(s.follow_up_2_delay_hours) || 48;
    if (s.follow_up_3_enabled) total += Number(s.follow_up_3_delay_hours) || 72;
    if (s.follow_up_4_enabled) total += Number(s.follow_up_4_delay_hours) || 96;
    if (s.auto_lost_enabled) total += Number(s.auto_lost_delay_hours) || 48;
    longest = Math.max(longest, total);
  }
  return Math.max(RETURN_MIN_HOURS, longest + RETURN_TOLERANCE_HOURS);
}

export interface ReturnDecisionInput {
  now: Date;
  windowHours: number;
  status: string | null;
  /** Última mensagem do cliente antes desta (qualquer conversa do lead). */
  lastClientMessageAt: string | null;
  /** Chegada do lead ou último retorno, o que for mais recente. */
  leadLastEntryAt: string | null;
  lastReturnAt: string | null;
  /** Quando a equipe marcou Perdido por último (null se nunca). */
  manualLostAt: string | null;
  /** Quando o sistema marcou Perdido automaticamente por último (null se nunca). */
  autoLostAt: string | null;
}

export type ReturnReason = 'perdido_manual' | 'tempo';

export function decideWhatsAppReturn(input: ReturnDecisionInput): ReturnReason | null {
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);

  if (input.status === 'perdido' && input.manualLostAt) {
    const manual = t(input.manualLostAt);
    const auto = t(input.autoLostAt);
    const lastReturn = t(input.lastReturnAt);
    const manualIsLatest = Number.isNaN(auto) || manual >= auto;
    const notYetCounted = Number.isNaN(lastReturn) || manual > lastReturn;
    if (manualIsLatest && notYetCounted) return 'perdido_manual';
  }

  const refs = [t(input.lastClientMessageAt), t(input.leadLastEntryAt)].filter((n) => !Number.isNaN(n));
  if (refs.length === 0) return null;
  const quietHours = (input.now.getTime() - Math.max(...refs)) / HOUR;
  return quietHours >= input.windowHours ? 'tempo' : null;
}

// Cache por execução da função: as configurações mudam pouco.
const windowCache = new Map<string, { hours: number; at: number }>();
const WINDOW_CACHE_MS = 10 * 60 * 1000;

async function companyReturnWindowHours(supabase: SupabaseLike, companyId: string): Promise<number> {
  const cached = windowCache.get(companyId);
  if (cached && Date.now() - cached.at < WINDOW_CACHE_MS) return cached.hours;
  const { data } = await supabase
    .from('wapi_bot_settings')
    .select('follow_up_enabled, follow_up_delay_hours, follow_up_2_enabled, follow_up_2_delay_hours, follow_up_3_enabled, follow_up_3_delay_hours, follow_up_4_enabled, follow_up_4_delay_hours, auto_lost_enabled, auto_lost_delay_hours')
    .eq('company_id', companyId);
  const hours = returnWindowHours(data || []);
  windowCache.set(companyId, { hours, at: Date.now() });
  return hours;
}

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
};

/**
 * Verifica se a mensagem do cliente é um retorno e, se for, registra no lead.
 * `messageAt` é o horário da mensagem que acabou de chegar: só mensagens
 * anteriores a ela contam como "última mensagem do cliente".
 * Nunca lança erro: falhar aqui não pode atrapalhar o recebimento da mensagem.
 */
export async function detectWhatsAppReturn(
  supabase: SupabaseLike,
  params: { companyId: string; leadId: string; messageAt: string },
): Promise<{ returned: boolean; reason?: ReturnReason; returnCount?: number }> {
  try {
    const { companyId, leadId, messageAt } = params;
    const { data: lead } = await supabase
      .from('campaign_leads')
      .select('id, status, created_at, last_return_at, return_count')
      .eq('id', leadId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!lead) return { returned: false };

    const leadLastEntryAt = [lead.created_at, lead.last_return_at]
      .filter(Boolean)
      .reduce((a: string | null, b: string) => (!a || b > a ? b : a), null);
    const windowHours = await companyReturnWindowHours(supabase, companyId);

    // Atalho: lead que chegou/voltou há pouco e não está Perdido não tem como
    // ser retorno. Evita consultar as mensagens a cada mensagem recebida.
    if (lead.status !== 'perdido' && leadLastEntryAt &&
        (new Date(messageAt).getTime() - new Date(leadLastEntryAt).getTime()) / HOUR < windowHours) {
      return { returned: false };
    }

    const { data: convs } = await supabase
      .from('wapi_conversations')
      .select('id')
      .eq('lead_id', leadId);
    const convIds = (convs || []).map((c: { id: string }) => c.id);

    let lastClientMessageAt: string | null = null;
    if (convIds.length > 0) {
      const { data: lastMsg } = await supabase
        .from('wapi_messages')
        .select('timestamp')
        .in('conversation_id', convIds)
        .eq('from_me', false)
        .lt('timestamp', messageAt)
        .order('timestamp', { ascending: false })
        .limit(1);
      lastClientMessageAt = lastMsg?.[0]?.timestamp ?? null;
    }

    let manualLostAt: string | null = null;
    let autoLostAt: string | null = null;
    if (lead.status === 'perdido') {
      const [manualRes, autoRes] = await Promise.all([
        supabase.from('lead_history').select('created_at')
          .eq('lead_id', leadId).eq('action', 'Alteração de status').ilike('new_value', 'perdido')
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('lead_history').select('created_at')
          .eq('lead_id', leadId).eq('action', AUTO_LOST_ACTION)
          .order('created_at', { ascending: false }).limit(1),
      ]);
      manualLostAt = manualRes.data?.[0]?.created_at ?? null;
      autoLostAt = autoRes.data?.[0]?.created_at ?? null;
    }

    const reason = decideWhatsAppReturn({
      now: new Date(messageAt),
      windowHours,
      status: lead.status,
      lastClientMessageAt,
      leadLastEntryAt,
      lastReturnAt: lead.last_return_at,
      manualLostAt,
      autoLostAt,
    });
    if (!reason) return { returned: false };

    // Retornos antigos pela LP só existiam no histórico
    const { count: pastLpReturns } = await supabase
      .from('lead_history')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', leadId)
      .eq('action', LP_RETURN_ACTION);
    const returnCount = Math.max(Number(lead.return_count) || 0, pastLpReturns || 0) + 1;

    // Condicional: se o cliente mandou várias mensagens seguidas, só a primeira conta.
    const now = new Date().toISOString();
    let update = supabase
      .from('campaign_leads')
      .update({ last_return_at: now, return_count: returnCount })
      .eq('id', leadId);
    update = lead.last_return_at
      ? update.eq('last_return_at', lead.last_return_at)
      : update.is('last_return_at', null);
    const { data: updated, error } = await update.select('id');
    if (error) {
      console.error('[lead-return] Falha ao registrar retorno:', error.message);
      return { returned: false };
    }
    if (!updated || updated.length === 0) return { returned: false };

    const detail = reason === 'perdido_manual'
      ? 'Voltou a escrever depois de ser marcado como Perdido'
      : lastClientMessageAt
        ? `Voltou a escrever depois de um tempo parado (última mensagem dele em ${fmtDate(lastClientMessageAt)})`
        : `Primeira mensagem no WhatsApp depois de um tempo parado (lead desde ${fmtDate(lead.created_at)})`;
    await supabase.from('lead_history').insert({
      lead_id: leadId,
      company_id: companyId,
      user_id: null,
      user_name: 'Sistema',
      action: WHATSAPP_RETURN_ACTION,
      old_value: `Status atual: ${lead.status}`,
      new_value: `${returnCount + 1}ª vez | ${detail}`,
    });

    console.log(`[lead-return] 🔄 Lead ${leadId} retornou pelo WhatsApp (${reason}, ${returnCount + 1}ª vez)`);
    return { returned: true, reason, returnCount };
  } catch (err) {
    console.error('[lead-return] Erro ao verificar retorno:', err);
    return { returned: false };
  }
}

/**
 * Leads com o registro no histórico feito DEPOIS do último retorno.
 * Depois que o lead volta, a sequência de follow-ups recomeça: os follow-ups
 * (e o perdido automático) da tentativa anterior deixam de contar.
 */
export function leadsWithActionSinceReturn(
  rows: { lead_id: string; created_at: string }[],
  lastReturnByLead: Map<string, string>,
): Set<string> {
  const out = new Set<string>();
  for (const r of rows) {
    const ret = lastReturnByLead.get(r.lead_id);
    if (!ret || new Date(r.created_at).getTime() > new Date(ret).getTime()) out.add(r.lead_id);
  }
  return out;
}

/** Último retorno de cada lead (só dos que já voltaram). */
export async function fetchLastReturns(
  supabase: SupabaseLike,
  leadIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (let i = 0; i < leadIds.length; i += 100) {
    const { data, error } = await supabase
      .from('campaign_leads')
      .select('id, last_return_at')
      .in('id', leadIds.slice(i, i + 100))
      .not('last_return_at', 'is', null);
    if (error) {
      // Coluna ainda não existe: comportamento antigo (sem recomeço)
      console.error('[lead-return] Falha ao buscar retornos:', error.message);
      return map;
    }
    for (const row of data || []) map.set(row.id, row.last_return_at);
  }
  return map;
}
