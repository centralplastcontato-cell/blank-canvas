// Cliente da API v1 do Postaí (docs/API.md no repositório postai).
const base = () => (Deno.env.get("POSTAI_URL") || "https://www.meupostai.com.br/api/v1").replace(/\/$/, "");

export class ErroPostai extends Error {
  constructor(message: string, public status = 0, public reenviar = false) {
    super(message);
  }
}

export type PostPostai = {
  id: string;
  status: "aguardando_aprovacao" | "agendado" | "processando" | "publicado" | "falhou";
  motivo_falha: string | null;
  link_instagram: string | null;
};

export type NovoPost = {
  formato: "feed" | "carrossel" | "story";
  horario: string;
  midias: string[];
  legenda?: string;
  hashtags?: string;
  status: "agendado" | "aguardando_aprovacao";
  external_id: string;
};

async function pede<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const chave = Deno.env.get("POSTAI_API_KEY");
  if (!chave) throw new ErroPostai("POSTAI_API_KEY não configurada nos segredos do Supabase.");
  let r: Response;
  try {
    r = await fetch(base() + caminho, {
      ...init,
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json", ...(init.headers || {}) },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    throw new ErroPostai(`Postaí fora do ar: ${(e as Error).message}`, 0, true);
  }
  const texto = await r.text();
  let dados: { erro?: string; erros?: { campo?: string; codigo?: string; mensagem?: string }[] } | null = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    /* não-JSON */
  }
  if (!r.ok) {
    const partes = [dados?.erro || texto.slice(0, 200) || `erro ${r.status}`];
    for (const e of dados?.erros || []) partes.push(`${e.campo ? e.campo + ": " : ""}${e.mensagem || e.codigo || ""}`);
    throw new ErroPostai(`Postaí ${r.status}: ${partes.join(" · ")}`.slice(0, 600), r.status, r.status >= 500);
  }
  return dados as T;
}

export async function criaPost(corpo: NovoPost) {
  const r = await pede<{ post: PostPostai; avisos?: unknown[] }>("/posts", { method: "POST", body: JSON.stringify(corpo) });
  return r.post;
}

export async function consultaPost(id: string) {
  try {
    const r = await pede<{ post: PostPostai }>(`/posts/${encodeURIComponent(id)}`);
    return r.post;
  } catch (e) {
    if (e instanceof ErroPostai && e.status === 404) return null; // recusado/apagado lá
    throw e;
  }
}

export async function cancelaPost(id: string) {
  try {
    await pede(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    if (!(e instanceof ErroPostai && e.status === 404)) throw e;
  }
}

/** external_id da cópia em Story de um post (o feed usa o próprio id do post). */
export const idDoStory = (postId: string) => `${postId}-story`;

export async function consultaPorExternalId(externalId: string) {
  try {
    const r = await pede<{ post: PostPostai }>(`/posts?external_id=${encodeURIComponent(externalId)}`);
    return r.post;
  } catch (e) {
    if (e instanceof ErroPostai && e.status === 404) return null;
    throw e;
  }
}

/** Cancela o post no Postaí e, se existir, a cópia dele em Story (o Story é best-effort: erro nele não trava). */
export async function cancelaPostEStory(postaiId: string, postId: string) {
  await cancelaPost(postaiId);
  try {
    const story = await consultaPorExternalId(idDoStory(postId));
    if (story) await cancelaPost(story.id);
  } catch {
    /* Story já publicado ou Postaí instável: o feed já saiu, segue */
  }
}
