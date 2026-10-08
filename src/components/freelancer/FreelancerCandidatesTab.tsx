import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageCircle, Check, X, ArrowRightLeft, RotateCcw, MapPin, Bot, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { UnitSelectDialog } from "@/pages/FreelancerManager";
import { fetchConnectedInstances, sendFreelancerApprovalMessage, type WaInstance } from "@/lib/freelancerApproval";
import { ageOn, candidateScore, dayIndex, distanceToBuffet, PARTY_DAYS, splitSavedAddress, WEEK_DAYS } from "@/lib/freelancerCandidate";

// Aba Candidatos: quem se candidatou pelo formulário "Trabalhe Conosco"
// (purpose = 'candidatura'), em funil — Novos → Em conversa → Aprovados /
// Não aprovados —, ordenado pela nota (disponibilidade, distância, buffet,
// experiência). Aprovar usa o mesmo caminho do Cadastro: mensagem no WhatsApp
// e a pessoa passa a aparecer nas escalas.

type Stage = "novo" | "conversa" | "aprovado" | "recusado";
type StageFilter = Stage | "todos";
const STAGES: { id: Stage; label: string }[] = [
  { id: "novo", label: "Novos" },
  { id: "conversa", label: "Em conversa" },
  { id: "aprovado", label: "Aprovados" },
  { id: "recusado", label: "Não aprovados" },
];
const FILTERS: { id: StageFilter; label: string }[] = [{ id: "todos", label: "Todos" }, ...STAGES];
// Etiqueta da etapa no cartão (fora de "Novos")
const STAGE_PILL: Record<Stage, { label: string; cls: string } | null> = {
  novo: null,
  conversa: { label: "Em conversa", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  recusado: { label: "Não aprovado", cls: "bg-destructive/10 text-destructive" },
};

interface ResponseRow {
  id: string;
  respondent_name: string | null;
  answers: unknown;
  photo_url: string | null;
  approval_status: string | null;
  candidate_stage: string | null;
  distance_km: number | string | null;
  bairro: string | null;
  source: string | null;
  created_at: string;
}

interface Candidate {
  id: string;
  name: string;
  photo: string | null;
  phone: string;
  age: number | null;
  bairro: string | null;
  address: string | null;
  km: number | null;
  roles: string[];
  days: string[];
  experience: boolean;
  workedBuffet: boolean;
  buffetName: string | null;
  about: string | null;
  viaBia: boolean;
  createdAt: Date;
  stage: Stage;
  score: ReturnType<typeof candidateScore>;
}

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);

function toCandidate(r: ResponseRow, today: Date): Candidate {
  const answers = Array.isArray(r.answers) ? (r.answers as Array<{ questionId: string; value: unknown }>) : [];
  const a = (id: string) => answers.find((x) => x.questionId === id)?.value;
  const km = r.distance_km === null || r.distance_km === undefined || r.distance_km === "" ? null : Number(r.distance_km);
  const buffetName = a("qual_buffet") ? String(a("qual_buffet")).trim() || null : null;
  const workedBuffet = a("trabalhou_buffet") === true || !!buffetName;
  const experience = a("experiencia") === true;
  const days = asList(a("dias"));
  const stage: Stage = r.approval_status === "aprovado" ? "aprovado"
    : r.approval_status === "rejeitado" ? "recusado"
    : r.candidate_stage === "conversa" ? "conversa" : "novo";
  return {
    id: r.id,
    name: (r.respondent_name || String(a("nome") || "")).trim() || "Sem nome",
    photo: r.photo_url,
    phone: String(a("telefone") || ""),
    age: ageOn(a("data_nascimento") as string, today),
    bairro: r.bairro,
    address: a("endereco") ? String(a("endereco")) : null,
    km: Number.isFinite(km) ? km : null,
    roles: asList(a("funcao")),
    days,
    experience,
    workedBuffet,
    buffetName,
    about: a("sobre") ? String(a("sobre")) : null,
    viaBia: r.source === "bia",
    createdAt: new Date(r.created_at),
    stage,
    score: candidateScore({ days, km: Number.isFinite(km) ? km : null, workedBuffet, experience }),
  };
}

const grade = (s: number) => (s >= 75 ? { t: "Ótimo", color: "hsl(152 62% 38%)" } : s >= 50 ? { t: "Bom", color: "hsl(38 92% 45%)" } : { t: "Regular", color: "hsl(14 72% 52%)" });
const zoneClass = (km: number | null) => km === null ? "bg-muted text-muted-foreground"
  : km <= 5 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
  : km <= 10 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  : "bg-orange-500/15 text-orange-700 dark:text-orange-400";
