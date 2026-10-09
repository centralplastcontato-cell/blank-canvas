// Confere quem está chamando uma edge function: precisa ser alguém logado com
// acesso à empresa (ou admin da plataforma). Usado pelas funções de campanha,
// que antes aceitavam qualquer chamada, até sem chave, e gastavam a OpenAI.
//
// allowService: aceita também a chave de serviço (chamada interna entre funções).

// deno-lint-ignore-file no-explicit-any

export type AccessResult =
  | { ok: true; userId: string | null; isService: boolean }
  | { ok: false; status: number; error: string };

export async function checkCompanyAccess(
  admin: any,
  req: Request,
  companyId: string | null | undefined,
  options: { allowService?: boolean; serviceKey?: string } = {},
): Promise<AccessResult> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return { ok: false, status: 401, error: "Faça login" };
  if (options.allowService && options.serviceKey && jwt === options.serviceKey) {
    return { ok: true, userId: null, isService: true };
  }
  const { data } = await admin.auth.getUser(jwt);
  const user = data?.user;
  if (!user) return { ok: false, status: 401, error: "Faça login" };
  if (!companyId) return { ok: false, status: 400, error: "company_id é obrigatório" };
  const [{ data: isAdmin }, { data: hasAccess }] = await Promise.all([
    admin.rpc("is_admin", { _user_id: user.id }),
    admin.rpc("user_has_company_access", { _user_id: user.id, _company_id: companyId }),
  ]);
  if (isAdmin !== true && hasAccess !== true) return { ok: false, status: 403, error: "Sem acesso a esta empresa" };
  return { ok: true, userId: user.id, isService: false };
}
