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
// Number to Words (BRL) — inlined for edge function compatibility
// ---------------------------------------------------------------------------

const _UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const _TEENS = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const _TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const _HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function _groupToWords(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const remainder = n % 100;
  const t = Math.floor(remainder / 10);
  const u = remainder % 10;
  if (h > 0) parts.push(_HUNDREDS[h]);
  if (remainder >= 10 && remainder <= 19) { parts.push(_TEENS[remainder - 10]); }
  else { if (t > 0) parts.push(_TENS[t]); if (u > 0) parts.push(_UNITS[u]); }
  return parts.join(' e ');
}

function _intToWords(n: number): string {
  if (n === 0) return 'zero';
  const groups = [
    { value: 1_000_000_000, singular: 'um bilhão', plural: 'bilhões' },
    { value: 1_000_000, singular: 'um milhão', plural: 'milhões' },
    { value: 1_000, singular: 'mil', plural: 'mil' },
  ];
  const parts: string[] = [];
  let rem = n;
  for (const g of groups) {
    const count = Math.floor(rem / g.value);
    if (count > 0) {
      parts.push(g.value === 1_000 ? (count === 1 ? 'um mil' : `${_groupToWords(count)} mil`) : (count === 1 ? g.singular : `${_groupToWords(count)} ${g.plural}`));
      rem %= g.value;
    }
  }
  if (rem > 0) parts.push(_groupToWords(rem));
  if (parts.length <= 1) return parts[0] || 'zero';
  const last = parts.pop()!;
  return parts.join(', ') + ' e ' + last;
}

function parseBRLToNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/R\$\s*/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

