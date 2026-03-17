/**
 * CELEBREI — Central Variable Resolver (v1.0)
 *
 * Unified template variable interpolation for the entire platform.
 * This module is NEW and ADDITIVE — it does NOT replace any existing
 * interpolation logic. Legacy modules continue working as before.
 *
 * Usage:
 *   import { resolveSystemVariables } from '@/lib/template-resolver';
 *   const result = resolveSystemVariables(template, { lead, company });
 *
 * Supported formats (all treated as equivalent):
 *   {variable}   {{variable}}   {{ variable }}
 *
 * Case-insensitive by default.
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
    valor_sinal?: string | null;
    valor_restante?: string | null;
    forma_pagamento?: string | null;
    parcelas?: string | null;
    brindes?: string | null;
    observacoes_comerciais?: string | null;
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
  /** Arbitrary key-value pairs for ad-hoc variables */
  custom?: Record<string, string>;
}

export interface ResolverOptions {
  /** Default: false (case-insensitive) */
  caseSensitive?: boolean;
  /** Log unresolved variables to console. Default: false */
  warnUnresolved?: boolean;
  /** Fallback string for variables not found in catalog or context. Default: undefined (leave as-is) */
  fallbackForUnknown?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the first name from a full name string */
export function resolveFirstName(name: string | null | undefined): string {
  if (!name || !name.trim()) return '';
  return name.trim().split(/\s+/)[0];
}

/** Escape special regex characters in a string */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Variable Catalog
// ---------------------------------------------------------------------------

type VariableResolver = (ctx: VariableContext) => string;

interface CatalogEntry {
  resolver: VariableResolver;
}

/**
 * Central catalog of all platform variables.
 * Each entry maps a canonical key to a resolver function.
 * Aliases are defined separately and point to canonical keys.
 */
const VARIABLE_CATALOG: Record<string, CatalogEntry> = {
  // --- Lead ---
  nome: {
    resolver: (ctx) => resolveFirstName(ctx.lead?.name) || 'cliente',
  },
  primeiro_nome: {
    resolver: (ctx) => resolveFirstName(ctx.lead?.name) || 'cliente',
  },
  nome_completo: {
    resolver: (ctx) => ctx.lead?.name?.trim() || 'cliente',
  },
  telefone: {
    resolver: (ctx) => ctx.lead?.whatsapp || '',
  },
  mes: {
    resolver: (ctx) => ctx.lead?.month || '',
  },
  convidados: {
    resolver: (ctx) => ctx.lead?.guests || ctx.event?.guest_count?.toString() || '',
  },
  unidade: {
    resolver: (ctx) => ctx.lead?.unit || ctx.event?.unit || 'nossa unidade',
  },
  dia: {
    resolver: (ctx) => ctx.lead?.day_preference || '',
  },
  campanha: {
    resolver: (ctx) => ctx.lead?.campaign_name || '',
  },
  child_name: {
    resolver: (ctx) => ctx.lead?.child_name || '',
  },
  child_age: {
    resolver: (ctx) => ctx.lead?.child_age || '',
  },
  customer_name: {
    resolver: (ctx) => ctx.lead?.name?.trim() || '',
  },

  // --- Company ---
  empresa: {
    resolver: (ctx) => ctx.company?.name || 'nosso buffet',
  },

  // --- Visit ---
  data_visita: {
    resolver: (ctx) => ctx.visit?.date || '',
  },
  hora_visita: {
    resolver: (ctx) => ctx.visit?.time || 'horário a confirmar',
  },

  // --- Event ---
  data_evento: {
    resolver: (ctx) => ctx.event?.date || '',
  },
  hora_evento: {
    resolver: (ctx) => ctx.event?.time || '',
  },
  pacote: {
    resolver: (ctx) => ctx.event?.package_name || '',
  },
  valor: {
    resolver: (ctx) =>
      ctx.contract?.value || (ctx.event?.value != null ? `R$ ${ctx.event.value.toLocaleString('pt-BR')}` : ''),
  },

  // --- Contract ---
  nome_responsavel: {
    resolver: (ctx) => ctx.contract?.responsible_name || ctx.lead?.name?.trim() || '',
  },
  cpf: {
    resolver: (ctx) => ctx.contract?.cpf || '',
  },
  rg: {
    resolver: (ctx) => ctx.contract?.rg || '',
  },
  email: {
    resolver: (ctx) => ctx.contract?.email || '',
  },
  endereco: {
    resolver: (ctx) => ctx.contract?.address || '',
  },
  numero: {
    resolver: (ctx) => ctx.contract?.numero || '',
  },
  complemento: {
    resolver: (ctx) => ctx.contract?.complemento || '',
  },
  bairro: {
    resolver: (ctx) => ctx.contract?.bairro || '',
  },
  cidade: {
    resolver: (ctx) => ctx.contract?.cidade || '',
  },
  cep: {
    resolver: (ctx) => ctx.contract?.cep || '',
  },
  data_contrato: {
    resolver: (ctx) => ctx.contract?.date || '',
  },
  valor_contrato: {
    resolver: (ctx) => ctx.contract?.value || '',
  },
  valor_total: {
    resolver: (ctx) => ctx.contract?.value || (ctx.event?.value != null ? `R$ ${ctx.event.value.toLocaleString('pt-BR')}` : ''),
  },
  valor_sinal: {
    resolver: (ctx) => ctx.contract?.valor_sinal || '',
  },
  valor_restante: {
    resolver: (ctx) => ctx.contract?.valor_restante || '',
  },
  forma_pagamento: {
    resolver: (ctx) => ctx.contract?.forma_pagamento || '',
  },
  nome_aniversariante: {
    resolver: (ctx) => ctx.contract?.nome_aniversariante || ctx.lead?.child_name || '',
  },
  idade_aniversariante: {
    resolver: (ctx) => ctx.contract?.idade_aniversariante || ctx.lead?.child_age || '',
  },
  data_nascimento: {
    resolver: (ctx) => ctx.contract?.data_nascimento || '',
  },
  nomes_pais: {
    resolver: (ctx) => ctx.contract?.nomes_pais || '',
  },
  brindes: {
    resolver: (ctx) => ctx.contract?.brindes || '',
  },
  hora_inicio: {
    resolver: (ctx) => ctx.event?.time || '',
  },
  hora_fim: {
    resolver: (ctx) => ctx.event?.end_time || '',
  },
  tipo_festa: {
    resolver: (ctx) => ctx.event?.event_type || '',
  },

  // --- Freelancer / Schedule ---
  titulo: {
    resolver: (ctx) => ctx.schedule?.title || '',
  },
  periodo: {
    resolver: (ctx) => ctx.schedule?.period || '',
  },
  qtd_festas: {
    resolver: (ctx) => ctx.schedule?.event_count?.toString() || '',
  },
  link: {
    resolver: (ctx) => ctx.schedule?.link || '',
  },
  observacoes: {
    resolver: (ctx) => ctx.schedule?.notes || '',
  },
  lista_escalados: {
    resolver: (ctx) => ctx.schedule?.assigned_list || '',
  },
};

/**
 * Aliases map: alias → canonical key.
 * All lookups are done in lowercase.
 */
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
  // Contract aliases
  parcelas: 'forma_pagamento',
  observacoes_contrato: 'observacoes',
};

