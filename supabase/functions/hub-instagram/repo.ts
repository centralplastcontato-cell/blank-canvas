import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// Acesso ao banco e ao Storage. A rodada só conversa com esta interface: em produção é o
// Supabase (chave de serviço); nos testes, uma versão em memória.

export const BALDE = "hub-instagram";

export type Status =
  | "gerando" // legenda pronta, imagens sendo montadas (uma etapa por rodada)
  | "aguardando" // pronto, esperando aprovação manual
  | "aprovado" // pronto para ir ao Postaí
  | "enviando"
  | "enviado" // na fila do Postaí
  | "publicado"
  | "falhou" // o Postaí recusou
  | "erro" // não deu para gerar as imagens
  | "recusado"
  | "refazer" // substituído por outro post no mesmo horário
  | "perdido"; // o horário passou antes do envio

export type Item =
  | { tipo: "capa"; prompt: string; selo: string; titulo: string; arraste: boolean }
  | { tipo: "pergunta"; prompt: string; pergunta: string }
  | { tipo: "ponto"; numero: number; titulo: string; texto: string }
  | { tipo: "chamada" };

export type Post = {
  id: string;
  vaga: string;
  tipo: "foto" | "pergunta" | "carrossel" | "reels";
  publico: "vendas" | "gestao";
  tema: string;
  cenario: string;
  titulo: string;
  legenda: string;
  hashtags: string;
  plano: Item[];
  midias: string[];
  status: Status;
  motivo: string | null;
  nota: string | null;
  tentativas: number;
  gerando_desde: string | null;
  teste: boolean;
  postai_id: string | null;
  instagram_url: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type NovoPost = Omit<Post, "criado_em" | "atualizado_em" | "motivo" | "tentativas" | "gerando_desde" | "postai_id" | "instagram_url"> & {
  motivo?: string | null;
};

/** Condição de uma atualização: só altera se o post ainda estiver num destes status (e livre). */
export type Condicao = { status?: Status[]; livreAntes?: string };

export type Filtro = { status?: Status[]; vagaDesde?: string; vagaAte?: string; teste?: boolean };

export class VagaOcupada extends Error {}

export interface Repo {
  config(): Promise<Map<string, { valor: string; booleano: boolean | null }>>;
  gravaConfig(chave: string, valor: string, booleano: boolean | null): Promise<void>;
  /** Pega a trava da rodada se a última começou antes de `limite`. */
  trava(agora: string, limite: string): Promise<boolean>;
  solta(): Promise<void>;
  posts(f: Filtro): Promise<Post[]>;
  post(id: string): Promise<Post | null>;
  /** Últimos posts criados (para variar tema e cenário). */
  recentes(n: number): Promise<{ tema: string; cenario: string }[]>;
  /** Lança VagaOcupada se já houver post ativo no mesmo horário. */
  insere(p: NovoPost): Promise<Post>;
  /** Devolve o post atualizado, ou null se a condição não bateu. */
  atualiza(id: string, campos: Partial<Post>, c?: Condicao): Promise<Post | null>;
  /** Atualiza vários de uma vez; devolve quantos. */
  atualizaVarios(f: Filtro, campos: Partial<Post>, atualizadoAntes?: string): Promise<number>;
  sobe(caminho: string, dados: Uint8Array, tipo: string): Promise<string>;
}

export function repoSupabase(db: SupabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)): Repo {
  const posts = () => db.from("hub_instagram_posts");
  const confere = <T>(r: { data: T; error: { message: string; code?: string } | null }) => {
    if (r.error) throw new Error(`banco: ${r.error.message}`);
    return r.data;
  };
  return {
    async config() {
      const linhas = confere(await db.from("hub_instagram_config").select("chave, valor, booleano")) as { chave: string; valor: string; booleano: boolean | null }[];
      return new Map(linhas.map((l) => [l.chave, { valor: l.valor, booleano: l.booleano }]));
    },
    async gravaConfig(chave, valor, booleano) {
      confere(await db.from("hub_instagram_config").upsert({ chave, valor, booleano }, { onConflict: "chave" }));
    },
    async trava(agora, limite) {
      await db.from("hub_instagram_config").upsert({ chave: "rodada_em", valor: new Date(0).toISOString() }, { onConflict: "chave", ignoreDuplicates: true });
      const linhas = confere(
        await db.from("hub_instagram_config").update({ valor: agora }).eq("chave", "rodada_em").lt("valor", limite).select("chave"),
      ) as unknown[];
      return linhas.length > 0;
    },
    async solta() {
      confere(await db.from("hub_instagram_config").update({ valor: new Date(0).toISOString() }).eq("chave", "rodada_em"));
    },
    async posts(f) {
      let q = posts().select("*");
      if (f.status) q = q.in("status", f.status);
      if (f.vagaDesde) q = q.gte("vaga", f.vagaDesde);
      if (f.vagaAte) q = q.lt("vaga", f.vagaAte);
      if (f.teste !== undefined) q = q.eq("teste", f.teste);
      return confere(await q.order("vaga", { ascending: true }).order("criado_em", { ascending: false })) as Post[];
    },
    async post(id) {
      return confere(await posts().select("*").eq("id", id).maybeSingle()) as Post | null;
    },
    async recentes(n) {
      return confere(await posts().select("tema, cenario").order("criado_em", { ascending: false }).limit(n)) as { tema: string; cenario: string }[];
    },
    async insere(p) {
      const r = await posts().insert(p).select("*").single();
      if (r.error?.code === "23505") throw new VagaOcupada("Já existe um post neste horário.");
      return confere(r) as Post;
    },
    async atualiza(id, campos, c = {}) {
      let q = posts().update({ ...campos, atualizado_em: new Date().toISOString() }).eq("id", id);
      if (c.status) q = q.in("status", c.status);
      if (c.livreAntes) q = q.or(`gerando_desde.is.null,gerando_desde.lt."${c.livreAntes}"`);
      const r = await q.select("*").maybeSingle();
      if (r.error?.code === "23505") throw new VagaOcupada("Já existe outro post ativo neste horário.");
      return confere(r) as Post | null;
    },
    async atualizaVarios(f, campos, atualizadoAntes) {
      let q = posts().update({ ...campos, atualizado_em: new Date().toISOString() });
      if (f.status) q = q.in("status", f.status);
      if (f.vagaDesde) q = q.gte("vaga", f.vagaDesde);
      if (f.vagaAte) q = q.lt("vaga", f.vagaAte);
      if (f.teste !== undefined) q = q.eq("teste", f.teste);
      if (atualizadoAntes) q = q.lt("atualizado_em", atualizadoAntes);
      return (confere(await q.select("id")) as unknown[]).length;
    },
    async sobe(caminho, dados, tipo) {
      const { error } = await db.storage.from(BALDE).upload(caminho, dados, { contentType: tipo, upsert: true });
      if (error) throw new Error(`Storage: ${error.message}`);
      return db.storage.from(BALDE).getPublicUrl(caminho).data.publicUrl;
    },
  };
}
