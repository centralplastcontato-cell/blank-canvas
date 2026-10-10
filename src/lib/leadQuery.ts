// Filtros da aba Leads numa regra só (lista, CRM, números e exportação).
// Antes cada lugar repetia os filtros, a busca quebrava com vírgula/parênteses e o
// filtro "Visitas agendadas" só valia para os 20 da página.
import { format } from "date-fns";
import type { LeadFilters } from "@/types/crm";

/** O que a consulta precisa ter (o construtor do Supabase tem tudo isso) */
export interface LeadFilterBuilder<T> {
  eq(column: string, value: unknown): T;
  in(column: string, values: readonly unknown[]): T;
  is(column: string, value: null): T;
  gte(column: string, value: unknown): T;
  lte(column: string, value: unknown): T;
  or(filters: string): T;
}

type AnyLeadFilterBuilder = LeadFilterBuilder<AnyLeadFilterBuilder>;

export interface LeadScope {
  canViewAll: boolean;
  allowedUnits: string[];
  filters: LeadFilters;
}

/** Quem é restrito e não tem unidade nenhuma não vê lead nenhum */
export function leadScopeIsEmpty(scope: LeadScope): boolean {
  return !scope.canViewAll && !scope.allowedUnits.includes("all") && scope.allowedUnits.length === 0;
}

/** Valor seguro dentro de um filtro "or" do PostgREST (entre aspas) */
function quoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Busca por nome ou WhatsApp. Aceita vírgula, parênteses e aspas; com 4+ dígitos
 * também procura só os números no WhatsApp ("(11) 98765-4321" acha "5511987654321").
 */
export function leadSearchOr(search: string): string | null {
  const term = search.trim();
  if (!term) return null;
  const like = quoted(`%${term}%`);
  const parts = [`name.ilike.${like}`, `whatsapp.ilike.${like}`];
  const digits = term.replace(/\D/g, "");
  if (digits.length >= 4 && digits !== term) parts.push(`whatsapp.ilike.${quoted(`%${digits}%`)}`);
  return parts.join(",");
}

/** Colunas da consulta: com "Visitas agendadas" só entra lead com conversa marcada */
export function leadSelect(base: string, filters: Pick<LeadFilters, "hasScheduledVisit">): string {
  return filters.hasScheduledVisit ? `${base}, wapi_conversations!inner(id)` : base;
}

/**
 * Aplica permissão de unidade e os filtros da tela. Quem chama confere antes
 * leadScopeIsEmpty (sem unidade nenhuma, a resposta é vazia).
 */
export function applyLeadFilters<T>(query: T, scope: LeadScope, opts: { ignoreStatus?: boolean; ignorePeriod?: boolean } = {}): T {
  const { filters } = scope;
  // O construtor do Supabase tem esses métodos; o tipo dele é pesado demais para o TypeScript
  let q = query as unknown as AnyLeadFilterBuilder;
  if (!scope.canViewAll && !scope.allowedUnits.includes("all")) {
    q = q.in("unit", [...scope.allowedUnits, "As duas"]);
  }
  if (filters.unit && filters.unit !== "all") q = q.eq("unit", filters.unit);
  if (filters.campaign && filters.campaign !== "all") q = q.eq("campaign_id", filters.campaign);
  if (!opts.ignoreStatus && filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.responsavel && filters.responsavel !== "all") {
    q = filters.responsavel === "unassigned" ? q.is("responsavel_id", null) : q.eq("responsavel_id", filters.responsavel);
  }
  if (filters.month && filters.month !== "all") q = q.eq("month", filters.month);
  // Período pela entrada mais recente: "Hoje" mostra quem chegou e quem voltou hoje
  if (!opts.ignorePeriod && filters.startDate) q = q.gte("last_entry_at", filters.startDate.toISOString());
  if (!opts.ignorePeriod && filters.endDate) {
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    q = q.lte("last_entry_at", endOfDay.toISOString());
  }
  const search = leadSearchOr(filters.search || "");
  if (search) q = q.or(search);
  if (filters.hasScheduledVisit) q = q.eq("wapi_conversations.has_scheduled_visit", true);
  return q as unknown as T;
}

/** Data do filtro no formato do banco, no dia local (antes usava o dia em UTC) */
export const filterDay = (d: Date) => format(d, "yyyy-MM-dd");
