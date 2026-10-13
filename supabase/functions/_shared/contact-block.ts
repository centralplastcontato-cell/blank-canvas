// "Não enviar mais nada": a equipe liga no menu da conversa (ou o cliente
// respondeu uma campanha só com "sair"/"parar"). O número fica em
// campaign_optouts e NADA automático sai para ele — follow-ups do bot e da IA,
// reativação, campanhas, confirmação de visita, respostas do bot e da IA.
// A equipe continua podendo escrever à mão. Vale para a empresa toda
// (comparação pelos últimos 8 dígitos, como nas campanhas).

// deno-lint-ignore no-explicit-any
type SB = any;

export function phoneTail(phoneOrJid: string | null | undefined): string {
  const digits = String(phoneOrJid || "").split("@")[0].replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : "";
}

export async function isContactBlocked(supabase: SB, companyId: string | null | undefined, phoneOrJid: string | null | undefined): Promise<boolean> {
  const tail = phoneTail(phoneOrJid);
  if (!companyId || !tail || String(phoneOrJid || "").endsWith("@g.us")) return false;
  const { data, error } = await supabase.from("campaign_optouts").select("id").eq("company_id", companyId).eq("phone_tail", tail).limit(1);
  if (error) {
    console.error("[contact-block] Falha ao consultar bloqueio:", error.message);
    return false;
  }
  return (data || []).length > 0;
}

/** Para rotinas que passam por muitos contatos: carrega todos os bloqueios de uma vez */
export async function loadBlockedContacts(supabase: SB): Promise<(companyId: string | null | undefined, phoneOrJid: string | null | undefined) => boolean> {
  const set = new Set<string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from("campaign_optouts").select("company_id, phone_tail").range(from, from + 999);
    if (error) {
      console.error("[contact-block] Falha ao carregar bloqueios:", error.message);
      break;
    }
    for (const r of (data || []) as Array<{ company_id: string; phone_tail: string }>) set.add(`${r.company_id}:${r.phone_tail}`);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return (companyId, phoneOrJid) => {
    const tail = phoneTail(phoneOrJid);
    return !!companyId && !!tail && set.has(`${companyId}:${tail}`);
  };
}

// Pedido para parar de receber mensagens ("sair da lista", "não quero mais
// receber", "para de me mandar"...). Não bloqueia sozinho: a IA avisa a equipe,
// que decide se liga o "Não enviar mais nada" (caso Bruna, 08/10).
const STOP_REQUEST = /(sair|me (tira|tire|remove|remova|exclui|exclua)|tirar? (o )?meu (n[uú]mero|contato)).{0,25}(lista|transmiss|grupo|contatos)|(n[aã]o|nao) (quero|desejo) (mais )?(receber|mensage)|(para|pare|parem|chega) de (me )?(mandar|enviar|mandarem)|n[aã]o (me )?(mand|envi)(e|em|a) mais|descadastr|^\s*(sair|parar|pare|stop|cancelar inscri[cç][aã]o)\s*[.!]*\s*$/i;

export function asksToStopMessages(text: string | null | undefined): boolean {
  return STOP_REQUEST.test(String(text || "").trim());
}
