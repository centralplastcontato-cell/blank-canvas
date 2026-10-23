import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { pickCardapioForPackage } from "@/lib/cardapioForPackage";
import { buildTimeline, parseSchedule, partyPhase, readiness } from "@/lib/partyDay";
import { supabase } from "@/integrations/supabase/client";
import { buildPublicFormPath } from "@/lib/publicFormRoutes";
import { cn } from "@/lib/utils";
import {
  Loader2, Check, AlertTriangle, PartyPopper, ChevronRight, ChevronDown, Shield, ExternalLink,
  ClipboardList, UtensilsCrossed, Star, Users, ListChecks, UserCheck, Wrench, Eye, Info, Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Página do dia da festa (/festa/:id), aberta pela equipe sem login.
// Redesenhada em 22/10: visual claro como o resto do Celebrei, dados da festa
// legíveis, o que o cliente já respondeu, roteiro do dia e a equipe. Alerta só
// quando há algo de verdade (ex.: Pré-Festa sem resposta perto da festa);
// ficha do dia que não foi criada não é alerta.

interface BirthdayChild { name?: string; age?: string }
interface EventOptional { name?: string; value?: number }

interface PartyEvent {
  id: string;
  company_id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  guest_count: number | null;
  unit: string | null;
  status: string;
  package_name: string | null;
  child_name: string | null;
  child_age: string | null;
  birthday_children: BirthdayChild[] | null;
  parent_names: string | null;
  event_optionals: EventOptional[] | null;
  notes: string | null;
}

interface PartyControlModules {
  checklist: boolean; staff: boolean; maintenance: boolean; monitoring: boolean;
  attendance: boolean; info: boolean; prefesta: boolean; cardapio: boolean; avaliacao: boolean;
}

interface CompanyInfo { name: string; logo_url: string | null; slug: string; settings: Record<string, unknown> | null }
interface ChecklistItem { id: string; title: string; is_completed: boolean; sort_order: number }
interface Template { id: string; name: string; slug: string | null }

interface DayDetails {
  prefesta: { responded_at: string } | null;
  cardapio: { responded_at: string; template_name: string | null; items: string[] } | null;
  avaliacao: { responded_at: string; score: number | null } | null;
  staff: { name: string; role: string | null }[];
  staff_id: string | null;
  maintenance_id: string | null;
  monitoring_id: string | null;
  attendance_id: string | null;
}

const EMPTY_DETAILS: DayDetails = {
  prefesta: null, cardapio: null, avaliacao: null, staff: [],
  staff_id: null, maintenance_id: null, monitoring_id: null, attendance_id: null,
};

function parsePartyControlModules(settings: Record<string, unknown> | null): PartyControlModules {
  const defaults: PartyControlModules = {
    checklist: true, staff: true, maintenance: true, monitoring: true,
    attendance: true, info: true, prefesta: false, cardapio: false, avaliacao: false,
  };
  const pcm = settings?.party_control_modules;
  if (!pcm || typeof pcm !== "object" || Array.isArray(pcm)) return defaults;
  const m = pcm as Record<string, unknown>;
  return {
    checklist: m.checklist !== false, staff: m.staff !== false,
    maintenance: m.maintenance !== false, monitoring: m.monitoring !== false,
    attendance: m.attendance !== false, info: m.info !== false,
    prefesta: m.prefesta === true, cardapio: m.cardapio === true, avaliacao: m.avaliacao === true,
  };
}

function parentsText(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => p?.name).map((p) => [p.name, p.relation && `(${p.relation})`, p.phone && `· ${p.phone}`].filter(Boolean).join(" ")).join("\n") || null;
    }
    if (parsed && typeof parsed === "object" && parsed.name) return parsed.name;
  } catch { /* texto simples */ }
  return raw;
}

// Funções do banco ainda fora dos tipos gerados
type LooseRpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
const looseRpc: LooseRpc = (fn, args) => (supabase.rpc as unknown as LooseRpc).call(supabase, fn, args);

