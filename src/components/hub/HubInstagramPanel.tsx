import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FlaskConical,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { mensagemDaFuncao } from "@/lib/edgeFunctionError";

// Painel do Instagram automático da Celebrei (Edge Function "hub-instagram"). Os posts são gerados
// por IA, enviados ao Postaí e publicados no @hubcelebrei. Ver docs/INSTAGRAM.md.

type PostCard = {
  id: string;
  vaga: string;
  tipo: string;
  publico: string;
  tema: string;
  titulo: string;
  legenda: string;
  hashtags: string;
  midias: string[];
  total: number;
  status: string;
  motivo: string | null;
  nota: string | null;
  teste: boolean;
  instagramUrl: string | null;
};
type Config = { aprovacaoManual: boolean; pausado: boolean; inicio: string | null };
type Dados = { posts: PostCard[]; config: Config; env: { openai: boolean; postai: boolean } };
type Registro = { etapa: string; mensagem: string };
type Etapa = { id: string; feitas: number; total: number; pronto: boolean; erro?: string; ocupado?: boolean };

const ROTULO_STATUS: Record<string, { texto: string; cor: string }> = {
  gerando: { texto: "Montando imagens", cor: "bg-sky-500/15 text-sky-500" },
  aguardando: { texto: "Para aprovar", cor: "bg-amber-500/15 text-amber-500" },
  aprovado: { texto: "Aprovado", cor: "bg-emerald-500/15 text-emerald-500" },
  enviando: { texto: "Enviando ao Postaí", cor: "bg-sky-500/15 text-sky-500" },
  enviado: { texto: "Agendado no Postaí", cor: "bg-emerald-500/15 text-emerald-500" },
  publicado: { texto: "Publicado", cor: "bg-primary/20 text-primary" },
  falhou: { texto: "Postaí recusou", cor: "bg-destructive/15 text-destructive" },
  erro: { texto: "Não deu para gerar", cor: "bg-destructive/15 text-destructive" },
  recusado: { texto: "Recusado", cor: "bg-muted text-muted-foreground" },
  refazer: { texto: "Gerando outro", cor: "bg-muted text-muted-foreground" },
  perdido: { texto: "Perdeu o horário", cor: "bg-muted text-muted-foreground" },
};
const ROTULO_TIPO: Record<string, string> = { foto: "📷 Foto", pergunta: "❓ Pergunta", carrossel: "🖼️ Carrossel" };
const ROTULO_PUBLICO: Record<string, string> = { vendas: "Vendas", gestao: "Gestão" };

const diaBrasilia = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);
const horaBrasilia = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
function rotuloDia(dia: string, hoje: string) {
  const nome = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }).format(
    new Date(`${dia}T12:00:00-03:00`),
  );
  return dia === hoje ? `Hoje · ${nome}` : nome.charAt(0).toUpperCase() + nome.slice(1);
}

async function chamaFuncao<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("hub-instagram", { body: corpo });
  if (error) {
    // "Failed to fetch"/"Load failed": o celular cortou a conexão (tela bloqueou, trocou de app...),
    // mas o servidor normalmente termina o trabalho mesmo assim.
    const rede = /failed to send a request|load failed|failed to fetch|network/i.test(String((error as Error).message));
    throw new Error(rede ? "A conexão caiu no meio, mas o trabalho deve ter terminado no servidor. Toque em Atualizar em 1 minuto." : await mensagemDaFuncao(error));
  }
  return data as T;
}

