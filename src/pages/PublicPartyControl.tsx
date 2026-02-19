import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Check, AlertTriangle, PartyPopper,
  ChevronRight, Shield, Zap, ArrowRight
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

const POLL_INTERVAL = 30_000;

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
  const [_copied, _setCopied] = useState(false);
  const [_checklistTemplates, _setChecklistTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [evalTemplates, setEvalTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [prefestTemplates, setPrefestTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [cardapioTemplates, setCardapioTemplates] = useState<{ id: string; name: string; slug: string | null }[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000);

  const fetchModuleStatus = async (_companyId: string) => {
    const [
      checklistRes,
      staffRes,
      maintenanceRes,
      monitoringRes,
      attendanceRes,
      infoRes,
    ] = await Promise.all([
      supabase.from("event_checklist_items").select("id, title, is_completed, sort_order").eq("event_id", eventId!).order("sort_order"),
      (supabase as any).from("event_staff_entries").select("id").eq("event_id", eventId!).limit(1),
      (supabase as any).from("maintenance_entries").select("id").eq("event_id", eventId!).limit(1),
      (supabase as any).from("party_monitoring_entries").select("id").eq("event_id", eventId!).limit(1),
      supabase.from("attendance_entries").select("id, guests").eq("event_id", eventId!).limit(1),
      supabase.from("event_info_entries").select("id, items").eq("event_id", eventId!).limit(1),
    ]);

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

    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (!eventId) return;
    let companyIdRef: string | null = null;

    const initialLoad = async () => {
      const { data: evData, error: evErr } = await supabase
        .from("company_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (evErr || !evData) { setNotFound(true); setLoading(false); return; }
      setEvent(evData as PartyEvent);
      companyIdRef = evData.company_id;

      const [
        companyRes,
        evalTmplRes,
        prefestTmplRes,
        cardapioTmplRes,
      ] = await Promise.all([
        supabase.from("companies").select("name, logo_url, slug, settings").eq("id", companyIdRef).single(),
        supabase.from("evaluation_templates").select("id, name, slug").eq("company_id", companyIdRef).eq("is_active", true),
        (supabase as any).from("pre_festa_templates").select("id, name, slug").eq("company_id", companyIdRef).eq("is_active", true),
        supabase.from("cardapio_templates").select("id, name, slug").eq("company_id", companyIdRef).eq("is_active", true),
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

      setEvalTemplates(evalTmplRes.data || []);
      setPrefestTemplates(prefestTmplRes.data || []);
      setCardapioTemplates(cardapioTmplRes.data || []);

      await fetchModuleStatus(companyIdRef);
      setLoading(false);
    };

    initialLoad();

    const pollTimer = setInterval(async () => {
      if (!companyIdRef) return;
      setRefreshing(true);
      setCountdown(POLL_INTERVAL / 1000);
      await fetchModuleStatus(companyIdRef);
      setRefreshing(false);
    }, POLL_INTERVAL);

    const countdownTimer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? POLL_INTERVAL / 1000 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(countdownTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const _handleCopyLink = () => {
    const url = `${window.location.origin}/festa/${eventId}`;
    navigator.clipboard.writeText(url);
    _setCopied(true);
    setTimeout(() => _setCopied(false), 2000);
  };

  const _handleShareWhatsApp = () => {
    if (!event) return;
    const url = `${window.location.origin}/festa/${eventId}`;
    const dateStr = format(new Date(event.event_date + "T12:00:00"), "EEEE, dd/MM", { locale: ptBR });
    const timeStr = event.start_time
      ? `${event.start_time.slice(0, 5)}${event.end_time ? ` às ${event.end_time.slice(0, 5)}` : ""}`
      : "";
    const unitStr = event.unit ? ` • ${event.unit}` : "";
    const lines = [
      `🎉 *${event.title}*`,
      `📅 ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}${timeStr ? ` • ${timeStr}` : ""}${unitStr}`,
      ``,
      `🎮 *Painel de Controle da Festa:*`,
      url,
    ];
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #0a0f1e 0%, #0f172a 50%, #1a0a2e 100%)" }}>
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full" style={{ background: "rgba(139,92,246,0.2)", animation: "ping 1.5s ease-in-out infinite" }} />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#a78bfa" }} />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">Carregando central...</p>
        </div>
      </div>
    );
  }

  if (notFound || !event || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)" }}>
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

  // Module definitions with emojis
  const moduleDefinitions = [
    {
      key: "checklist",
      label: "Checklist",
      emoji: "✅",
      color: "#10b981",
      glow: "rgba(16,185,129,0.25)",
      border: "rgba(16,185,129,0.35)",
      bg: "linear-gradient(145deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.08) 100%)",
      enabled: modules?.checklist ?? true,
      statusText: status.checklist.total === 0
        ? "Sem itens"
        : `${status.checklist.completed}/${status.checklist.total} itens`,
      isOk: status.checklist.total > 0 && status.checklist.completed === status.checklist.total,
      isWarning: status.checklist.total > 0 && status.checklist.completed < status.checklist.total,
      isEmpty: status.checklist.total === 0,
      onClick: () => setActiveTab("checklist"),
    },
    {
      key: "staff",
      label: "Equipe",
      emoji: "👥",
      color: "#3b82f6",
      glow: "rgba(59,130,246,0.25)",
      border: "rgba(59,130,246,0.35)",
      bg: "linear-gradient(145deg, rgba(59,130,246,0.18) 0%, rgba(37,99,235,0.08) 100%)",
      enabled: modules?.staff ?? true,
      statusText: status.staff.id ? "Registrado" : "Não criado",
      isOk: !!status.staff.id,
      isWarning: !status.staff.id,
      isEmpty: false,
      url: getModuleUrl("staff"),
    },
    {
      key: "maintenance",
      label: "Manutenção",
      emoji: "🔧",
      color: "#8b5cf6",
      glow: "rgba(139,92,246,0.25)",
      border: "rgba(139,92,246,0.35)",
      bg: "linear-gradient(145deg, rgba(139,92,246,0.18) 0%, rgba(109,40,217,0.08) 100%)",
      enabled: modules?.maintenance ?? true,
      statusText: status.maintenance.id ? "Registrado" : "Não criado",
      isOk: !!status.maintenance.id,
      isWarning: !status.maintenance.id,
      isEmpty: false,
      url: getModuleUrl("maintenance"),
    },
    {
      key: "monitoring",
      label: "Acompanhamento",
      emoji: "📋",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.25)",
      border: "rgba(245,158,11,0.35)",
      bg: "linear-gradient(145deg, rgba(245,158,11,0.18) 0%, rgba(180,83,9,0.08) 100%)",
      enabled: modules?.monitoring ?? true,
      statusText: status.monitoring.id ? "Registrado" : "Não criado",
      isOk: !!status.monitoring.id,
      isWarning: !status.monitoring.id,
      isEmpty: false,
      url: getModuleUrl("monitoring"),
    },
    {
      key: "attendance",
      label: "Presença",
      emoji: "🎟️",
      color: "#f97316",
      glow: "rgba(249,115,22,0.25)",
      border: "rgba(249,115,22,0.35)",
      bg: "linear-gradient(145deg, rgba(249,115,22,0.18) 0%, rgba(194,65,12,0.08) 100%)",
      enabled: modules?.attendance ?? true,
      statusText: status.attendance.id
        ? `${status.attendance.guestCount} convidados`
        : "Não criado",
      isOk: !!status.attendance.id,
      isWarning: !status.attendance.id,
      isEmpty: false,
      url: getModuleUrl("attendance"),
    },
    {
      key: "info",
      label: "Informações",
      emoji: "📌",
      color: "#06b6d4",
      glow: "rgba(6,182,212,0.25)",
      border: "rgba(6,182,212,0.35)",
      bg: "linear-gradient(145deg, rgba(6,182,212,0.18) 0%, rgba(8,145,178,0.08) 100%)",
      enabled: modules?.info ?? true,
      statusText: status.info.id ? `${status.info.blockCount} blocos` : "Não criado",
      isOk: !!status.info.id,
      isWarning: !status.info.id,
      isEmpty: false,
      url: getModuleUrl("info"),
    },
    {
      key: "prefesta",
      label: "Pré-Festa",
      emoji: "🎀",
      color: "#ec4899",
      glow: "rgba(236,72,153,0.25)",
      border: "rgba(236,72,153,0.35)",
      bg: "linear-gradient(145deg, rgba(236,72,153,0.18) 0%, rgba(190,24,93,0.08) 100%)",
      enabled: modules?.prefesta ?? false,
      statusText: getModuleUrl("prefesta") ? "Disponível" : "Sem template",
      isOk: !!getModuleUrl("prefesta"),
      isWarning: !getModuleUrl("prefesta"),
      isEmpty: false,
      url: getModuleUrl("prefesta"),
    },
    {
      key: "cardapio",
      label: "Cardápio",
      emoji: "🍽️",
      color: "#eab308",
      glow: "rgba(234,179,8,0.25)",
      border: "rgba(234,179,8,0.35)",
      bg: "linear-gradient(145deg, rgba(234,179,8,0.18) 0%, rgba(161,98,7,0.08) 100%)",
      enabled: modules?.cardapio ?? false,
      statusText: getModuleUrl("cardapio") ? "Disponível" : "Sem template",
      isOk: !!getModuleUrl("cardapio"),
      isWarning: !getModuleUrl("cardapio"),
      isEmpty: false,
      url: getModuleUrl("cardapio"),
    },
    {
      key: "avaliacao",
      label: "Avaliação",
      emoji: "⭐",
      color: "#14b8a6",
      glow: "rgba(20,184,166,0.25)",
      border: "rgba(20,184,166,0.35)",
      bg: "linear-gradient(145deg, rgba(20,184,166,0.18) 0%, rgba(15,118,110,0.08) 100%)",
      enabled: modules?.avaliacao ?? false,
      statusText: getModuleUrl("avaliacao") ? "Disponível" : "Sem template",
      isOk: !!getModuleUrl("avaliacao"),
      isWarning: !getModuleUrl("avaliacao"),
      isEmpty: false,
      url: getModuleUrl("avaliacao"),
    },
  ].filter(m => m.enabled);

  const checklistProgress = status.checklist.total > 0
    ? Math.round((status.checklist.completed / status.checklist.total) * 100)
    : 0;

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0f1e 0%, #0f172a 40%, #0f1629 100%)", height: "100dvh" }}
    >
      {/* ---- HEADER ---- */}
      <div className="shrink-0 px-4 pt-6 pb-4">
        {/* Top bar: company + share buttons */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-7 w-7 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
            ) : (
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <PartyPopper className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
              </div>
            )}
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#64748b" }}>{company.name}</span>
          </div>
        </div>

        {/* Central title area */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
            <Zap className="h-3.5 w-3.5" style={{ color: "#a78bfa" }} />
            <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "#a78bfa" }}>Central de Controle</span>
          </div>
          <h1 className="text-white font-black text-2xl leading-tight mb-1">{event.title}</h1>
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>
            <span className="capitalize">{dateFormatted}</span>
            {timeStr && <span> • {timeStr}</span>}
            {event.unit && <span> • {event.unit}</span>}
            {event.guest_count && <span> • {event.guest_count} convidados</span>}
          </p>

          {/* Status pill */}
          <div className="mt-2 flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
              style={
                event.status === "confirmado"
                  ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }
                  : event.status === "cancelado"
                  ? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }
                  : { background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{
                  background: event.status === "confirmado" ? "#34d399"
                    : event.status === "cancelado" ? "#f87171" : "#fbbf24"
                }}
              />
              {event.status === "confirmado" ? "🎉 Confirmado" : event.status === "cancelado" ? "Cancelado" : "Pendente"}
            </span>
          </div>
        </div>

        {/* ---- KPI CARDS ---- */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {/* OK */}
          <div
            className="rounded-2xl p-3 text-center relative overflow-hidden"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}
          >
            <div className="text-2xl mb-0.5">✅</div>
            <div className="text-2xl font-black" style={{ color: "#34d399" }}>{status.checklist.completed}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "#6ee7b7" }}>OK</div>
          </div>
          {/* Pendentes */}
          <div
            className="rounded-2xl p-3 text-center relative overflow-hidden"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
          >
            <div className="text-2xl mb-0.5">⏳</div>
            <div className="text-2xl font-black" style={{ color: "#fbbf24" }}>{pendingCount}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "#fde68a" }}>Pendentes</div>
          </div>
          {/* Alertas */}
          <div
            className="rounded-2xl p-3 text-center relative overflow-hidden"
            style={{
              background: modulesMissing > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.06)",
              border: modulesMissing > 0 ? "1px solid rgba(239,68,68,0.25)" : "1px solid rgba(16,185,129,0.15)",
            }}
          >
            <div className="text-2xl mb-0.5">{modulesMissing > 0 ? "🚨" : "🟢"}</div>
            <div className="text-2xl font-black" style={{ color: modulesMissing > 0 ? "#f87171" : "#34d399" }}>{modulesMissing}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: modulesMissing > 0 ? "#fca5a5" : "#6ee7b7" }}>Alertas</div>
          </div>
        </div>

        {/* Progress bar for checklist */}
        {status.checklist.total > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold" style={{ color: "#64748b" }}>Progresso do Checklist</span>
              <span className="text-xs font-bold" style={{ color: checklistProgress === 100 ? "#34d399" : "#94a3b8" }}>{checklistProgress}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${checklistProgress}%`,
                  background: checklistProgress === 100
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                }}
              />
            </div>
          </div>
        )}

        {/* ---- ALERT BANNER ---- */}
        {modulesMissing > 0 && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-1"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-300">Atenção necessária</p>
              <p className="text-xs" style={{ color: "#f87171" }}>
                {modulesMissing} módulo{modulesMissing > 1 ? "s" : ""} ainda não {modulesMissing > 1 ? "foram criados" : "foi criado"}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("home")}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              Ver <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* ---- POLLING INDICATOR ---- */}
      <div className="flex items-center justify-end gap-1.5 px-4 pb-2">
        {refreshing ? (
          <Loader2 className="h-3 w-3 animate-spin" style={{ color: "#64748b" }} />
        ) : (
          <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
        )}
        <span style={{ color: "#475569", fontSize: "10px" }}>
          {refreshing
            ? "Atualizando..."
            : lastUpdated
              ? `Atualizado ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • próx. em ${countdown}s`
              : "Ao vivo"}
        </span>
      </div>

      {/* ---- CONTENT AREA ---- */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="px-4">
            <div className="grid grid-cols-2 gap-3">
              {moduleDefinitions.map(mod => {
                const isClickable = mod.key === "checklist" || !!(mod as any).url;

                return (
                  <button
                    key={mod.key}
                    onClick={() => {
                      if (mod.key === "checklist") {
                        setActiveTab("checklist");
                      } else if ((mod as any).url) {
                        openModule((mod as any).url);
                      }
                    }}
                    disabled={!isClickable}
                    className="relative rounded-2xl p-4 text-left transition-all active:scale-95 disabled:opacity-40"
                    style={{
                      background: mod.bg,
                      border: `1px solid ${mod.border}`,
                      boxShadow: isClickable ? `0 8px 24px ${mod.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` : "none",
                    }}
                  >
                    {/* Status dot top-right */}
                    <div className="absolute top-3 right-3">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: mod.isOk ? "#34d399" : mod.isEmpty ? "#64748b" : "#fbbf24",
                          boxShadow: mod.isOk ? "0 0 6px rgba(52,211,153,0.6)" : mod.isEmpty ? "none" : "0 0 6px rgba(251,191,36,0.6)",
                        }}
                      />
                    </div>

                    {/* Emoji icon */}
                    <div className="text-3xl mb-3 leading-none">{mod.emoji}</div>

                    {/* Label */}
                    <div className="font-bold text-sm leading-tight mb-1.5" style={{ color: "#f1f5f9" }}>{mod.label}</div>

                    {/* Status text */}
                    <div
                      className="text-xs font-semibold"
                      style={{ color: mod.isOk ? "#6ee7b7" : mod.isEmpty ? "#64748b" : "#fde68a" }}
                    >
                      {mod.statusText}
                    </div>

                    {/* Arrow if clickable */}
                    {isClickable && (
                      <div
                        className="absolute bottom-3 right-3 h-6 w-6 rounded-lg flex items-center justify-center"
                        style={{ background: `rgba(255,255,255,0.08)` }}
                      >
                        <ChevronRight className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PENDING TAB */}
        {activeTab === "pending" && (
          <div className="px-4 space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⏳</span>
              <h2 className="text-white font-bold text-base">Itens pendentes</h2>
              {pendingCount > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
                  {pendingCount}
                </span>
              )}
            </div>
            {pendingChecklistItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-white font-bold text-lg">Tudo em dia!</p>
                <p className="text-slate-400 text-sm mt-1">Nenhum item pendente no checklist</p>
              </div>
            ) : (
              pendingChecklistItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}
                >
                  <div
                    className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                    style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-slate-200 text-sm font-medium">{item.title}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* CHECKLIST TAB */}
        {activeTab === "checklist" && (
          <div className="px-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">✅</span>
              <h2 className="text-white font-bold text-base">Checklist da Festa</h2>
              <span className="ml-auto text-sm font-bold" style={{ color: "#64748b" }}>
                {status.checklist.completed}/{status.checklist.total}
              </span>
            </div>

            {/* Progress bar */}
            {status.checklist.total > 0 && (
              <div className="mb-4">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${checklistProgress}%`,
                      background: checklistProgress === 100
                        ? "linear-gradient(90deg, #10b981, #34d399)"
                        : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                    }}
                  />
                </div>
              </div>
            )}

            {checklistItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-slate-400 text-sm">Nenhum item no checklist</p>
              </div>
            ) : (
              checklistItems.map(item => (
                <div
                  key={item.id}
                  className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{
                    background: item.is_completed ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)",
                    border: item.is_completed ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="h-5 w-5 rounded-md shrink-0 flex items-center justify-center"
                    style={{
                      background: item.is_completed ? "#10b981" : "transparent",
                      border: item.is_completed ? "none" : "2px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {item.is_completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: item.is_completed ? "#6ee7b7" : "#cbd5e1",
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
        className="fixed bottom-0 left-0 right-0"
        style={{
          background: "rgba(10,15,30,0.97)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-stretch">
          {[
            { id: "home" as TabType, label: "Início", emoji: "🏠", badge: null },
            { id: "pending" as TabType, label: "Pendentes", emoji: "⏳", badge: pendingCount > 0 ? pendingCount : null },
            { id: "checklist" as TabType, label: "Checklist", emoji: "✅", badge: null },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-1 py-3 px-2 relative transition-all"
                style={{ color: isActive ? "#a78bfa" : "#475569" }}
              >
                <div className="relative">
                  <span className="text-xl">{tab.emoji}</span>
                  {tab.badge !== null && (
                    <span
                      className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center"
                      style={{ background: "#ef4444", color: "#fff" }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-none">{tab.label}</span>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                    style={{ background: "#7c3aed" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
