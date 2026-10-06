import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, ChevronDown, ChevronRight, FlaskConical, Loader2, Play, RotateCcw, XCircle, AlertTriangle, Wrench } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { estimateTypicalConversationUsd, formatBrlFromUsd, getAiModel } from "@/lib/aiModels";

// Simulador de testes da IA: uma IA faz o papel do cliente, a IA de verdade
// responde no modo isolado (nada vai para o WhatsApp, nada é gravado) e outra
// IA confere cada conversa. Aqui a equipe roda e lê o relatório.

interface SimRun {
  id: string;
  status: "running" | "done";
  model: string | null;
  total: number;
  passed: number;
  failed: number;
  errors: number;
  cost_usd: number;
  created_at: string;
  finished_at: string | null;
}

interface SimCheck {
  id: string;
  label: string;
  ok: boolean | null;
  note: string;
}

interface SimEntry {
  who: "cliente" | "ia" | "ferramenta";
  text: string;
  kind?: string;
  turn: number;
}

interface SimResult {
  id: string;
  scenario_title: string | null;
  scenario_key: string | null;
  scope: "geral" | "empresa" | null;
  status: "pending" | "running" | "passed" | "failed" | "error";
  transcript: SimEntry[];
  checks: SimCheck[];
  summary: string | null;
  end_reason: string | null;
  error: string | null;
  turns: number;
  cost_usd: number;
}

// Tabelas do simulador ainda fora dos tipos gerados do Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const simDb = supabase as any;

// Cliente simulado + avaliador (gpt-5.4-mini) por conversa, em média
const HELPER_USD_PER_CONVERSATION = 0.02;
const POLL_MS = 5000;
const RESUME_MS = 60000;

const STATUS_ORDER: Record<SimResult["status"], number> = { error: 0, failed: 1, running: 2, pending: 3, passed: 4 };
const MEDIA_LABEL: Record<string, string> = { image: "📷 Foto", video: "🎬 Vídeo", document: "📄 PDF", legenda: "Legenda do material" };

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: SimResult["status"] }) {
  if (status === "passed") return <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15 gap-1"><CheckCircle2 className="w-3 h-3" />Passou</Badge>;
  if (status === "failed") return <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/15 gap-1"><XCircle className="w-3 h-3" />Falhou</Badge>;
  if (status === "error") return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 gap-1"><AlertTriangle className="w-3 h-3" />Erro</Badge>;
  if (status === "running") return <Badge variant="outline" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Conversando</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Na fila</Badge>;
}