export default function HubInstagramPanel() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");
  const [aviso, setAviso] = useState("");
  const [log, setLog] = useState<Registro[]>([]);
  // Várias ações podem rodar ao mesmo tempo (ex.: aprovar um post enquanto outro está sendo gerado).
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState({ legenda: "", hashtags: "" });
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<{ midias: string[]; i: number } | null>(null);
  const [diaAberto, setDiaAberto] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<Record<string, string>>({});

  const carrega = useCallback(async () => {
    try {
      const d = await chamaFuncao<Dados>({ acao: "listar" });
      setDados(d);
      setErroCarga("");
    } catch (e) {
      setErroCarga((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carrega();
    // Volta para o app (celular) → recarrega.
    const aoVoltar = () => document.visibilityState === "visible" && carrega();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [carrega]);

  const marca = (k: string, on: boolean) =>
    setOcupados((a) => {
      const n = new Set(a);
      if (on) n.add(k);
      else n.delete(k);
      return n;
    });
  const emUso = (k: string) => ocupados.has(k);
  const cardOcupado = (id: string) => ocupados.has("rodada") || [...ocupados].some((k) => k.startsWith(`${id}:`));

  async function acao(corpo: Record<string, unknown>, chave: string) {
    marca(chave, true);
    setAviso("");
    try {
      const r = await chamaFuncao<{ resumo?: string | null; log?: Registro[]; envio?: string | null; vaga?: string }>(corpo);
      if (r.resumo) setAviso(r.resumo);
      if (r.envio) setAviso(`Post de teste: ${r.envio}`);
      if (r.log) setLog(r.log);
      return r;
    } catch (e) {
      setAviso((e as Error).message);
      return null;
    } finally {
      marca(chave, false);
      carrega();
    }
  }

  // Enquanto o painel está aberto, monta as imagens que faltam (uma etapa por vez),
  // sem esperar a rodada automática. Pausado: só o post de teste.
  const travaLoop = useRef(false);
  const comErro = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!dados || travaLoop.current) return;
    const alvo = dados.posts.find(
      (p) => p.status === "gerando" && !comErro.current.has(p.id) && !cardOcupado(p.id) && (p.teste || !dados.config.pausado),
    );
    if (!alvo) return;
    travaLoop.current = true;
    (async () => {
      try {
        setProgresso((p) => ({ ...p, [alvo.id]: `Montando imagem ${alvo.midias.length + 1} de ${alvo.total}…` }));
        const r = await chamaFuncao<{ etapa?: Etapa }>({ acao: "avancar", id: alvo.id });
        if (r.etapa?.erro) comErro.current.add(alvo.id);
        if (r.etapa?.ocupado) await new Promise((ok) => setTimeout(ok, 20_000)); // a rodada automática está nele
      } catch {
        comErro.current.add(alvo.id);
      } finally {
        setProgresso((p) => {
          const n = { ...p };
          delete n[alvo.id];
          return n;
        });
        travaLoop.current = false;
        carrega();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  const hoje = diaBrasilia(new Date().toISOString());
  const posts = useMemo(() => dados?.posts ?? [], [dados]);
  const dias = useMemo(() => [...new Set(posts.map((p) => diaBrasilia(p.vaga)))].sort(), [posts]);
  const dia = diaAberto && dias.includes(diaAberto) ? diaAberto : dias.includes(hoje) ? hoje : dias.find((d) => d >= hoje) || dias[dias.length - 1] || hoje;

  // Post trocado por "Gerar outro" some: se o substituto já existe, não aparece nada.
  const doDia = posts.filter((p) => {
    if (diaBrasilia(p.vaga) !== dia) return false;
    if (p.status !== "refazer") return true;
    const temSubstituto = posts.some((o) => o.vaga === p.vaga && !["recusado", "refazer"].includes(o.status));
    const primeiro = posts.find((o) => o.vaga === p.vaga && o.status === "refazer")?.id === p.id;
    return !temSubstituto && primeiro;
  });
  const contagem = (s: string) => posts.filter((p) => p.status === s).length;

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando o Instagram…
      </div>
    );
  }
  if (!dados) {
    return (
      <div className="max-w-xl space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <p>{erroCarga || "Não foi possível carregar o Instagram agora."}</p>
        <Button size="sm" variant="outline" onClick={() => { setCarregando(true); carrega(); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar de novo
        </Button>
      </div>
    );
  }

  const { config, env } = dados;
  const ligado = !config.pausado;

  return (
    <div className="max-w-4xl space-y-5">
      <Dialog open={!!zoom} onOpenChange={(v) => !v && setZoom(null)}>
        <DialogContent className="max-w-[min(92vw,560px)] p-3">
          <DialogTitle className="sr-only">Arte do post</DialogTitle>
          {zoom && (
            <div className="space-y-3">
              <img src={zoom.midias[zoom.i]} alt={`Imagem ${zoom.i + 1} de ${zoom.midias.length}`} className="w-full rounded-lg" />
              {zoom.midias.length > 1 && (
                <div className="flex items-center justify-between">
                  <Button size="sm" variant="outline" disabled={zoom.i === 0} onClick={() => setZoom({ ...zoom, i: zoom.i - 1 })}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">{zoom.i + 1} / {zoom.midias.length}</span>
                  <Button size="sm" variant="outline" disabled={zoom.i === zoom.midias.length - 1} onClick={() => setZoom({ ...zoom, i: zoom.i + 1 })}>
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <p className="text-sm text-muted-foreground">
          Posts gerados por IA, enviados ao Postaí e publicados no <b className="text-foreground">@hubcelebrei</b>.
        </p>

        {(!env.openai || !env.postai) && (
          <p className="flex items-start gap-2 rounded-lg bg-amber-500/15 p-3 text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Falta guardar nos segredos do Supabase (Edge Functions → Secrets):{" "}
            {[!env.openai && "OPENAI_API_KEY", !env.postai && "POSTAI_API_KEY"].filter(Boolean).join(" e ")}.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span>
              <span className="block font-medium">Automação {ligado ? "ligada" : "pausada"}</span>
              <span className="text-xs text-muted-foreground">{ligado ? "Gera e envia sozinha" : "Nada é gerado nem enviado"}</span>
            </span>
            <Switch
              checked={ligado}
              disabled={emUso("cfg") || emUso("rodada")}
              onCheckedChange={(v) => acao({ acao: "config", chave: "pausado", valor: !v }, "cfg")}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <span>
              <span className="block font-medium">Aprovação manual</span>
              <span className="text-xs text-muted-foreground">{config.aprovacaoManual ? "Cada post espera você aprovar" : "Vai direto para o Postaí"}</span>
            </span>
            <Switch
              checked={config.aprovacaoManual}
              disabled={emUso("cfg") || emUso("rodada")}
              onCheckedChange={(v) => acao({ acao: "config", chave: "aprovacao_manual", valor: v }, "cfg")}
            />
          </label>
        </div>

        <p className="text-sm text-muted-foreground">
          {contagem("aguardando")} para aprovar · {contagem("gerando")} montando · {contagem("enviado")} agendado(s) no Postaí ·{" "}
          {contagem("publicado")} publicado(s)
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button disabled={ocupados.size > 0 || !env.openai || !env.postai} onClick={() => acao({ acao: "teste" }, "teste")}>
            {emUso("teste") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
            {emUso("teste") ? "Criando o teste… (1 a 2 min)" : "Post de teste (daqui 30 min)"}
          </Button>
          <Button variant="outline" disabled={ocupados.size > 0} onClick={() => acao({ acao: "rodada" }, "rodada")}>
            {emUso("rodada") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {emUso("rodada") ? "Rodando… (até 3 min)" : "Rodar agora"}
          </Button>
          <Button variant="ghost" onClick={() => carrega()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          A automação roda sozinha a cada 10 minutos: prepara os posts dos próximos 3 dias, monta as imagens aos poucos, envia ao Postaí
          com antecedência (com uma cópia no Story) e confere o que foi publicado. Ritmo: 3 por dia na 1ª semana, 2 na 2ª, depois 1 por dia
          {config.inicio ? ` (contando de ${config.inicio.split("-").reverse().join("/")})` : " (começa a contar quando você ligar)"}. O post de
          teste vai só para o feed, mesmo com a automação pausada.
        </p>

        {aviso && <p className="rounded-lg bg-secondary p-3 text-sm" role="alert">{aviso}</p>}
        {erroCarga && <p className="text-sm text-destructive">{erroCarga}</p>}
        {log.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-secondary/60 p-3 text-xs">
            {log.map((l, i) => (
              <li key={i}><b>{l.etapa}:</b> {l.mensagem}</li>
            ))}
          </ul>
        )}
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Dias">
        {dias.length === 0 && (
          <span className="text-sm text-muted-foreground">
            Ainda não há posts. Comece pelo “Post de teste”; depois ligue a automação.
          </span>
        )}
        {dias.map((d) => {
          const n = posts.filter((p) => diaBrasilia(p.vaga) === d && !["recusado", "refazer"].includes(p.status)).length;
          const dt = new Date(`${d}T12:00:00-03:00`);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDiaAberto(d)}
              className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-xs ${
                d === dia ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
              }`}
            >
              <span>{d === hoje ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" }).format(dt)}</span>
              <strong className="text-lg text-foreground">{dt.getUTCDate()}</strong>
              <span>{n} post{n === 1 ? "" : "s"}</span>
            </button>
          );
        })}
      </nav>

      {dias.length > 0 && <h2 className="text-base font-semibold">{rotuloDia(dia, hoje)}</h2>}

      <div className="space-y-4">
        {doDia.map((p) =>
          p.status === "refazer" ? (
            <article key={p.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <b className="text-foreground">{horaBrasilia(p.vaga)}</b>
              {emUso(`${p.id}:refazer`) ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando o post novo deste horário… (1 a 2 min)</>
              ) : (
                <><Clock className="h-4 w-4" /> Ainda sem post para este horário. A próxima rodada automática gera um.</>
              )}
            </article>
          ) : (
            <article key={p.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex gap-2 overflow-x-auto">
                {p.midias.map((m, i) => (
                  <button key={m} type="button" onClick={() => setZoom({ midias: p.midias, i })} className="shrink-0" aria-label={`Ampliar imagem ${i + 1}`}>
                    <img src={m} alt={`${p.tema} — imagem ${i + 1}`} loading="lazy" className="h-40 w-32 rounded-lg object-cover sm:h-48 sm:w-[154px]" />
                  </button>
                ))}
                {p.status === "gerando" &&
                  Array.from({ length: Math.max(0, p.total - p.midias.length) }).map((_, i) => (
                    <div key={i} className="flex h-40 w-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-border sm:h-48 sm:w-[154px]">
                      {i === 0 && progresso[p.id] ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <b className="text-base">{horaBrasilia(p.vaga)}</b>
                <span>{ROTULO_TIPO[p.tipo] || p.tipo}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">{ROTULO_PUBLICO[p.publico] || p.publico}</span>
                <span className="text-muted-foreground">{p.tema}</span>
                <span className={`rounded-full px-2 py-0.5 font-medium ${ROTULO_STATUS[p.status]?.cor || "bg-muted"}`}>
                  {ROTULO_STATUS[p.status]?.texto || p.status}
                </span>
                {p.teste && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-500">Teste</span>}
              </div>

              {p.status === "gerando" && (
                <p className="text-xs text-muted-foreground">
                  {progresso[p.id] || `Imagens prontas: ${p.midias.length} de ${p.total}. ${ligado || p.teste ? "As próximas saem em instantes." : "A automação está pausada."}`}
                </p>
              )}
              {p.motivo && <p className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">{p.motivo}</p>}
              {p.nota && <p className="text-xs text-muted-foreground">{p.nota}</p>}

              {editando === p.id ? (
                <div className="space-y-2">
                  <Textarea value={rascunho.legenda} onChange={(e) => setRascunho({ ...rascunho, legenda: e.target.value })} rows={8} />
                  <Input value={rascunho.hashtags} onChange={(e) => setRascunho({ ...rascunho, hashtags: e.target.value })} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={cardOcupado(p.id)}
                      onClick={async () => {
                        const r = await acao({ acao: "editar", id: p.id, ...rascunho }, `${p.id}:editar`);
                        if (r) setEditando(null);
                      }}
                    >
                      Salvar texto
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className={`whitespace-pre-line text-sm ${abertos.has(p.id) ? "" : "line-clamp-3"}`}>{p.legenda}</p>
                  {abertos.has(p.id) && <p className="mt-2 text-xs text-primary">{p.hashtags}</p>}
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-primary"
                    onClick={() =>
                      setAbertos((a) => {
                        const n = new Set(a);
                        if (n.has(p.id)) n.delete(p.id);
                        else n.add(p.id);
                        return n;
                      })
                    }
                  >
                    {abertos.has(p.id) ? "Ver menos" : "Ver texto completo"}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {["aguardando", "falhou", "recusado"].includes(p.status) && (
                  <Button size="sm" disabled={cardOcupado(p.id)} onClick={() => acao({ acao: "aprovar", id: p.id }, `${p.id}:aprovar`)}>
                    {emUso(`${p.id}:aprovar`) ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />} Aprovar
                  </Button>
                )}
                {["gerando", "aguardando", "aprovado", "falhou", "erro"].includes(p.status) && editando !== p.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(p.id);
                      setRascunho({ legenda: p.legenda, hashtags: p.hashtags });
                    }}
                  >
                    <Pencil className="mr-1 h-4 w-4" /> Editar texto
                  </Button>
                )}
                {!["publicado", "recusado", "refazer", "perdido", "enviando"].includes(p.status) && (
                  <>
                    <Button size="sm" variant="outline" disabled={cardOcupado(p.id) || !!progresso[p.id]} onClick={() => acao({ acao: "refazer", id: p.id }, `${p.id}:refazer`)}>
                      {emUso(`${p.id}:refazer`) ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}
                      {emUso(`${p.id}:refazer`) ? "Gerando o novo… (1 a 2 min)" : "Gerar outro"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={cardOcupado(p.id)}
                      onClick={() => acao({ acao: "recusar", id: p.id }, `${p.id}:recusar`)}
                    >
                      <X className="mr-1 h-4 w-4" /> Recusar
                    </Button>
                  </>
                )}
                {p.instagramUrl && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={p.instagramUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1 h-4 w-4" /> Ver no Instagram
                    </a>
                  </Button>
                )}
              </div>
            </article>
          ),
        )}
      </div>
    </div>
  );
}
