// Instagram automático da Celebrei: gera arte + legenda e manda para o Postaí
// (meupostai.com.br) publicar no @hubcelebrei. Ver docs/INSTAGRAM.md.
//
// Chamado de dois jeitos:
// - pelo pg_cron a cada 10 min (header x-cron-secret = hub_instagram_config.cron_segredo, criado
//   pelo próprio SQL da instalação), só { acao: "rodada" };
// - pelo painel do Hub → Instagram (login de admin da Celebrei, rpc is_admin).

import { createClient } from "npm:@supabase/supabase-js@2";
import { repoSupabase, VagaOcupada } from "./repo.ts";
import { ErroAcao, acaoNoPost, gravarConfig, listar, postDeTeste, rodada, type AcaoPost } from "./rodada.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Mantém o trabalho rodando depois da resposta (EdgeRuntime existe no Supabase; localmente segue normal). */
function emSegundoPlano(tarefa: Promise<unknown>) {
  (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime?.waitUntil(tarefa);
}

const ACOES_POST: AcaoPost[] = ["aprovar", "recusar", "refazer", "editar", "avancar"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const corpo = (await req.json().catch(() => ({}))) as {
    acao?: string;
    id?: string;
    chave?: string;
    valor?: unknown;
    legenda?: string;
    hashtags?: string;
  };
  const repo = repoSupabase();

  // Cron: responde na hora (o pg_net desiste em ~5 s) e trabalha em segundo plano.
  const doCron = req.headers.get("x-cron-secret");
  if (doCron) {
    const segredo = (await repo.config()).get("cron_segredo")?.valor;
    if (!segredo || segredo.length < 32 || doCron !== segredo) return json({ error: "Unauthorized" }, 401);
    if (corpo.acao !== "rodada") return json({ error: "Ação inválida para o cron." }, 400);
    emSegundoPlano(
      rodada(repo, "cron")
        .then((log) => console.log("Instagram:", JSON.stringify(log)))
        .catch((e) => console.error("Instagram: rodada falhou", e)),
    );
    return json({ ok: true, aceito: true }, 202);
  }

  // Painel: só admin da Celebrei (o mesmo is_admin que libera o Hub).
  const url = Deno.env.get("SUPABASE_URL")!;
  const cliente = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("authorization") || "" } },
  });
  const { data: { user } } = await cliente.auth.getUser();
  if (!user) return json({ error: "Faça login de novo." }, 401);
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ehAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
  if (ehAdmin !== true) return json({ error: "Só para administradores da Celebrei." }, 403);

  try {
    switch (corpo.acao) {
      case "listar":
        return json({ ok: true, ...(await listar(repo)) });
      case "rodada":
        return json({ ok: true, log: await rodada(repo, "painel") });
      case "teste":
        return json({ ok: true, ...(await postDeTeste(repo)) });
      case "config": {
        if ((corpo.chave !== "aprovacao_manual" && corpo.chave !== "pausado") || typeof corpo.valor !== "boolean") {
          return json({ error: "Configuração inválida." }, 400);
        }
        await gravarConfig(repo, corpo.chave, corpo.valor);
        return json({ ok: true });
      }
      default: {
        if (!ACOES_POST.includes(corpo.acao as AcaoPost)) return json({ error: "Ação inválida." }, 400);
        if (!/^[0-9a-f-]{36}$/i.test(corpo.id || "")) return json({ error: "Post inválido." }, 400);
        const r = await acaoNoPost(repo, corpo.id!, corpo.acao as AcaoPost, { legenda: corpo.legenda, hashtags: corpo.hashtags });
        return json({ ok: true, ...r });
      }
    }
  } catch (e) {
    if (e instanceof ErroAcao) return json({ error: e.message }, e.status);
    if (e instanceof VagaOcupada) return json({ error: e.message }, 409);
    console.error("Instagram: ação falhou", corpo.acao, e);
    return json({ error: (e as Error).message || "Erro inesperado." }, 500);
  }
});
