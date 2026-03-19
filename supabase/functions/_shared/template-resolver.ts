/**
 * CELEBREI — Central Variable Resolver (Edge Functions version) v1.0
 *
 * Mirror of src/lib/template-resolver.ts for use in Supabase Edge Functions.
 * This is NEW and ADDITIVE — it does NOT replace any existing interpolation.
 *
 * Usage in Edge Functions:
 *   import { resolveSystemVariables } from '../_shared/template-resolver.ts';
 *   const result = resolveSystemVariables(template, { lead, company });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VariableContext {
  lead?: {
    name?: string | null;
    whatsapp?: string | null;
    month?: string | null;
    guests?: string | null;
    unit?: string | null;
    day_preference?: string | null;
    campaign_name?: string | null;
    child_name?: string | null;
    child_age?: string | null;
  };
  company?: {
    name?: string | null;
  };
  visit?: {
    date?: string | null;
    time?: string | null;
    status?: string | null;
  };
  event?: {
    date?: string | null;
    time?: string | null;
    end_time?: string | null;
    package_name?: string | null;
    value?: number | null;
    guest_count?: number | null;
    unit?: string | null;
    event_type?: string | null;
  };
  contract?: {
    value?: string | null;
    date?: string | null;
    responsible_name?: string | null;
    cpf?: string | null;
    rg?: string | null;
    email?: string | null;
    address?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    cep?: string | null;
    nome_aniversariante?: string | null;
    idade_aniversariante?: string | null;
    data_nascimento?: string | null;
    nomes_pais?: string | null;
    telefone_pais?: string | null;
    celular?: string | null;
    valor_sinal?: string | null;
    valor_restante?: string | null;
    forma_pagamento?: string | null;
    parcelas?: string | null;
    brindes?: string | null;
    descricao?: string | null;
    observacoes_comerciais?: string | null;
    tema?: string | null;
    valor_convidado_adicional?: string | null;
    quantidade_pessoas?: string | null;
  };
  freelancer?: {
    name?: string | null;
    role?: string | null;
  };
  schedule?: {
    title?: string | null;
    period?: string | null;
    event_count?: number | null;
    link?: string | null;
    notes?: string | null;
    assigned_list?: string | null;
  };
  custom?: Record<string, string>;
}

export interface ResolverOptions {
  caseSensitive?: boolean;
  warnUnresolved?: boolean;
  fallbackForUnknown?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function resolveFirstName(name: string | null | undefined): string {
  if (!name || !name.trim()) return '';
  return name.trim().split(/\s+/)[0];
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

type VariableResolver = (ctx: VariableContext) => string;

const VARIABLE_CATALOG: Record<string, { resolver: VariableResolver }> = {
  nome: { resolver: (ctx) => resolveFirstName(ctx.lead?.name) || 'cliente' },
  primeiro_nome: { resolver: (ctx) => resolveFirstName(ctx.lead?.name) || 'cliente' },
  nome_completo: { resolver: (ctx) => ctx.lead?.name?.trim() || 'cliente' },
  telefone: { resolver: (ctx) => ctx.lead?.whatsapp || '' },
  mes: { resolver: (ctx) => ctx.lead?.month || '' },
  convidados: { resolver: (ctx) => ctx.lead?.guests || ctx.event?.guest_count?.toString() || '' },
  unidade: { resolver: (ctx) => ctx.lead?.unit || ctx.event?.unit || 'nossa unidade' },
  dia: { resolver: (ctx) => ctx.lead?.day_preference || '' },
  campanha: { resolver: (ctx) => ctx.lead?.campaign_name || '' },
  child_name: { resolver: (ctx) => ctx.lead?.child_name || '' },
  child_age: { resolver: (ctx) => ctx.lead?.child_age || '' },
  customer_name: { resolver: (ctx) => ctx.lead?.name?.trim() || '' },
  empresa: { resolver: (ctx) => ctx.company?.name || 'nosso buffet' },
  data_visita: { resolver: (ctx) => ctx.visit?.date || '' },
  hora_visita: { resolver: (ctx) => ctx.visit?.time || 'horário a confirmar' },
  data_evento: { resolver: (ctx) => ctx.event?.date || '' },
  hora_evento: { resolver: (ctx) => ctx.event?.time || '' },
  pacote: { resolver: (ctx) => ctx.event?.package_name || '' },
  valor: {
    resolver: (ctx) =>
      ctx.contract?.value || (ctx.event?.value != null ? `R$ ${ctx.event.value.toLocaleString('pt-BR')}` : ''),
  },
  nome_responsavel: { resolver: (ctx) => ctx.contract?.responsible_name || '' },
  cpf: { resolver: (ctx) => ctx.contract?.cpf || '' },
  endereco: { resolver: (ctx) => ctx.contract?.address || '' },
  data_contrato: { resolver: (ctx) => ctx.contract?.date || '' },
  valor_contrato: { resolver: (ctx) => ctx.contract?.value || '' },
  titulo: { resolver: (ctx) => ctx.schedule?.title || '' },
  periodo: { resolver: (ctx) => ctx.schedule?.period || '' },
  qtd_festas: { resolver: (ctx) => ctx.schedule?.event_count?.toString() || '' },
  link: { resolver: (ctx) => ctx.schedule?.link || '' },
  observacoes: { resolver: (ctx) => ctx.schedule?.notes || '' },
  lista_escalados: { resolver: (ctx) => ctx.schedule?.assigned_list || '' },
};

const ALIAS_MAP: Record<string, string> = {
  buffet: 'empresa',
  nome_empresa: 'empresa',
  'nome-empresa': 'empresa',
  nome_buffet: 'empresa',
  'nome-buffet': 'empresa',
  event_date: 'data_evento',
  guest_count: 'convidados',
  data: 'data_evento',
  hora: 'hora_evento',
};

// ---------------------------------------------------------------------------
// Core Resolver
// ---------------------------------------------------------------------------

export function resolveSystemVariables(
  template: string,
  context: VariableContext = {},
  options: ResolverOptions = {},
): string {
  const { caseSensitive = false, warnUnresolved = false, fallbackForUnknown } = options;

  if (!template) return template;

  const varPattern = /\{\{?\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*\}?\}/g;
  const unresolvedKeys: string[] = [];

  const result = template.replace(varPattern, (match, rawKey: string) => {
    const lookupKey = caseSensitive ? rawKey : rawKey.toLowerCase();

    // 1. Custom context (highest priority)
    if (context.custom) {
      const customVal = caseSensitive
        ? context.custom[lookupKey]
        : Object.entries(context.custom).find(([k]) => k.toLowerCase() === lookupKey)?.[1];
      if (customVal !== undefined) return customVal;
    }

    // 2. Resolve alias
    const canonicalKey = ALIAS_MAP[lookupKey] || lookupKey;

    // 3. Catalog lookup
    const entry = VARIABLE_CATALOG[canonicalKey];
    if (entry) return entry.resolver(context);

    // 4. Not found
    if (fallbackForUnknown !== undefined) return fallbackForUnknown;

    unresolvedKeys.push(rawKey);
    return match;
  });

  if (warnUnresolved && unresolvedKeys.length > 0) {
    console.warn(`[template-resolver] Unresolved variables: ${unresolvedKeys.join(', ')}`);
  }

  return result;
}

export function getAvailableVariables(): { key: string; aliases: string[]; domain: string }[] {
  const domainMap: Record<string, string> = {
    nome: 'lead', primeiro_nome: 'lead', nome_completo: 'lead',
    telefone: 'lead', mes: 'lead', convidados: 'lead', unidade: 'lead',
    dia: 'lead', campanha: 'lead', child_name: 'lead', child_age: 'lead',
    customer_name: 'lead',
    empresa: 'company',
    data_visita: 'visit', hora_visita: 'visit',
    data_evento: 'event', hora_evento: 'event', pacote: 'event', valor: 'event',
    nome_responsavel: 'contract', cpf: 'contract', endereco: 'contract',
    data_contrato: 'contract', valor_contrato: 'contract',
    titulo: 'schedule', periodo: 'schedule', qtd_festas: 'schedule',
    link: 'schedule', observacoes: 'schedule', lista_escalados: 'schedule',
  };

  const aliasesByCanonical: Record<string, string[]> = {};
  for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
    if (!aliasesByCanonical[canonical]) aliasesByCanonical[canonical] = [];
    aliasesByCanonical[canonical].push(alias);
  }

  return Object.keys(VARIABLE_CATALOG).map((key) => ({
    key,
    aliases: aliasesByCanonical[key] || [],
    domain: domainMap[key] || 'other',
  }));
}
