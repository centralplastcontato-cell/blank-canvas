import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, CheckSquare, Users, Wrench, ClipboardCheck,
  UserCheck, Info, Star, UtensilsCrossed, FileText,
  Copy, Check, Home, AlertTriangle, ListChecks, PartyPopper,
  ChevronRight, Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PartyEvent {
  id: string;
  company_id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  guest_count: number | null;
  unit: string | null;
  status: string;
  package_name: string | null;
  total_value: number | null;
}

interface PartyControlModules {
  checklist: boolean;
  staff: boolean;
  maintenance: boolean;
  monitoring: boolean;
  attendance: boolean;
  info: boolean;
  prefesta: boolean;
  cardapio: boolean;
  avaliacao: boolean;
}

interface ModuleStatus {
  checklist: { total: number; completed: number };
  staff: { id: string | null };
  maintenance: { id: string | null };
  monitoring: { id: string | null };
  attendance: { id: string | null; guestCount: number };
  info: { id: string | null; blockCount: number };
}

interface CompanyInfo {
  name: string;
  logo_url: string | null;
  slug: string;
  settings: Record<string, unknown> | null;
}

type TabType = "home" | "pending" | "checklist";

function parsePartyControlModules(settings: Record<string, unknown> | null): PartyControlModules {
  const defaults: PartyControlModules = {
    checklist: true,
    staff: true,
    maintenance: true,
    monitoring: true,
    attendance: true,
    info: true,
    prefesta: false,
    cardapio: false,
    avaliacao: false,
  };
  if (!settings) return defaults;
  const pcm = settings.party_control_modules;
  if (!pcm || typeof pcm !== "object" || Array.isArray(pcm)) return defaults;
  const m = pcm as Record<string, unknown>;
  return {
    checklist: m.checklist !== false,
    staff: m.staff !== false,
    maintenance: m.maintenance !== false,
    monitoring: m.monitoring !== false,
    attendance: m.attendance !== false,
    info: m.info !== false,
    prefesta: m.prefesta === true,
    cardapio: m.cardapio === true,
    avaliacao: m.avaliacao === true,
  };
}

interface ChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  sort_order: number;
}