// ---------------------------------------------------------------------------
// Core Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve all template variables in a string using the central catalog.
 *
 * @param template  The template string containing variables like {nome} or {{empresa}}
 * @param context   Data context from which variable values are derived
 * @param options   Optional configuration (case sensitivity, warnings, etc.)
 * @returns         The interpolated string
 */
export function resolveSystemVariables(
  template: string,
  context: VariableContext = {},
  options: ResolverOptions = {},
): string {
  const { caseSensitive = false, warnUnresolved = false, fallbackForUnknown } = options;

  if (!template) return template;

  // Regex matches {key}, {{key}}, {{ key }} (with optional spaces)
  // Captures the inner key name, trimmed of whitespace
  const varPattern = /\{\{?\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*\}?\}/g;

  const unresolvedKeys: string[] = [];

  const result = template.replace(varPattern, (match, rawKey: string) => {
    const lookupKey = caseSensitive ? rawKey : rawKey.toLowerCase();

    // 1. Check custom context first (highest priority)
    if (context.custom) {
      const customVal = caseSensitive
        ? context.custom[lookupKey]
        : Object.entries(context.custom).find(
            ([k]) => k.toLowerCase() === lookupKey,
          )?.[1];
      if (customVal !== undefined) return customVal;
    }

    // 2. Resolve alias → canonical key
    const canonicalKey = ALIAS_MAP[lookupKey] || lookupKey;

    // 3. Look up in catalog
    const entry = VARIABLE_CATALOG[canonicalKey];
    if (entry) {
      const resolved = entry.resolver(context);
      // If resolver returned empty string and there's no explicit fallback, still return empty
      return resolved;
    }

    // 4. Not found
    if (fallbackForUnknown !== undefined) {
      return fallbackForUnknown;
    }

    unresolvedKeys.push(rawKey);
    return match; // leave original placeholder intact
  });

  if (warnUnresolved && unresolvedKeys.length > 0) {
    console.warn(
      `[template-resolver] Unresolved variables: ${unresolvedKeys.join(', ')}`,
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utility: list available variables for a given context shape
// ---------------------------------------------------------------------------

/**
 * Returns a list of variable keys available in the catalog,
 * grouped by domain. Useful for building UI autocomplete or docs.
 */
export function getAvailableVariables(): {
  key: string;
  aliases: string[];
  domain: string;
}[] {
  const domainMap: Record<string, string> = {
    nome: 'lead', primeiro_nome: 'lead', nome_completo: 'lead',
    telefone: 'lead', mes: 'lead', convidados: 'lead', unidade: 'lead',
    dia: 'lead', campanha: 'lead', child_name: 'lead', child_age: 'lead',
    customer_name: 'lead',
    empresa: 'company',
    data_visita: 'visit', hora_visita: 'visit',
    data_evento: 'event', hora_evento: 'event', hora_inicio: 'event', hora_fim: 'event',
    pacote: 'event', valor: 'event', tipo_festa: 'event',
    nome_responsavel: 'contract', cpf: 'contract', rg: 'contract', email: 'contract',
    endereco: 'contract', numero: 'contract', complemento: 'contract',
    bairro: 'contract', cidade: 'contract', cep: 'contract',
    data_contrato: 'contract', valor_contrato: 'contract', valor_total: 'contract',
    valor_sinal: 'contract', valor_restante: 'contract', forma_pagamento: 'contract',
    nome_aniversariante: 'contract', idade_aniversariante: 'contract',
    data_nascimento: 'contract', nomes_pais: 'contract', brindes: 'contract',
    titulo: 'schedule', periodo: 'schedule', qtd_festas: 'schedule',
    link: 'schedule', observacoes: 'schedule', lista_escalados: 'schedule',
  };

  // Invert alias map to find aliases per canonical key
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