const fmtKm = (km: number | null) => (km === null ? "sem distância" : `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`);
const zoneLabel = (km: number | null) => (km === null ? "" : km <= 5 ? " · perto" : km <= 10 ? " · médio" : " · longe");
function ago(d: Date): string {
  const h = Math.max(0, Math.round((Date.now() - d.getTime()) / 3600000));
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h} h`;
  const days = Math.round(h / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}
/** Telefone para a Central de Atendimento (com 55) */
const phoneForChat = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
};

function Avatar({ c, size }: { c: Candidate; size: number }) {
  const initials = c.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (c.photo) return <img src={c.photo} alt={`Selfie de ${c.name}`} className="rounded-full object-cover shrink-0 bg-muted" style={{ width: size, height: size }} loading="lazy" />;
  return (
    <div className="rounded-full shrink-0 bg-primary/15 text-primary font-bold flex items-center justify-center" style={{ width: size, height: size, fontSize: size / 2.8 }}>
      {initials || "?"}
    </div>
  );
}

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const g = grade(score);
  return (
    <div className="rounded-full grid place-items-center shrink-0" style={{ width: size, height: size, background: `conic-gradient(${g.color} ${score}%, hsl(var(--muted)) 0)` }} aria-label={`Nota ${score} de 100, ${g.t}`}>
      <span className="rounded-full bg-card grid place-items-center font-bold tabular-nums" style={{ width: size - 12, height: size - 12, fontSize: size / 3.1 }}>{score}</span>
    </div>
  );
}

export function FreelancerCandidatesTab() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [setupMissing, setSetupMissing] = useState(false);
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [stage, setStage] = useState<StageFilter>("novo");
  const [role, setRole] = useState<string | null>(null);
  const [sort, setSort] = useState<"score" | "recent">("score");
  const [weekendOnly, setWeekendOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRefuse, setConfirmRefuse] = useState(false);
  const [unitDialog, setUnitDialog] = useState<{ instances: WaInstance[]; candidate: Candidate } | null>(null);
  const [originAddress, setOriginAddress] = useState<string | null>(null);
  // Distância que não saiu no envio: recalcula aqui (uma tentativa por cadastro nesta tela)
  const triedDistance = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data: tpls, error: tplErr } = await (supabase as any)
      .from("freelancer_templates")
      .select("id, questions, origin_address")
      .eq("company_id", companyId)
      .eq("purpose", "candidatura");
    if (tplErr) {
      setSetupMissing(true);
      setLoading(false);
      return;
    }
    const ids = ((tpls || []) as Array<{ id: string; questions: unknown }>).map((t) => t.id);
    const options = new Set<string>();
    for (const t of (tpls || []) as Array<{ questions: unknown }>) {
      const qs = Array.isArray(t.questions) ? (t.questions as Array<{ id: string; options?: string[] }>) : [];
      for (const o of qs.find((q) => q.id === "funcao")?.options || []) options.add(o);
    }
    setRoleOptions([...options]);
    setOriginAddress(((tpls || []) as Array<{ origin_address: string | null }>).find((t) => t.origin_address)?.origin_address || null);
    if (ids.length === 0) {
      setSetupMissing(true);
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await (supabase as any)
      .from("freelancer_responses")
      .select("id, respondent_name, answers, photo_url, approval_status, candidate_stage, distance_km, bairro, source, created_at")
      .in("template_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Erro ao carregar candidatos", description: error.message, variant: "destructive" });
    setRows((data || []) as ResponseRow[]);
    setSetupMissing(false);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  useEffect(() => {
    if (!originAddress || rows.length === 0) return;
    const missing = rows.filter((r) => (r.distance_km === null || r.distance_km === undefined) && !triedDistance.current.has(r.id)).slice(0, 5);
    if (missing.length === 0) return;
    missing.forEach((r) => triedDistance.current.add(r.id));
    let cancelled = false;
    (async () => {
      let changed = false;
      for (const r of missing) {
        const answers = Array.isArray(r.answers) ? (r.answers as Array<{ questionId: string; value: unknown }>) : [];
        const address = answers.find((x) => x.questionId === "endereco")?.value as string | undefined;
        const cep = answers.find((x) => x.questionId === "endereco_cep")?.value as string | undefined;
        if (!address && !cep) continue;
        const km = await distanceToBuffet(originAddress, splitSavedAddress(address, cep));
        if (cancelled) return;
        if (km !== null) {
          const { error } = await (supabase as any).from("freelancer_responses").update({ distance_km: km }).eq("id", r.id);
          if (!error) changed = true;
        }
      }
      if (changed && !cancelled) load();
    })();
    return () => { cancelled = true; };
  }, [rows, originAddress, load]);

  const today = useMemo(() => new Date(), []);
  const candidates = useMemo(() => rows.map((r) => toCandidate(r, today)), [rows, today]);
  const counts = useMemo(() => ({
    todos: candidates.length,
    ...Object.fromEntries(STAGES.map((s) => [s.id, candidates.filter((c) => c.stage === s.id).length])),
  }) as Record<StageFilter, number>, [candidates]);
  const visible = useMemo(() => candidates
    .filter((c) => stage === "todos" || c.stage === stage)
    .filter((c) => !role || c.roles.includes(role))
    .filter((c) => !weekendOnly || c.days.some((d) => { const i = dayIndex(d); return i !== null && PARTY_DAYS.has(i); }))
    .sort((a, b) => (sort === "score" ? b.score.total - a.score.total || b.createdAt.getTime() - a.createdAt.getTime() : b.createdAt.getTime() - a.createdAt.getTime())),
  [candidates, stage, role, weekendOnly, sort]);
  const open = candidates.find((c) => c.id === openId) || null;

  // Depois da ação, a tela vai para a etapa de destino (o cartão não "some")
  const update = async (c: Candidate, patch: Record<string, unknown>, done: string, nextStage?: Stage) => {
    setBusy(c.id);
    const { error } = await (supabase as any).from("freelancer_responses").update(patch).eq("id", c.id);
    setBusy(null);
    if (error) {
      toast({ title: "Não deu para atualizar", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: done });
    setOpenId(null);
    setConfirmRefuse(false);
    if (nextStage && stage !== "todos") setStage(nextStage);
    await load();
    return true;
  };

  const sendApproval = async (c: Candidate, instance: WaInstance) => {
    const phone = c.phone.replace(/\D/g, "");
    try {
      await sendFreelancerApprovalMessage(companyId as string, instance, phone, c.name.split(" ")[0] ? c.name : "freelancer", c.id);
      toast({ title: `${c.name.split(" ")[0]} aprovado(a)! ✅`, description: "Recebeu a mensagem no WhatsApp e já aparece nas escalas." });
    } catch (err: any) {
      toast({ title: "Aprovado, mas a mensagem não saiu", description: err?.message || "Tente reenviar pelo Cadastro.", variant: "destructive" });
    }
  };

  const approve = async (c: Candidate) => {
    const { data: { user } } = await supabase.auth.getUser();
    const ok = await update(c, { approval_status: "aprovado", approved_by: user?.id, approved_at: new Date().toISOString() }, `${c.name.split(" ")[0]} aprovado(a)`, "aprovado");
    if (!ok) return;
    const phone = c.phone.replace(/\D/g, "");
    if (phone.length < 10) {
      toast({ title: "Aprovado(a) ✅", description: "Sem telefone válido — a mensagem de aprovação não foi enviada." });
      return;
    }
    const instances = await fetchConnectedInstances(companyId as string);
    if (instances.length === 0) {
      toast({ title: "Aprovado(a) ✅", description: "WhatsApp não conectado — mensagem não enviada." });
      return;
    }
    if (instances.length === 1) {
      await sendApproval(c, instances[0]);
      load();
      return;
    }
    setUnitDialog({ instances, candidate: c });
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando candidatos…</div>;
  }

  if (setupMissing) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground space-y-1 max-w-xl">
        <p className="font-semibold text-foreground">Ainda não há formulário de candidatura</p>
        <p>Quando o formulário "Trabalhe Conosco" estiver criado, quem se candidatar aparece aqui, com nota, distância e o funil de aprovação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <UnitSelectDialog
        open={!!unitDialog}
        onOpenChange={(v) => { if (!v) { setUnitDialog(null); load(); } }}
        instances={unitDialog?.instances || []}
        onSelect={async (inst) => {
          if (unitDialog) await sendApproval(unitDialog.candidate, inst);
          setUnitDialog(null);
          load();
        }}
        title="Mandar a aprovação por qual número?"
      />

      {/* Funil */}
      <div className="grid grid-cols-5 gap-1 bg-card rounded-2xl p-1.5 shadow-sm border border-border/50" role="tablist" aria-label="Etapa">
        {FILTERS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={stage === s.id}
            onClick={() => setStage(s.id)}
            className={`rounded-xl py-2 px-1 grid justify-items-center gap-0.5 transition-colors ${stage === s.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60"}`}
          >
            <span className={`text-xl font-bold tabular-nums ${stage === s.id ? "text-primary" : "text-foreground"}`}>{counts[s.id]}</span>
            <span className="text-[10.5px] font-bold leading-tight text-center">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5" aria-label="Vaga">
          {[null, ...roleOptions].map((r) => (
            <button
              key={r || "todas"}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${role === r ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}
            >
              {r || "Todas as vagas"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 bg-card border border-border rounded-xl p-0.5" role="group" aria-label="Ordenar">
            {([["score", "Melhor nota"], ["recent", "Mais recentes"]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setSort(k)} className={`rounded-lg px-3 py-1 text-[13px] font-semibold ${sort === k ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>{label}</button>
            ))}
          </div>
          <label htmlFor="candidates-weekend" className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground cursor-pointer">
            <input id="candidates-weekend" type="checkbox" checked={weekendOnly} onChange={(e) => setWeekendOnly(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Só quem pode no fim de semana
          </label>
        </div>
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border/50 p-8 text-center text-sm text-muted-foreground">
          <UserPlus className="h-6 w-6 mx-auto mb-2 opacity-60" />
          {candidates.length === 0
            ? "Ninguém se candidatou ainda. Quem preencher o formulário Trabalhe Conosco (pelo link ou pela Bia) aparece aqui."
            : "Nenhum candidato nesta etapa com esses filtros."}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {visible.map((c) => {
            const stars = Math.round(c.score.total / 20);
            const isNew = c.stage === "novo" && Date.now() - c.createdAt.getTime() < 24 * 3600000;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setOpenId(c.id); setConfirmRefuse(false); }}
                className="w-full text-left grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-card rounded-2xl px-3.5 py-3 shadow-sm border border-border/50 hover:border-border transition-colors"
              >
                <Avatar c={c} size={52} />
                <div className="min-w-0 grid gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-[15px] truncate">{c.name}</span>
                    {isNew && <span className="text-[10px] font-extrabold rounded-full px-1.5 py-0.5 bg-primary/10 text-primary">Novo</span>}
                    {STAGE_PILL[c.stage] && <span className={`text-[10px] font-extrabold rounded-full px-1.5 py-0.5 ${STAGE_PILL[c.stage]!.cls}`}>{STAGE_PILL[c.stage]!.label}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.roles.length > 0 ? c.roles.map((r) => (
                      <span key={r} className="text-[11.5px] font-semibold rounded-full border border-border bg-muted/50 px-2 py-0.5">{r}</span>
                    )) : <span className="text-[11.5px] text-muted-foreground">vaga não informada</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${zoneClass(c.km)}`}><MapPin className="h-3 w-3" />{fmtKm(c.km)}</span>
                    {c.viaBia
                      ? <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-extrabold text-[10.5px] bg-violet-500/15 text-violet-700 dark:text-violet-300"><Bot className="h-3 w-3" />via Bia</span>
                      : <span>via link</span>}
                    <span>{ago(c.createdAt)}</span>
                  </div>
                </div>
                <div className="grid justify-items-center gap-0.5">
                  <ScoreRing score={c.score.total} />
                  <span className="text-[10px] tracking-wider text-amber-500" aria-hidden="true">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[12px] text-muted-foreground">
        Nota de 0 a 100: disponibilidade até 35 (sexta, sábado e domingo valem mais) · distância até 30 · já trabalhou em buffet 20 · experiência 15. A nota só ordena a lista — quem decide é a equipe.
      </p>

      {/* Detalhe */}
      <Sheet open={!!open} onOpenChange={(v) => { if (!v) { setOpenId(null); setConfirmRefuse(false); } }}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl sm:max-w-xl sm:mx-auto">
          {open && (
            <div className="space-y-4 pb-2">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3.5">
                  <Avatar c={open} size={72} />
                  <div className="min-w-0 grid gap-1">
                    <SheetTitle className="text-xl">{open.name}</SheetTitle>
                    <div className="flex flex-wrap gap-1">
                      {open.roles.map((r) => <span key={r} className="text-[11.5px] font-semibold rounded-full border border-border bg-muted/50 px-2 py-0.5">{r}</span>)}
                    </div>
                    <SheetDescription className="text-xs">
                      {open.viaBia ? "Veio pela Bia" : "Veio pelo link"} · se candidatou {ago(open.createdAt)}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Idade", open.age !== null ? `${open.age} anos` : "—"],
                  ["Telefone", open.phone || "—"],
                  ["Bairro", open.bairro || "—"],
                  ["Distância", `${fmtKm(open.km)}${zoneLabel(open.km)}`],
                  ["Tem experiência", open.experience ? "Sim" : "Não"],
                  ["Já trabalhou em buffet", open.buffetName || (open.workedBuffet ? "Sim" : "Não")],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted/50 px-3 py-2 min-w-0">
                    <span className="block text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
                    <span className="font-semibold text-sm break-words">{value}</span>
                  </div>
                ))}
                {open.address && (
                  <div className="col-span-2 rounded-xl bg-muted/50 px-3 py-2 min-w-0">
                    <span className="block text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Endereço</span>
                    <span className="font-semibold text-sm break-words">{open.address}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
                  <span className="font-semibold">Disponibilidade</span>
                  <span className="text-[12px] text-muted-foreground">sex, sáb e dom são dias de festa</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {WEEK_DAYS.map((d, i) => {
                    const yes = open.days.some((x) => dayIndex(x) === i);
                    return (
                      <div key={d} className={`text-center rounded-lg py-1.5 text-[12px] font-bold border ${yes ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted/50 text-muted-foreground"} ${PARTY_DAYS.has(i) ? (yes ? "border-emerald-500" : "border-border") : "border-transparent"}`}>{d}</div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Nota {open.score.total}</span>
                  <span className="text-[12px] font-bold" style={{ color: grade(open.score.total).color }}>{grade(open.score.total).t}</span>
                </div>
                {open.score.parts.map((p) => (
                  <div key={p.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1 text-[13px]">
                    <span>{p.label} <span className="text-muted-foreground text-[12px]">· {p.why}</span></span>
                    <b className="tabular-nums">{p.got}/{p.max}</b>
                    <div className="col-span-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(p.got / p.max) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-[11.5px] text-muted-foreground">Distância em linha reta até o buffet, calculada pelo CEP do formulário.</p>
              </div>

              {open.about && (
                <div className="rounded-xl bg-muted/50 px-3 py-2">
                  <span className="block text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">Sobre</span>
                  <p className="text-sm whitespace-pre-wrap break-words">{open.about}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={!open.phone}
                  onClick={() => navigate(`/atendimento?phone=${phoneForChat(open.phone)}`)}
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" /> Conversa
                </Button>
                {open.stage === "novo" && (
                  <Button type="button" variant="outline" className="rounded-xl" disabled={busy === open.id} onClick={() => update(open, { candidate_stage: "conversa" }, `${open.name.split(" ")[0]} em conversa`, "conversa")}>
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" /> Em conversa
                  </Button>
                )}
                {open.stage === "conversa" && (
                  <Button type="button" variant="outline" className="rounded-xl" disabled={busy === open.id} onClick={() => update(open, { candidate_stage: null }, `${open.name.split(" ")[0]} voltou para Novos`, "novo")}>
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Voltar p/ Novos
                  </Button>
                )}
                {(open.stage === "recusado" || open.stage === "aprovado") && (
                  <Button type="button" variant="outline" className="rounded-xl" disabled={busy === open.id} onClick={() => update(open, { approval_status: "pendente", candidate_stage: "conversa" }, `${open.name.split(" ")[0]} voltou para Em conversa`, "conversa")}>
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Reabrir
                  </Button>
                )}
                {open.stage !== "aprovado" && (
                  <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy === open.id} onClick={() => approve(open)}>
                    {busy === open.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />} Aprovar
                  </Button>
                )}
                {open.stage !== "recusado" && open.stage !== "aprovado" && !confirmRefuse && (
                  <Button type="button" variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setConfirmRefuse(true)}>
                    <X className="h-4 w-4 mr-1.5" /> Não aprovar
                  </Button>
                )}
              </div>
              {confirmRefuse && (
                <div className="rounded-xl bg-destructive/10 p-3 space-y-2 text-sm">
                  <p>Não aprovar {open.name.split(" ")[0]}? O cadastro fica guardado em "Não aprovados" e dá para reabrir depois.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => setConfirmRefuse(false)}>Cancelar</Button>
                    <Button type="button" variant="destructive" className="rounded-xl" disabled={busy === open.id} onClick={() => update(open, { approval_status: "rejeitado" }, `${open.name.split(" ")[0]} não aprovado(a)`, "recusado")}>Não aprovar</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