export default function PublicPartyControl() {
  const { eventId } = useParams<{ eventId: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [event, setEvent] = useState<PartyEvent | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [modules, setModules] = useState<PartyControlModules | null>(null);
  const [status, setStatus] = useState<ModuleStatus>({
    checklist: { total: 0, completed: 0 },
    staff: { id: null },
    maintenance: { id: null },
    monitoring: { id: null },
    attendance: { id: null, guestCount: 0 },
    info: { id: null, blockCount: 0 },
  });
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [copied, setCopied] = useState(false);
  const [_checklistTemplates, _setChecklistTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [evalTemplates, setEvalTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [prefestTemplates, setPrefestTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [cardapioTemplates, setCardapioTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: evData, error: evErr } = await supabase
        .from("company_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (evErr || !evData) { setNotFound(true); setLoading(false); return; }
      setEvent(evData as PartyEvent);

      const companyId = evData.company_id;

      const [
        companyRes,
        checklistRes,
        staffRes,
        maintenanceRes,
        monitoringRes,
        attendanceRes,
        infoRes,
        evalTmplRes,
        prefestTmplRes,
        cardapioTmplRes,
      ] = await Promise.all([
        supabase.from("companies").select("name, logo_url, slug, settings").eq("id", companyId).single(),
        supabase.from("event_checklist_items").select("id, title, is_completed, sort_order").eq("event_id", eventId).order("sort_order"),
        (supabase as any).from("event_staff_entries").select("id").eq("event_id", eventId).limit(1),
        (supabase as any).from("maintenance_entries").select("id").eq("event_id", eventId).limit(1),
        (supabase as any).from("party_monitoring_entries").select("id").eq("event_id", eventId).limit(1),
        supabase.from("attendance_entries").select("id, guests").eq("event_id", eventId).limit(1),
        supabase.from("event_info_entries").select("id, items").eq("event_id", eventId).limit(1),
        supabase.from("evaluation_templates").select("id, name, slug").eq("company_id", companyId).eq("is_active", true),
        (supabase as any).from("pre_festa_templates").select("id, name, slug").eq("company_id", companyId).eq("is_active", true),
        supabase.from("cardapio_templates").select("id, name, slug").eq("company_id", companyId).eq("is_active", true),
      ]);

      if (companyRes.data) {
        const c = companyRes.data;
        setCompany({
          name: c.name,
          logo_url: c.logo_url,
          slug: c.slug,
          settings: (c.settings && typeof c.settings === "object" && !Array.isArray(c.settings))
            ? c.settings as Record<string, unknown>
            : null,
        });
        setModules(parsePartyControlModules(
          (c.settings && typeof c.settings === "object" && !Array.isArray(c.settings))
            ? c.settings as Record<string, unknown>
            : null
        ));
      }

      const items = (checklistRes.data || []) as ChecklistItem[];
      setChecklistItems(items);

      const guestData = attendanceRes.data?.[0]?.guests;
      const guestCount = Array.isArray(guestData) ? guestData.length : 0;
      const infoItems = infoRes.data?.[0]?.items;
      const blockCount = Array.isArray(infoItems) ? infoItems.length : 0;

      setStatus({
        checklist: {
          total: items.length,
          completed: items.filter(i => i.is_completed).length,
        },
        staff: { id: staffRes.data?.[0]?.id || null },
        maintenance: { id: maintenanceRes.data?.[0]?.id || null },
        monitoring: { id: monitoringRes.data?.[0]?.id || null },
        attendance: { id: attendanceRes.data?.[0]?.id || null, guestCount },
        info: { id: infoRes.data?.[0]?.id || null, blockCount },
      });

      setEvalTemplates(evalTmplRes.data || []);
      setPrefestTemplates(prefestTmplRes.data || []);
      setCardapioTemplates(cardapioTmplRes.data || []);

      setLoading(false);
    })();
  }, [eventId]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/festa/${eventId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openModule = (url: string) => {
    window.open(url, "_blank");
  };

  const getModuleUrl = (key: string): string | null => {
    const companySlug = company?.slug || "";
    switch (key) {
      case "staff": return status.staff.id ? `/equipe/${status.staff.id}` : null;
      case "maintenance": return status.maintenance.id ? `/manutencao/${status.maintenance.id}` : null;
      case "monitoring": return status.monitoring.id ? `/acompanhamento/${status.monitoring.id}` : null;
      case "attendance": return status.attendance.id ? `/lista-presenca/${status.attendance.id}` : null;
      case "info": return status.info.id ? `/informacoes/${status.info.id}` : null;
      case "avaliacao": return evalTemplates[0]
        ? `/avaliacao/${companySlug}/${evalTemplates[0].slug || evalTemplates[0].id}`
        : null;
      case "prefesta": return prefestTemplates[0]
        ? `/pre-festa/${companySlug}/${prefestTemplates[0].slug || prefestTemplates[0].id}`
        : null;
      case "cardapio": return cardapioTemplates[0]
        ? `/cardapio/${companySlug}/${cardapioTemplates[0].slug || cardapioTemplates[0].id}`
        : null;
      default: return null;
    }
  };

  const pendingChecklistItems = checklistItems.filter(i => !i.is_completed);
  const pendingCount = pendingChecklistItems.length;

  // KPI calculation
  const modulesMissing = (() => {
    if (!modules) return 0;
    let count = 0;
    if (modules.staff && !status.staff.id) count++;
    if (modules.maintenance && !status.maintenance.id) count++;
    if (modules.monitoring && !status.monitoring.id) count++;
    if (modules.attendance && !status.attendance.id) count++;
    if (modules.info && !status.info.id) count++;
    return count;
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto" />
          <p className="text-slate-400 text-sm">Carregando painel...</p>
        </div>
      </div>
    );
  }

  if (notFound || !event || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 text-slate-600 mx-auto" />
          <h1 className="text-xl font-bold text-white">Evento não encontrado</h1>
          <p className="text-slate-400 text-sm">Este link pode estar incorreto ou o evento foi removido.</p>
        </div>
      </div>
    );
  }

  const dateFormatted = format(new Date(event.event_date + "T12:00:00"), "EEE, dd/MM", { locale: ptBR });
  const timeStr = event.start_time
    ? `${event.start_time.slice(0, 5)}${event.end_time ? `–${event.end_time.slice(0, 5)}` : ""}`
    : null;

  // Module definitions
  const moduleDefinitions = [
    {
      key: "checklist",
      label: "Checklist",
      icon: CheckSquare,
      gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
      glowColor: "rgba(5, 150, 105, 0.3)",
      enabled: modules?.checklist ?? true,
      statusText: status.checklist.total === 0
        ? "Vazio"
        : `${status.checklist.completed}/${status.checklist.total} itens`,
      isOk: status.checklist.total > 0 && status.checklist.completed === status.checklist.total,
      isWarning: status.checklist.total > 0 && status.checklist.completed < status.checklist.total,
      onClick: () => setActiveTab("checklist"),
    },
    {
      key: "staff",
      label: "Equipe",
      icon: Users,
      gradient: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
      glowColor: "rgba(37, 99, 235, 0.3)",
      enabled: modules?.staff ?? true,
      statusText: status.staff.id ? "Registrado" : "Não criado",
      isOk: !!status.staff.id,
      isWarning: !status.staff.id,
      url: getModuleUrl("staff"),
    },
    {
      key: "maintenance",
      label: "Manutenção",
      icon: Wrench,
      gradient: "linear-gradient(135deg, #475569 0%, #334155 100%)",
      glowColor: "rgba(71, 85, 105, 0.3)",
      enabled: modules?.maintenance ?? true,
      statusText: status.maintenance.id ? "Registrado" : "Não criado",
      isOk: !!status.maintenance.id,
      isWarning: !status.maintenance.id,
      url: getModuleUrl("maintenance"),
    },
    {
      key: "monitoring",
      label: "Acompanhamento",
      icon: ClipboardCheck,
      gradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
      glowColor: "rgba(217, 119, 6, 0.3)",
      enabled: modules?.monitoring ?? true,
      statusText: status.monitoring.id ? "Registrado" : "Não criado",
      isOk: !!status.monitoring.id,
      isWarning: !status.monitoring.id,
      url: getModuleUrl("monitoring"),
    },
    {
      key: "attendance",
      label: "Presença",
      icon: UserCheck,
      gradient: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
      glowColor: "rgba(234, 88, 12, 0.3)",
      enabled: modules?.attendance ?? true,
      statusText: status.attendance.id
        ? `${status.attendance.guestCount} convidados`
        : "Não criado",
      isOk: !!status.attendance.id,
      isWarning: !status.attendance.id,
      url: getModuleUrl("attendance"),
    },
    {
      key: "info",
      label: "Informações",
      icon: Info,
      gradient: "linear-gradient(135deg, #0284c7 0%, #075985 100%)",
      glowColor: "rgba(2, 132, 199, 0.3)",
      enabled: modules?.info ?? true,
      statusText: status.info.id ? `${status.info.blockCount} blocos` : "Não criado",
      isOk: !!status.info.id,
      isWarning: !status.info.id,
      url: getModuleUrl("info"),
    },
    {
      key: "prefesta",
      label: "Pré-Festa",
      icon: FileText,
      gradient: "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
      glowColor: "rgba(219, 39, 119, 0.3)",
      enabled: modules?.prefesta ?? false,
      statusText: getModuleUrl("prefesta") ? "Disponível" : "Sem template",
      isOk: !!getModuleUrl("prefesta"),
      isWarning: !getModuleUrl("prefesta"),
      url: getModuleUrl("prefesta"),
    },
    {
      key: "cardapio",
      label: "Cardápio",
      icon: UtensilsCrossed,
      gradient: "linear-gradient(135deg, #ca8a04 0%, #a16207 100%)",
      glowColor: "rgba(202, 138, 4, 0.3)",
      enabled: modules?.cardapio ?? false,
      statusText: getModuleUrl("cardapio") ? "Disponível" : "Sem template",
      isOk: !!getModuleUrl("cardapio"),
      isWarning: !getModuleUrl("cardapio"),
      url: getModuleUrl("cardapio"),
    },
    {
      key: "avaliacao",
      label: "Avaliação",
      icon: Star,
      gradient: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
      glowColor: "rgba(13, 148, 136, 0.3)",
      enabled: modules?.avaliacao ?? false,
      statusText: getModuleUrl("avaliacao") ? "Disponível" : "Sem template",
      isOk: !!getModuleUrl("avaliacao"),
      isWarning: !getModuleUrl("avaliacao"),
      url: getModuleUrl("avaliacao"),
    },
  ].filter(m => m.enabled);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}
    >
      {/* ---- HEADER ---- */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        {/* Company logo + name */}
        <div className="flex items-center gap-2 mb-4">
          {company.logo_url && (
            <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded-lg object-cover" />
          )}
          <span className="text-slate-400 text-xs font-medium tracking-wide uppercase">{company.name}</span>

          <button
            onClick={handleCopyLink}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.07)", color: "#94a3b8" }}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
        </div>

        {/* Event title */}
        <div className="flex items-start gap-2 mb-1">
          <PartyPopper className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
          <h1 className="text-white font-bold text-xl leading-tight">{event.title}</h1>
        </div>

        {/* Event meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 ml-7 text-slate-400 text-sm">
          <span className="capitalize">{dateFormatted}</span>
          {timeStr && <span>• {timeStr}</span>}
          {event.unit && <span>• {event.unit}</span>}
          {event.guest_count && <span>• {event.guest_count} conv.</span>}
        </div>

        {/* Status badge */}
        <div className="mt-3 ml-7">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={
              event.status === "confirmado"
                ? { background: "rgba(5,150,105,0.2)", color: "#34d399" }
                : event.status === "cancelado"
                ? { background: "rgba(239,68,68,0.2)", color: "#f87171" }
                : { background: "rgba(251,191,36,0.2)", color: "#fbbf24" }
            }
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: event.status === "confirmado" ? "#34d399"
                  : event.status === "cancelado" ? "#f87171" : "#fbbf24"
              }}
            />
            {event.status === "confirmado" ? "Confirmado" : event.status === "cancelado" ? "Cancelado" : "Pendente"}
          </span>
        </div>
      </div>

      {/* ---- KPI CARDS ---- */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2.5">
        {/* Feitos */}
        <div
          className="rounded-2xl p-3 text-center"
          style={{ background: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.25)" }}
        >
          <div className="text-2xl font-black text-emerald-400">{status.checklist.completed}</div>
          <div className="text-xs text-slate-400 mt-0.5">Feitos</div>
        </div>
        {/* Pendentes */}
        <div
          className="rounded-2xl p-3 text-center"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
        >
          <div className="text-2xl font-black text-yellow-400">{pendingCount}</div>
          <div className="text-xs text-slate-400 mt-0.5">Pendentes</div>
        </div>
        {/* Alertas */}
        <div
          className="rounded-2xl p-3 text-center"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <div className="text-2xl font-black text-red-400">{modulesMissing}</div>
          <div className="text-xs text-slate-400 mt-0.5">Alertas</div>
        </div>
      </div>

      {/* ---- ALERT BANNER ---- */}
      {modulesMissing > 0 && (
        <div
          className="mx-4 mb-3 rounded-xl px-3 py-2.5 flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-red-300 text-xs">
            {modulesMissing} módulo{modulesMissing > 1 ? "s" : ""} ainda não {modulesMissing > 1 ? "foram criados" : "foi criado"}
          </p>
        </div>
      )}

      {/* ---- CONTENT AREA ---- */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="px-4 grid grid-cols-2 gap-3">
            {moduleDefinitions.map(mod => {
              const Icon = mod.icon;
              const isClickable = mod.key === "checklist" || !!mod.url;

              return (
                <button
                  key={mod.key}
                  onClick={() => {
                    if (mod.key === "checklist") {
                      setActiveTab("checklist");
                    } else if (mod.url) {
                      openModule(mod.url);
                    }
                  }}
                  disabled={!isClickable}
                  className="relative rounded-2xl p-4 text-left transition-transform active:scale-95 disabled:opacity-50"
                  style={{
                    background: mod.gradient,
                    boxShadow: isClickable ? `0 4px 20px ${mod.glowColor}` : "none",
                  }}
                >
                  <Icon className="h-7 w-7 text-white mb-2.5" strokeWidth={2} />
                  <div className="text-white font-bold text-sm leading-tight">{mod.label}</div>
                  <div
                    className="mt-1.5 flex items-center gap-1 text-xs font-medium"
                    style={{ color: "rgba(255,255,255,0.75)" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: mod.isOk ? "#34d399" : "#fbbf24" }}
                    />
                    {mod.statusText}
                  </div>
                  {isClickable && (
                    <ChevronRight
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* PENDING TAB */}
        {activeTab === "pending" && (
          <div className="px-4 space-y-2">
            <h2 className="text-white font-bold text-sm mb-3">Itens pendentes do checklist</h2>
            {pendingChecklistItems.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-60" />
                <p className="text-slate-400 text-sm">Nenhum item pendente! 🎉</p>
              </div>
            ) : (
              pendingChecklistItems.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-4 w-4 rounded shrink-0"
                    style={{ border: "2px solid rgba(255,255,255,0.3)" }}
                  />
                  <span className="text-slate-200 text-sm">{item.title}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === "checklist" && (
          <div className="px-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-sm">Checklist da Festa</h2>
              <span className="text-slate-400 text-xs">
                {status.checklist.completed}/{status.checklist.total}
              </span>
            </div>

            {/* Progress bar */}
            {status.checklist.total > 0 && (
              <div
                className="h-1.5 rounded-full mb-4 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.round((status.checklist.completed / status.checklist.total) * 100)}%`,
                    background: "linear-gradient(90deg, #059669, #34d399)",
                  }}
                />
              </div>
            )}

            {checklistItems.length === 0 ? (
              <div className="text-center py-12">
                <ListChecks className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Nenhum item no checklist</p>
              </div>
            ) : (
              checklistItems.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{
                    background: item.is_completed ? "rgba(5,150,105,0.12)" : "rgba(255,255,255,0.05)",
                    border: item.is_completed ? "1px solid rgba(5,150,105,0.25)" : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="h-5 w-5 rounded-md shrink-0 flex items-center justify-center"
                    style={{
                      background: item.is_completed ? "#059669" : "transparent",
                      border: item.is_completed ? "none" : "2px solid rgba(255,255,255,0.25)",
                    }}
                  >
                    {item.is_completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span
                    className="text-sm"
                    style={{
                      color: item.is_completed ? "#86efac" : "#cbd5e1",
                      textDecoration: item.is_completed ? "line-through" : "none",
                    }}
                  >
                    {item.title}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ---- BOTTOM NAV ---- */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-stretch"
        style={{
          background: "rgba(15,23,42,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {[
          { id: "home" as TabType, label: "Início", icon: Home },
          { id: "pending" as TabType, label: `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: AlertTriangle },
          { id: "checklist" as TabType, label: "Checklist", icon: ListChecks },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 px-2 transition-colors"
              style={{ color: isActive ? "#60a5fa" : "#64748b" }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
              {isActive && (
                <div
                  className="absolute bottom-0 h-0.5 w-10 rounded-full"
                  style={{ background: "#60a5fa" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
