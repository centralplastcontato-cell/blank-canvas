// Busca de lead existente pelo telefone, tolerante ao formato.
//
// O mesmo número chega gravado de jeitos diferentes: a LP salva o que a pessoa
// digitou (ex.: 15974000152) e o robô salva o que vem do WhatsApp (ex.:
// 5515974000152), às vezes sem o nono dígito. Comparar só o texto exato fazia a
// mesma pessoa virar dois leads. A comparação aqui é exata sobre as variantes
// (com/sem 55, com/sem o 9): nunca por "contém", para não juntar pessoas diferentes.

// deno-lint-ignore no-explicit-any
type SupabaseLike = any;

export function brPhoneVariants(phone: string | null | undefined): string[] {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return digits ? [digits] : [];

  const local = (digits.length === 12 || digits.length === 13) && digits.startsWith('55')
    ? digits.slice(2)
    : digits;

  const locals = new Set<string>([local]);
  if (local.length === 11 && local[2] === '9') {
    locals.add(local.slice(0, 2) + local.slice(3)); // sem o nono dígito
  } else if (local.length === 10) {
    locals.add(local.slice(0, 2) + '9' + local.slice(2)); // com o nono dígito
  }

  const variants = new Set<string>([digits]);
  for (const l of locals) {
    variants.add(l);
    variants.add(`55${l}`);
  }
  return [...variants];
}

/**
 * Lead mais recente da empresa com esse telefone (qualquer formato), ou null.
 * Procura em todas as unidades/números da empresa — a mesma pessoa não deve
 * virar um lead novo só porque escreveu para outro número.
 */
export async function findLeadByPhone<T = Record<string, unknown>>(
  supabase: SupabaseLike,
  companyId: string | null | undefined,
  phone: string | null | undefined,
  columns = '*',
): Promise<T | null> {
  const variants = brPhoneVariants(phone);
  if (!companyId || variants.length === 0) return null;
  const { data, error } = await supabase
    .from('campaign_leads')
    .select(columns)
    .eq('company_id', companyId)
    .in('whatsapp', variants)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) {
    console.error('[lead-phone] Falha ao buscar lead por telefone:', error.message);
    return null;
  }
  return ((data && data[0]) as T) ?? null;
}