function Transcript({ entries }: { entries: SimEntry[] }) {
  const [showTools, setShowTools] = useState(false);
  const hasTools = entries.some((e) => e.who === "ferramenta");
  return (
    <div className="space-y-1.5">
      {hasTools && (
        <button type="button" className="text-[11px] text-primary flex items-center gap-1" onClick={() => setShowTools((v) => !v)}>
          <Wrench className="w-3 h-3" /> {showTools ? "Esconder" : "Mostrar"} consultas da IA (agenda, preços…)
        </button>
      )}
      {entries.filter((e) => showTools || e.who !== "ferramenta").map((e, i) => {
        if (e.who === "ferramenta") {
          return (
            <pre key={i} className="text-[10px] leading-snug whitespace-pre-wrap break-words bg-muted/60 border border-border/50 rounded-lg p-2 text-muted-foreground max-h-40 overflow-y-auto">{e.text}</pre>
          );
        }
        const mine = e.who === "ia";
        return (
          <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap break-words ${mine ? "bg-violet-500/10 border border-violet-500/20" : "bg-muted"}`}>
              {e.kind && e.kind !== "text" && <span className="block text-[10px] font-bold text-muted-foreground mb-0.5">{MEDIA_LABEL[e.kind] || "Arquivo"}</span>}
              {e.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultRow({ r }: { r: SimResult }) {
  const [open, setOpen] = useState(false);
  const failedChecks = (r.checks || []).filter((c) => c.ok === false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button type="button" className="w-full flex items-center gap-2 p-3 text-left" onClick={() => setOpen((v) => !v)}>
        {open ? <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{r.scenario_title || r.scenario_key}</p>
          {failedChecks.length > 0 && (
            <p className="text-[11px] text-red-700 truncate">Falhou em: {failedChecks.map((c) => c.label).join(" · ")}</p>
          )}
          {r.status === "error" && r.error && <p className="text-[11px] text-amber-700 truncate">{r.error}</p>}
        </div>
        <StatusBadge status={r.status} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          {r.summary && <p className="text-xs text-muted-foreground">{r.summary}</p>}
          {(r.checks || []).length > 0 && (
            <div className="space-y-1">
              {r.checks.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 mt-0.5">{c.ok === true ? "✅" : c.ok === false ? "❌" : "➖"}</span>
                  <div className="min-w-0">
                    <span className={c.ok === false ? "font-semibold text-red-700" : "font-medium"}>{c.label}</span>
                    {c.note && <span className="text-muted-foreground"> — {c.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {r.turns} vez(es) do cliente{r.end_reason ? ` · terminou: ${r.end_reason}` : ""} · custo {formatBrlFromUsd(Number(r.cost_usd) || 0)}
          </p>
          <Transcript entries={r.transcript || []} />
        </div>
      )}
    </div>
  );
}

export function AiSimulatorDialog({ open, onOpenChange, model }: { open: boolean; onOpenChange: (v: boolean) => void; model: string }) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [runs, setRuns] = useState<SimRun[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<SimResult[]>([]);
  const [scope, setScope] = useState<"todos" | "geral" | "empresa">("todos");
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scenarioCount, setScenarioCount] = useState(0);
  const lastResume = useRef(0);

  const selected = runs.find((r) => r.id === selectedId) || null;

  const loadRuns = useCallback(async () => {
    if (!companyId) return;
    const { data } = await simDb.from("ai_sim_runs").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(10);
    const list = (data || []) as SimRun[];
    setRuns(list);
    setSelectedId((cur) => cur || list[0]?.id || null);
  }, [companyId]);

  const loadResults = useCallback(async (runId: string) => {
    const { data } = await simDb.from("ai_sim_results")
      .select("id, scenario_title, scenario_key, scope, status, transcript, checks, summary, end_reason, error, turns, cost_usd")
      .eq("run_id", runId);
    setResults((data || []) as SimResult[]);
  }, []);

  useEffect(() => {
    if (!open || !companyId) return;
    setLoading(true);
    loadRuns().finally(() => setLoading(false));
    // Cenários gerais + os da empresa
    simDb.from("ai_sim_scenarios").select("id", { count: "exact", head: true })
      .eq("is_active", true).or(`company_id.is.null,company_id.eq.${companyId}`)
      .then(({ count }: { count: number | null }) => setScenarioCount(count || 0));
  }, [open, companyId, loadRuns]);

  useEffect(() => {
    if (open && selectedId) loadResults(selectedId);
  }, [open, selectedId, loadResults]);

  // Rodada em andamento: atualiza a cada 5 s; a cada 1 min pede para o servidor
  // retomar cenários parados (trabalhador que caiu)
  useEffect(() => {
    if (!open || !selected || selected.status !== "running") return;
    const t = setInterval(async () => {
      await loadRuns();
      await loadResults(selected.id);
      if (Date.now() - lastResume.current > RESUME_MS) {
        lastResume.current = Date.now();
        supabase.functions.invoke("ai-simulator", { body: { action: "resume", run_id: selected.id } }).catch(() => undefined);
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [open, selected, loadRuns, loadResults]);

  const start = async (extra: Record<string, unknown> = {}) => {
    if (!companyId) return;
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-simulator", { body: { action: "start", company_id: companyId, ...extra } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      lastResume.current = Date.now();
      setSelectedId(data.run_id);
      await loadRuns();
      toast({ title: data.already_running ? "Já tem uma rodada em andamento" : "Testes iniciados", description: data.already_running ? "Mostrando o andamento dela." : `${data.total} conversas simuladas. Leva alguns minutos — pode fechar e voltar depois.` });
    } catch (err) {
      toast({ title: "Não deu para iniciar os testes", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const visible = useMemo(
    () => results.filter((r) => scope === "todos" || r.scope === scope).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.scenario_title || "").localeCompare(b.scenario_title || "")),
    [results, scope],
  );
  const doneCount = results.filter((r) => ["passed", "failed", "error"].includes(r.status)).length;
  const liveCost = results.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);
  // Custo médio real da última rodada com este modelo; sem histórico, a estimativa da tabela de preços
  const lastDone = runs.find((r) => r.status === "done" && r.model === model && r.total > 0 && Number(r.cost_usd) > 0);
  const perConversation = lastDone ? Number(lastDone.cost_usd) / lastDone.total : estimateTypicalConversationUsd(model) * 1.5 + HELPER_USD_PER_CONVERSATION;
  const estimate = scenarioCount * perConversation;
  const hasFailures = !!selected && selected.status === "done" && selected.failed + selected.errors > 0;
  const running = selected?.status === "running";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] max-h-[92vh] flex flex-col p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-violet-600" />
            </div>
            Testes da IA
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Uma IA faz o papel do cliente e conversa com a sua IA usando a agenda, a grade de preços e os pacotes de verdade — sem enviar nada pelo WhatsApp e sem criar visitas, leads ou festas. Outra IA confere cada conversa.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {scenarioCount} cenários · modelo {getAiModel(model)?.label || model} · custo {lastDone ? "médio" : "estimado"} ≈ {formatBrlFromUsd(estimate)} por rodada
              </p>
              <div className="flex gap-2 shrink-0">
                {hasFailures && (
                  <Button size="sm" variant="outline" className="gap-1" disabled={starting || running} onClick={() => start({ rerun_failed_of: selected!.id })}>
                    <RotateCcw className="w-3.5 h-3.5" /> Só os que falharam
                  </Button>
                )}
                <Button size="sm" className="gap-1" disabled={starting || running} onClick={() => start()}>
                  {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Rodar testes
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Carregando…</div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma rodada ainda. Toque em <span className="font-semibold">Rodar testes</span>.</p>
          ) : (
            <>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {runs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] text-left ${r.id === selectedId ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                  >
                    <span className="block font-semibold">{fmtDate(r.created_at)}</span>
                    <span className="text-muted-foreground">{r.status === "running" ? "em andamento" : `${r.passed}/${r.total} passaram`}</span>
                  </button>
                ))}
              </div>

              {selected && (
                <div className="rounded-xl border border-border p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div><p className="text-lg font-bold text-green-700">{running ? results.filter((r) => r.status === "passed").length : selected.passed}</p><p className="text-[11px] text-muted-foreground">passaram</p></div>
                  <div><p className="text-lg font-bold text-red-700">{running ? results.filter((r) => r.status === "failed").length : selected.failed}</p><p className="text-[11px] text-muted-foreground">falharam</p></div>
                  <div><p className="text-lg font-bold">{running ? `${doneCount}/${selected.total}` : selected.errors}</p><p className="text-[11px] text-muted-foreground">{running ? "concluídas" : "erros"}</p></div>
                  <div><p className="text-lg font-bold">{formatBrlFromUsd(running ? liveCost : Number(selected.cost_usd) || 0)}</p><p className="text-[11px] text-muted-foreground">custo da rodada</p></div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 bg-muted rounded-xl p-1">
                {([["todos", "Todos"], ["geral", "Gerais"], ["empresa", "Da empresa"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setScope(k)} className={`rounded-lg py-1.5 text-xs font-medium ${scope === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{label}</button>
                ))}
              </div>

              <div className="space-y-2">
                {visible.map((r) => <ResultRow key={r.id} r={r} />)}
                {visible.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum cenário neste filtro.</p>}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
