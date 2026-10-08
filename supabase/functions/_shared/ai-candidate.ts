// Quem quer trabalhar no buffet: a Bia manda o link do formulário de
// candidatura ("Trabalhe Conosco") já com nome, WhatsApp e as funções que a
// pessoa citou. O candidato chega na aba Candidatos como "via Bia".

export interface CandidateLinkInput {
  domain: string; // domínio do buffet (custom_domain)
  companySlug: string;
  templateSlug: string;
  name?: string | null;
  phone?: string | null;
  roles?: string | null; // "garçom, monitor"
}

/** Nome para o formulário: sem emoji/símbolo e sem número de telefone no lugar do nome */
export function candidateName(raw: string | null | undefined): string {
  const s = String(raw || "").replace(/[^\p{L}\s'.-]/gu, " ").replace(/\s+/g, " ").trim();
  return /\p{L}{2,}/u.test(s) ? s.slice(0, 80) : "";
}

export function buildCandidateLink(input: CandidateLinkInput): string | null {
  const domain = String(input.domain || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!domain || !input.companySlug || !input.templateSlug) return null;
  const params = new URLSearchParams();
  const name = candidateName(input.name);
  if (name) params.set("nome", name);
  const phone = String(input.phone || "").replace(/\D/g, "");
  if (phone.length >= 10) params.set("tel", phone);
  const roles = String(input.roles || "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (roles) params.set("vagas", roles);
  params.set("via", "bia");
  return `https://${domain}/freelancer/${encodeURIComponent(input.companySlug)}/${encodeURIComponent(input.templateSlug)}?${params.toString()}`;
}

/**
 * O link vai sempre pelo sistema, no fim da mensagem: a IA não escreve link
 * (um link copiado por ela pode sair errado), e qualquer link que ela tenha
 * escrito sai do texto.
 */
export function withCandidateLink(text: string, url: string): string {
  const clean = String(text || "")
    .replace(/https?:\/\/\S+/g, "")
    .split("\n").map((l) => l.replace(/[ \t]+$/, "")).join("\n")
    .replace(/[ \t]*(👉|👇)\s*$/u, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return clean ? `${clean}\n\n👉 ${url}` : `👉 ${url}`;
}