const POLL_INTERVAL = 30_000;
const CHILD_TONES = [
  "bg-pink-50 text-pink-900 border-pink-100",
  "bg-sky-50 text-sky-900 border-sky-100",
  "bg-amber-50 text-amber-900 border-amber-100",
  "bg-emerald-50 text-emerald-900 border-emerald-100",
];

export default function PublicPartyControl() {
  const { eventId } = useParams<{ eventId: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [details, setDetails] = useState<DayDetails>(EMPTY_DETAILS);
  // false enquanto a função get_party_day_details não existir no banco: aí não
  // dá para afirmar que o cliente não respondeu
  const [detailsKnown, setDetailsKnown] = useState(false);
  const [templates, setTemplates] = useState<{ avaliacao: Template[]; prefesta: Template[]; cardapio: Template[] }>({ avaliacao: [], prefesta: [], cardapio: [] });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [showAllMenu, setShowAllMenu] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchStatus = async () => {
    const [checklistRes, infoRes, statusRes, detailsRes] = await Promise.all([
      supabase.from("event_checklist_items").select("id, title, is_completed, sort_order").eq("event_id", eventId!).order("sort_order"),
      supabase.rpc("get_event_info_entries_by_event_public", { _event_id: eventId! }),
      supabase.rpc("get_party_control_module_status", { _event_id: eventId! }),
      looseRpc("get_party_day_details", { _event_id: eventId! }),
    ]);
    setChecklistItems((checklistRes.data || []) as ChecklistItem[]);
    setInfoId(infoRes.data?.[0]?.id || null);
    const status = (Array.isArray(statusRes.data) ? statusRes.data[0] : null) as { attendance_guest_count?: number } | null;
    setAttendanceCount(status?.attendance_guest_count || 0);
    if (!detailsRes.error && detailsRes.data) {
      setDetailsKnown(true);
      const d = detailsRes.data as Partial<DayDetails>;
      setDetails({
        ...EMPTY_DETAILS,
        ...d,
        staff: Array.isArray(d.staff) ? d.staff : [],
        cardapio: d.cardapio ? { ...d.cardapio, items: Array.isArray(d.cardapio.items) ? d.cardapio.items : [] } : null,
      });
    }
    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (!eventId) return;
    const initialLoad = async () => {
      const { data: evArr } = await supabase.rpc("get_event_public_info", { _event_id: eventId });
      const evData = Array.isArray(evArr) ? (evArr[0] as unknown as PartyEvent | undefined) : undefined;
      if (!evData) { setNotFound(true); setLoading(false); return; }
      setEvent(evData);
      const companyId = evData.company_id;

      const [companyRes, tmplRes] = await Promise.all([
        supabase.rpc("get_company_public_with_settings", { _company_id: companyId }),
        looseRpc("get_party_form_templates", { _event_id: eventId }),
      ]);
      const c = Array.isArray(companyRes.data) ? (companyRes.data[0] as { name: string; logo_url: string | null; slug: string; settings: unknown } | undefined) : undefined;
      if (c) {
        const settings = (c.settings && typeof c.settings === "object" && !Array.isArray(c.settings)) ? c.settings as Record<string, unknown> : null;
        setCompany({ name: c.name, logo_url: c.logo_url, slug: c.slug, settings });
      }
      if (!tmplRes.error && Array.isArray(tmplRes.data)) {
        const rows = tmplRes.data as (Template & { form_type: string })[];
        setTemplates({
          avaliacao: rows.filter((r) => r.form_type === "avaliacao"),
          prefesta: rows.filter((r) => r.form_type === "prefesta"),
          cardapio: rows.filter((r) => r.form_type === "cardapio"),
        });
      }
      await fetchStatus();
      setLoading(false);
    };
    initialLoad();
    const poll = setInterval(fetchStatus, POLL_INTERVAL);
    const clock = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearInterval(poll); clearInterval(clock); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const modules = useMemo(() => parsePartyControlModules(company?.settings ?? null), [company]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F2FA]">
        <div className="text-center space-y-3">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600 mx-auto" />
          <p className="text-sm text-slate-600">Carregando a festa…</p>
        </div>
      </div>
    );
  }

  if (notFound || !event || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F4F2FA]">
        <div className="text-center space-y-3">
          <Shield className="h-14 w-14 mx-auto text-slate-400" />
          <h1 className="text-xl font-bold text-slate-900">Festa não encontrada</h1>
          <p className="text-slate-600 text-sm">Este link pode estar incorreto ou a festa foi removida.</p>
        </div>
      </div>
    );
  }

  const companySlug = company.slug || "";
  const formUrl = (type: "avaliacao" | "prefesta" | "cardapio") => {
    const t = type === "cardapio"
      ? pickCardapioForPackage(templates.cardapio, event.package_name, company.name)
      : templates[type][0];
    return t ? buildPublicFormPath({ type, templateId: t.id, templateSlug: t.slug, companySlug }) : null;
  };
  const copyLink = async (key: string, path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* sem permissão de copiar */ }
  };

  const children: { name: string; age: string }[] = [];
  if (Array.isArray(event.birthday_children) && event.birthday_children.length) {
    event.birthday_children.forEach((c) => c?.name && children.push({ name: c.name, age: c.age || "" }));
  } else if (event.child_name) {
    children.push({ name: event.child_name, age: event.child_age || "" });
  }
  const optionals = Array.isArray(event.event_optionals) ? event.event_optionals.filter((o) => o?.name) : [];
  const parents = parentsText(event.parent_names);

  const dateLong = format(new Date(event.event_date + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR });
  const timeStr = event.start_time ? `${event.start_time.slice(0, 5)}${event.end_time ? ` às ${event.end_time.slice(0, 5)}` : ""}` : null;
  const phase = partyPhase(event.event_date, event.start_time, event.end_time, now);
  const timeline = buildTimeline(parseSchedule(company.settings), event.start_time, event.end_time, event.event_date, now);

  const checklistDone = checklistItems.filter((i) => i.is_completed).length;
  const checklistTotal = checklistItems.length;
  const clientForms = [
    ...(modules.prefesta ? [!!details.prefesta] : []),
    ...(modules.cardapio ? [!!details.cardapio] : []),
  ];
  const ready = !detailsKnown ? null : readiness(modules.checklist ? { total: checklistTotal, completed: checklistDone } : { total: 0, completed: 0 }, clientForms);

  // Avisos de verdade: formulário do cliente sem resposta a até 3 dias da festa
  const daysToParty = Math.round((new Date(event.event_date + "T00:00:00").getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  const alerts: { key: string; title: string; text: string; link: string | null }[] = [];
  if (detailsKnown && phase.kind === "before" && daysToParty <= 3) {
    const when = daysToParty <= 0 ? "A festa é hoje." : daysToParty === 1 ? "A festa é amanhã." : `A festa é em ${daysToParty} dias.`;
    if (modules.prefesta && !details.prefesta) alerts.push({ key: "prefesta", title: "Pré-Festa ainda não respondida", text: `${when} Mande o link de novo para o cliente.`, link: formUrl("prefesta") });
    if (modules.cardapio && !details.cardapio) alerts.push({ key: "cardapio", title: "Cardápio ainda não escolhido", text: `${when} Mande o link de novo para o cliente.`, link: formUrl("cardapio") });
  }
  if (event.status === "cancelado") alerts.unshift({ key: "cancelada", title: "Festa cancelada", text: "Esta festa está marcada como cancelada na Agenda.", link: null });

  const staffLink = details.staff_id ? `/equipe/${details.staff_id}` : null;
  const moreTools = [
    { key: "maintenance", on: modules.maintenance, label: "Manutenção", icon: Wrench, link: details.maintenance_id ? `/manutencao/${details.maintenance_id}` : null, item: "manutencao" },
    { key: "monitoring", on: modules.monitoring, label: "Acompanhamento", icon: Eye, link: details.monitoring_id ? `/acompanhamento/${details.monitoring_id}` : null, item: "acompanhamento" },
    { key: "info", on: modules.info, label: "Informações para a equipe", icon: Info, link: infoId ? `/informacoes/${infoId}` : null, item: "informacoes" },
  ].filter((t) => t.on);
  const respondedOn = (iso: string) => format(new Date(iso), "dd/MM");
  const statusLabel = event.status === "confirmado" ? "Confirmada" : event.status === "cancelado" ? "Cancelada" : "Pendente";
  const pendingChecklist = checklistItems.filter((i) => !i.is_completed);
  const checklistShown = showAllChecklist ? checklistItems : pendingChecklist.slice(0, 4);
  const menuItems = details.cardapio?.items || [];

  return (
    <div className="min-h-screen bg-[#F4F2FA] text-slate-900 pb-10">
      <div className="mx-auto max-w-xl">
        {/* Topo na cor da festa */}
        <header className="bg-violet-700 text-white px-5 pt-4 pb-20 rounded-b-[32px] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {company.logo_url ? (
                <img src={company.logo_url} alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center"><PartyPopper className="h-5 w-5" /></div>
              )}
              <span className="font-bold text-sm truncate">{company.name}</span>
            </div>
            <span className="shrink-0 text-xs font-semibold bg-white/15 rounded-full px-2.5 py-1">
              {lastUpdated ? `Atualizado ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Ao vivo"}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-violet-100 first-letter:uppercase">{dateLong}{timeStr ? ` · ${timeStr}` : ""}</p>
            <h1 className="font-display text-[30px] leading-[1.1] font-extrabold tracking-tight">{event.title.trim()}</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-[13px] font-semibold">
            {event.guest_count ? <span className="bg-white/15 rounded-full px-3 py-1.5">{event.guest_count} convidados</span> : null}
            {event.package_name ? <span className="bg-white/15 rounded-full px-3 py-1.5">{event.package_name}</span> : null}
            {event.unit ? <span className="bg-white/15 rounded-full px-3 py-1.5">{event.unit}</span> : null}
            <span className="bg-white/15 rounded-full px-3 py-1.5">{statusLabel}</span>
          </div>
        </header>

        {/* Contagem e quanto está pronto */}
        <section className="-mt-14 mx-4 bg-white rounded-3xl shadow-[0_10px_30px_rgba(40,20,90,0.12)] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {phase.kind === "live" ? "Festa em andamento" : phase.kind === "after" ? "Festa" : "Contagem"}
              </p>
              <p className={cn("font-display text-2xl font-extrabold leading-tight", phase.kind === "live" ? "text-emerald-700" : "text-violet-700")}>{phase.text}</p>
            </div>
            {ready !== null && (
              <div
                className="h-[76px] w-[76px] shrink-0 rounded-full flex items-center justify-center"
                style={{ background: `conic-gradient(#6D28D9 0 ${ready}%, #ECE8F8 ${ready}% 100%)` }}
                role="img"
                aria-label={`${ready}% pronto`}
              >
                <div className="h-[58px] w-[58px] rounded-full bg-white flex flex-col items-center justify-center">
                  <span className="text-[17px] font-extrabold leading-none">{ready}%</span>
                  <span className="text-[10px] font-bold text-slate-500">pronto</span>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {modules.checklist && (
              <div className="rounded-2xl bg-[#F4F2FA] py-2.5">
                <p className="text-lg font-extrabold">{checklistTotal ? `${checklistDone}/${checklistTotal}` : "—"}</p>
                <p className="text-[11px] font-bold text-slate-600">Checklist</p>
              </div>
            )}
            {modules.staff && (
              <div className="rounded-2xl bg-[#F4F2FA] py-2.5">
                <p className="text-lg font-extrabold">{details.staff.length || "—"}</p>
                <p className="text-[11px] font-bold text-slate-600">Na equipe</p>
              </div>
            )}
            {modules.attendance && (
              <div className="rounded-2xl bg-[#F4F2FA] py-2.5">
                <p className="text-lg font-extrabold">{attendanceCount}{event.guest_count ? `/${event.guest_count}` : ""}</p>
                <p className="text-[11px] font-bold text-slate-600">Chegaram</p>
              </div>
            )}
          </div>
        </section>

        <div className="px-4 pt-5 space-y-6">
          {/* Avisos de verdade */}
          {alerts.map((a) => (
            <div key={a.key} className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-amber-900">{a.title}</p>
                  <p className="text-[13px] text-amber-900">{a.text}</p>
                </div>
              </div>
              {a.link && (
                <button type="button" onClick={() => copyLink(a.key, a.link!)} className="inline-flex items-center gap-2 rounded-xl bg-amber-800 text-white text-sm font-bold px-4 py-2.5 active:scale-[0.98]">
                  <Copy className="h-4 w-4" /> {copied === a.key ? "Link copiado" : "Copiar link para o cliente"}
                </button>
              )}
            </div>
          ))}

          {/* Aniversariantes */}
          {children.length > 0 && (
            <Section title={children.length > 1 ? "Aniversariantes" : "Aniversariante"}>
              <div className={cn("grid gap-2.5", children.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {children.map((c, i) => (
                  <div key={i} className={cn("rounded-2xl border p-4", CHILD_TONES[i % CHILD_TONES.length])}>
                    <p className="font-display text-xl font-extrabold leading-tight">{c.name}</p>
                    {c.age && <p className="text-sm font-bold">{/\D/.test(c.age) ? c.age : `${c.age} ${c.age === "1" ? "ano" : "anos"}`}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Roteiro */}
          {timeline.length > 0 && (
            <Section title="Roteiro da festa">
              <ol className="rounded-2xl bg-white p-4">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "h-3.5 w-3.5 rounded-full shrink-0 mt-1",
                        t.state === "done" ? "bg-emerald-600" : t.state === "next" ? "border-[3px] border-violet-700 bg-white" : "bg-slate-200",
                      )} />
                      {i < timeline.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
                    </div>
                    <div className={cn(i < timeline.length - 1 && "pb-4")}>
                      <p className="font-extrabold text-sm">{t.time} · {t.label}</p>
                      {t.state !== "later" && (
                        <p className={cn("text-[13px] font-semibold", t.state === "done" ? "text-emerald-700" : "text-violet-700")}>{t.state === "done" ? "Feito" : "Próximo"}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* O que o cliente escolheu */}
          {(modules.prefesta || modules.cardapio || modules.avaliacao || optionals.length > 0) && (
            <Section title="Do cliente">
              {modules.cardapio && (
                <FormCard
                  icon={UtensilsCrossed}
                  tone="bg-amber-50 text-amber-800"
                  title={details.cardapio?.template_name || "Cardápio"}
                  status={details.cardapio ? `Respondido ${respondedOn(details.cardapio.responded_at)}` : detailsKnown ? "Ainda não escolhido" : "Link do formulário"}
                  done={!!details.cardapio}
                  neutral={!detailsKnown}
                  action={formUrl("cardapio")}
                >
                  {menuItems.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {(showAllMenu ? menuItems : menuItems.slice(0, 8)).map((m, i) => (
                          <span key={i} className="rounded-full bg-amber-50 text-amber-900 px-2.5 py-1 text-xs font-bold">{m}</span>
                        ))}
                      </div>
                      {menuItems.length > 8 && (
                        <button type="button" onClick={() => setShowAllMenu((v) => !v)} className="text-[13px] font-bold text-violet-700">
                          {showAllMenu ? "Mostrar menos" : `Ver todos (${menuItems.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </FormCard>
              )}
              {modules.prefesta && (
                <FormCard
                  icon={ClipboardList}
                  tone="bg-pink-50 text-pink-800"
                  title="Pré-Festa"
                  status={details.prefesta ? `Respondida ${respondedOn(details.prefesta.responded_at)}` : detailsKnown ? "Ainda não respondida" : "Link do formulário"}
                  done={!!details.prefesta}
                  neutral={!detailsKnown}
                  action={formUrl("prefesta")}
                />
              )}
              {modules.avaliacao && (
                <FormCard
                  icon={Star}
                  tone="bg-teal-50 text-teal-800"
                  title="Avaliação"
                  status={details.avaliacao ? `Respondida ${respondedOn(details.avaliacao.responded_at)}${details.avaliacao.score != null ? ` · nota ${Number(details.avaliacao.score).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}` : ""}` : "Vai para o cliente depois da festa"}
                  done={!!details.avaliacao}
                  neutral={!details.avaliacao}
                  action={formUrl("avaliacao")}
                />
              )}
              {optionals.length > 0 && (
                <div className="rounded-2xl bg-white p-4">
                  <p className="font-extrabold text-[15px] mb-1.5">Opcionais</p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {optionals.map((o, i) => <li key={i}>• {o.name}</li>)}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Equipe do dia */}
          {(modules.staff || modules.checklist || modules.attendance) && (
            <Section title="Equipe do dia">
              {modules.staff && (
                details.staff.length > 0 ? (
                  <LinkCard href={staffLink}>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      {details.staff.slice(0, 8).map((s, i) => (
                        <div key={i} className="flex items-center gap-2 min-w-0">
                          <span className="h-9 w-9 shrink-0 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center text-sm font-extrabold">{s.name.trim().charAt(0).toUpperCase()}</span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-bold truncate">{s.name}</span>
                            {s.role && <span className="block text-xs text-slate-600 truncate">{s.role}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                    {details.staff.length > 8 && <p className="text-[13px] font-bold text-violet-700 mt-3">+ {details.staff.length - 8} na equipe</p>}
                  </LinkCard>
                ) : (
                  <EmptyCard icon={Users} title="Equipe da festa" text="Ninguém escalado ainda." createItem="equipe" />
                )
              )}

              {modules.checklist && (
                checklistTotal > 0 ? (
                  <div className="rounded-2xl bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-[15px] flex items-center gap-2"><ListChecks className="h-4 w-4 text-violet-700" /> Checklist</p>
                      <span className="text-sm font-bold text-slate-600">{checklistDone} de {checklistTotal}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#ECE8F8] overflow-hidden">
                      <div className={cn("h-full rounded-full", checklistDone === checklistTotal ? "bg-emerald-600" : "bg-violet-700")} style={{ width: `${Math.round((checklistDone / checklistTotal) * 100)}%` }} />
                    </div>
                    {checklistShown.length > 0 ? (
                      <ul className="space-y-1.5">
                        {checklistShown.map((it) => (
                          <li key={it.id} className="flex items-start gap-2 text-sm">
                            <span className={cn("mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center", it.is_completed ? "bg-emerald-600 border-emerald-600" : "border-slate-300")}>
                              {it.is_completed && <Check className="h-3 w-3 text-white" />}
                            </span>
                            <span className={cn(it.is_completed && "text-slate-500 line-through")}>{it.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm font-semibold text-emerald-700">Tudo feito</p>
                    )}
                    {(checklistItems.length > checklistShown.length || showAllChecklist) && (
                      <button type="button" onClick={() => setShowAllChecklist((v) => !v)} className="text-[13px] font-bold text-violet-700">
                        {showAllChecklist ? "Mostrar só o que falta" : "Ver checklist completo"}
                      </button>
                    )}
                  </div>
                ) : (
                  <EmptyCard icon={ListChecks} title="Checklist" text="Nenhum item para esta festa." />
                )
              )}

              {modules.attendance && (
                details.attendance_id ? (
                  <LinkCard href={`/lista-presenca/${details.attendance_id}`}>
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-[15px] flex items-center gap-2"><UserCheck className="h-4 w-4 text-violet-700" /> Presença de convidados</p>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{attendanceCount} {attendanceCount === 1 ? "chegou" : "chegaram"}{event.guest_count ? ` de ${event.guest_count}` : ""}</p>
                    {event.guest_count ? (
                      <div className="h-2 rounded-full bg-[#ECE8F8] overflow-hidden mt-2.5">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.round((attendanceCount / event.guest_count) * 100))}%` }} />
                      </div>
                    ) : null}
                  </LinkCard>
                ) : (
                  <EmptyCard icon={UserCheck} title="Presença de convidados" text="A lista de presença não foi aberta." createItem="presenca" />
                )
              )}

              {moreTools.length > 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300">
                  <button type="button" onClick={() => setShowMoreTools((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700" aria-expanded={showMoreTools}>
                    <span>Mais: {moreTools.map((t) => t.label).join(", ")}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showMoreTools && "rotate-180")} />
                  </button>
                  {showMoreTools && (
                    <div className="divide-y divide-slate-200 border-t border-slate-200">
                      {moreTools.map((t) => (
                        <a
                          key={t.key}
                          href={t.link || `/formularios?item=${t.item}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 px-4 py-3 text-sm"
                        >
                          <t.icon className="h-4 w-4 text-violet-700" />
                          <span className="flex-1 font-semibold">{t.label}</span>
                          <span className="text-[13px] font-bold text-violet-700">{t.link ? "Abrir" : "Criar"}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* Detalhes */}
          {(parents || event.notes) && (
            <Section title="Detalhes da festa">
              <div className="rounded-2xl bg-white p-4 space-y-3 text-sm">
                {parents && (
                  <div>
                    <p className="text-xs font-bold text-slate-600">Responsáveis</p>
                    <p className="font-semibold whitespace-pre-wrap">{parents}</p>
                  </div>
                )}
                {event.notes && (
                  <div>
                    <p className="text-xs font-bold text-slate-600">Observações</p>
                    <p className="whitespace-pre-wrap text-slate-800">{event.notes}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          <a
            href={`/agenda?event_id=${event.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-700"
          >
            <ExternalLink className="h-4 w-4" /> Editar a festa no Celebrei
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="px-1 text-[17px] font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function LinkCard({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) return <div className="rounded-2xl bg-white p-4">{children}</div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="block rounded-2xl bg-white p-4 active:scale-[0.99] transition-transform">
      {children}
    </a>
  );
}

function FormCard({ icon: Icon, tone, title, status, done, neutral, action, children }: {
  icon: typeof Star; tone: string; title: string; status: string; done: boolean; neutral?: boolean; action: string | null; children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center", tone)}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-[15px] truncate">{title}</p>
          <p className={cn("text-[13px] font-semibold flex items-center gap-1", done ? "text-emerald-700" : neutral ? "text-slate-600" : "text-amber-800")}>
            {done && <Check className="h-3.5 w-3.5" />} {status}
          </p>
        </div>
        {action && (
          <a href={action} target="_blank" rel="noreferrer" className="shrink-0 text-[13px] font-bold text-violet-700">Abrir</a>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyCard({ icon: Icon, title, text, createItem }: { icon: typeof Star; title: string; text: string; createItem?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-[15px]">{title}</p>
        <p className="text-[13px] text-slate-600">{text}</p>
      </div>
      {createItem && (
        <a href={`/formularios?item=${createItem}`} target="_blank" rel="noreferrer" className="shrink-0 text-[13px] font-bold text-violet-700">Criar</a>
      )}
    </div>
  );
}