function numberToWordsBRL(value: number | string | null | undefined): string {
  const num = typeof value === 'number' ? value : parseBRLToNumber(value);
  if (num == null || num < 0) return '';
  const intPart = Math.floor(num);
  const centsPart = Math.round((num - intPart) * 100);
  const parts: string[] = [];
  if (intPart > 0) parts.push(_intToWords(intPart) + (intPart === 1 ? ' real' : ' reais'));
  if (centsPart > 0) parts.push(_intToWords(centsPart) + (centsPart === 1 ? ' centavo' : ' centavos'));
  if (parts.length === 0) return 'zero reais';
  return parts.join(' e ');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Formats a Brazilian phone number for display.
 * 5515991598803 → (15) 99159-8803
 */
function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return phone;
}

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
    data_nascimento_aniversariante?: string | null;
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
    qtd_adultos?: string | null;
    qtd_criancas?: string | null;
    valor_por_adulto?: string | null;
    valor_por_crianca?: string | null;
    estado?: string | null;
    duracao_festa?: string | null;
    cardapio?: string | null;
    valor_total_extenso?: string | null;
    data_entrada?: string | null;
    data_saldo?: string | null;
    aniversariantes?: string | null;
    opcionais?: string | null;
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
  nome_completo: { resolver: (ctx) => ctx.contract?.responsible_name?.trim() || ctx.lead?.name?.trim() || 'cliente' },
  telefone: { resolver: (ctx) => formatPhoneDisplay(ctx.lead?.whatsapp) },
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
      ctx.contract?.value || (ctx.event?.value != null ? `R$ ${ctx.event.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''),
  },
  nome_responsavel: { resolver: (ctx) => ctx.contract?.responsible_name || ctx.lead?.name?.trim() || '' },
  cpf: { resolver: (ctx) => ctx.contract?.cpf || '' },
  rg: { resolver: (ctx) => ctx.contract?.rg || '' },
  email: { resolver: (ctx) => ctx.contract?.email || '' },
  endereco: { resolver: (ctx) => ctx.contract?.address || '' },
  numero: { resolver: (ctx) => ctx.contract?.numero || '' },
  complemento: { resolver: (ctx) => ctx.contract?.complemento || '' },
  bairro: { resolver: (ctx) => ctx.contract?.bairro || '' },
  cidade: { resolver: (ctx) => ctx.contract?.cidade || '' },
  cep: { resolver: (ctx) => ctx.contract?.cep || '' },
  data_contrato: { resolver: (ctx) => ctx.contract?.date || '' },
  valor_contrato: { resolver: (ctx) => ctx.contract?.value || '' },
  valor_total: { resolver: (ctx) => ctx.contract?.value || (ctx.event?.value != null ? `R$ ${ctx.event.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '') },
  valor_sinal: { resolver: (ctx) => ctx.contract?.valor_sinal || '' },
  valor_restante: { resolver: (ctx) => ctx.contract?.valor_restante || '' },
  forma_pagamento: { resolver: (ctx) => ctx.contract?.forma_pagamento || '' },
  nome_aniversariante: { resolver: (ctx) => ctx.contract?.nome_aniversariante || ctx.lead?.child_name || '' },
  idade_aniversariante: { resolver: (ctx) => ctx.contract?.idade_aniversariante || ctx.lead?.child_age || '' },
  aniversariantes: { resolver: (ctx) => ctx.contract?.aniversariantes || ctx.contract?.nome_aniversariante || ctx.lead?.child_name || '' },
  data_nascimento: { resolver: (ctx) => {
    const v = ctx.contract?.data_nascimento || '';
    if (!v) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split("-"); return `${d}/${m}/${y}`; }
    if (/^\d{8}$/.test(v)) return `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
    return v;
  }},
  nomes_pais: { resolver: (ctx) => ctx.contract?.nomes_pais || '' },
  data_nascimento_aniversariante: { resolver: (ctx) => {
    const v = ctx.contract?.data_nascimento_aniversariante || '';
    if (!v) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split("-"); return `${d}/${m}/${y}`; }
    if (/^\d{8}$/.test(v)) return `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
    return v;
  }},
  telefone_pais: { resolver: (ctx) => formatPhoneDisplay(ctx.contract?.telefone_pais) },
  cliente_celular: { resolver: (ctx) => formatPhoneDisplay(ctx.contract?.celular || ctx.lead?.whatsapp) },
  data_entrada: { resolver: (ctx) => {
    const v = ctx.contract?.data_entrada || '';
    if (!v) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split("-"); return `${d}/${m}/${y}`; }
    return v;
  }},
  data_saldo: { resolver: (ctx) => {
    const v = ctx.contract?.data_saldo || '';
    if (!v) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split("-"); return `${d}/${m}/${y}`; }
    return v;
  }},
  brindes: { resolver: (ctx) => ctx.contract?.brindes || '' },
  descricao: { resolver: (ctx) => ctx.contract?.descricao || '' },
  hora_inicio: { resolver: (ctx) => ctx.event?.time || '' },
  hora_fim: { resolver: (ctx) => ctx.event?.end_time || '' },
  tipo_festa: { resolver: (ctx) => ctx.event?.event_type || '' },
  tema: { resolver: (ctx) => ctx.contract?.tema || '' },
  valor_convidado_adicional: { resolver: (ctx) => ctx.contract?.valor_convidado_adicional || '' },
  quantidade_pessoas: { resolver: (ctx) => ctx.contract?.quantidade_pessoas || ctx.lead?.guests || ctx.event?.guest_count?.toString() || '' },
  qtd_adultos: { resolver: (ctx) => ctx.contract?.qtd_adultos || '' },
  qtd_criancas: { resolver: (ctx) => ctx.contract?.qtd_criancas || '' },
  valor_por_adulto: { resolver: (ctx) => ctx.contract?.valor_por_adulto || '' },
  valor_por_crianca: { resolver: (ctx) => ctx.contract?.valor_por_crianca || '' },
  estado: { resolver: (ctx) => ctx.contract?.estado || '' },
  duracao_festa: { resolver: (ctx) => ctx.contract?.duracao_festa || '' },
  cardapio: { resolver: (ctx) => ctx.contract?.cardapio || '' },
  valor_total_extenso: { resolver: (ctx) => {
    if (ctx.contract?.valor_total_extenso) return ctx.contract.valor_total_extenso;
    const numVal = parseBRLToNumber(ctx.contract?.value) ?? ctx.event?.value;
    return numVal != null ? numberToWordsBRL(numVal) : '';
  }},
  valor_sinal_extenso: { resolver: (ctx) => ctx.contract?.valor_sinal ? numberToWordsBRL(ctx.contract.valor_sinal) : '' },
  valor_restante_extenso: { resolver: (ctx) => ctx.contract?.valor_restante ? numberToWordsBRL(ctx.contract.valor_restante) : '' },
  valor_convidado_adicional_extenso: { resolver: (ctx) => ctx.contract?.valor_convidado_adicional ? numberToWordsBRL(ctx.contract.valor_convidado_adicional) : '' },
  opcionais: { resolver: (ctx) => ctx.contract?.opcionais || 'Nenhum opcional contratado' },
  titulo: { resolver: (ctx) => ctx.schedule?.title || '' },
  periodo: { resolver: (ctx) => ctx.schedule?.period || '' },
  qtd_festas: { resolver: (ctx) => ctx.schedule?.event_count?.toString() || '' },
  link: { resolver: (ctx) => ctx.schedule?.link || '' },
  observacoes: { resolver: (ctx) => ctx.schedule?.notes || '' },
  observacoes_evento: { resolver: (ctx) => ctx.contract?.observacoes_evento || '' },
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
  parcelas: 'forma_pagamento',
  observacoes_contrato: 'observacoes',
  // cliente_* aliases
  cliente_nome: 'nome_responsavel',
  cliente_cpf: 'cpf',
  cliente_rg: 'rg',
  cliente_email: 'email',
  cliente_endereco: 'endereco',
  cliente_numero: 'numero',
  cliente_complemento: 'complemento',
  cliente_bairro: 'bairro',
  cliente_cep: 'cep',
  cliente_cidade: 'cidade',
  cliente_data_nascimento: 'data_nascimento',
  nascimento_aniversariante: 'data_nascimento_aniversariante',
  aniversariante: 'nome_aniversariante',
  idade: 'idade_aniversariante',
  nome_pais: 'nomes_pais',
  horario: 'hora_inicio',
  horario_fim: 'hora_fim',
  data_festa: 'data_evento',
  pacote_valor: 'valor_convidado_adicional',
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
    nome: 'lead', primeiro_nome: 'lead', nome_completo: 'contract',
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
    data_nascimento: 'contract', data_nascimento_aniversariante: 'contract', nomes_pais: 'contract', brindes: 'contract',
    descricao: 'contract', telefone_pais: 'contract', cliente_celular: 'contract',
    tema: 'contract', valor_convidado_adicional: 'contract', quantidade_pessoas: 'contract',
    estado: 'contract', duracao_festa: 'contract', cardapio: 'contract', valor_total_extenso: 'contract',
    valor_sinal_extenso: 'contract', valor_restante_extenso: 'contract', valor_convidado_adicional_extenso: 'contract',
    data_entrada: 'contract', data_saldo: 'contract', aniversariantes: 'contract', opcionais: 'contract',
    qtd_adultos: 'contract', qtd_criancas: 'contract', valor_por_adulto: 'contract', valor_por_crianca: 'contract', observacoes_evento: 'contract',
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
