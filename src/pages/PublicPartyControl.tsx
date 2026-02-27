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
    checklist: true, staff: true, maintenance: true, monitoring: true,
    attendance: true, info: true, prefesta: false, cardapio: false, avaliacao: false,
  };
  if (!settings) return defaults;
  const pcm = settings.party_control_modules;
  if (!pcm || typeof pcm !== "object" || Array.isArray(pcm)) return defaults;
  const m = pcm as Record<string, unknown>;
  return {
    checklist: m.checklist !== false, staff: m.staff !== false,
    maintenance: m.maintenance !== false, monitoring: m.monitoring !== false,
    attendance: m.attendance !== false, info: m.info !== false,
    prefesta: m.prefesta === true, cardapio: m.cardapio === true, avaliacao: m.avaliacao === true,
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
    staff: { id: null }, maintenance: { id: null }, monitoring: { id: null },
    attendance: { id: null, guestCount: 0 }, info: { id: null, blockCount: 0 },
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
    const [checklistRes, staffRes, maintenanceRes, monitoringRes, attendanceRes, infoRes] = await Promise.all([
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
      checklist: { total: items.length, completed: items.filter(i => i.is_completed).length },
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
      // Use RPCs instead of direct table access
      const { data: evArr } = await supabase.rpc("get_event_public_info", { _event_id: eventId });
      const evData = evArr && (evArr as any[])[0];
      if (!evData) { setNotFound(true); setLoading(false); return; }
      setEvent(evData as PartyEvent);
      companyIdRef = evData.company_id;

      const [companyRes, evalTmplRes, prefestTmplRes, cardapioTmplRes] = await Promise.all([
        supabase.rpc("get_company_public_with_settings", { _company_id: companyIdRef }),
        supabase.from("evaluation_templates").select("id, name, slug").eq("company_id", companyIdRef).eq("is_active", true),
        (supabase as any).from("pre_festa_templates").select("id, name, slug").eq("company_id", companyIdRef).eq("is_active", true),
        supabase.from("cardapio_templates").select("id, name, slug").eq("company_id", companyIdRef).eq("is_active", true),
      ]);

      if (companyRes.data) {
        const cArr = companyRes.data as any[];
        const c = cArr[0];
        if (c) {
          const settings = (c.settings && typeof c.settings === "object" && !Array.isArray(c.settings)) ? c.settings as Record<string, unknown> : null;
          setCompany({ name: c.name, logo_url: c.logo_url, slug: c.slug, settings });
          setModules(parsePartyControlModules(settings));
        }
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

    return () => { clearInterval(pollTimer); clearInterval(countdownTimer); };
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
    const timeStr = event.start_time ? `${event.start_time.slice(0, 5)}${event.end_time ? ` às ${event.end_time.slice(0, 5)}` : ""}` : "";
    const unitStr = event.unit ? ` • ${event.unit}` : "";
    const lines = [`🎉 *${event.title}*`, `📅 ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}${timeStr ? ` • ${timeStr}` : ""}${unitStr}`, ``, `🎮 *Painel de Controle da Festa:*`, url];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  };

  const openModule = (url: string) => window.open(url, "_blank");

  const getModuleUrl = (key: string): string | null => {
    const companySlug = company?.slug || "";
    switch (key) {
      case "staff": return status.staff.id ? `/equipe/${status.staff.id}` : null;
      case "maintenance": return status.maintenance.id ? `/manutencao/${status.maintenance.id}` : null;
      case "monitoring": return status.monitoring.id ? `/acompanhamento/${status.monitoring.id}` : null;
      case "attendance": return status.attendance.id ? `/lista-presenca/${status.attendance.id}` : null;
      case "info": return status.info.id ? `/informacoes/${status.info.id}` : null;
      case "avaliacao": return evalTemplates[0] ? `/avaliacao/${companySlug}/${evalTemplates[0].slug || evalTemplates[0].id}` : null;
      case "prefesta": return prefestTemplates[0] ? `/pre-festa/${companySlug}/${prefestTemplates[0].slug || prefestTemplates[0].id}` : null;
      case "cardapio": return cardapioTemplates[0] ? `/cardapio/${companySlug}/${cardapioTemplates[0].slug || cardapioTemplates[0].id}` : null;
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, #12174a 0%, #060810 100%)" }}>
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full" style={{ background: "rgba(139,92,246,0.2)", animation: "ping 1.5s ease-in-out infinite" }} />
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: "#a78bfa" }} />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium tracking-wide">Carregando central...</p>
        </div>
      </div>
    );
  }

  if (notFound || !event || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, #0d1020 0%, #020305 100%)" }}>
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto" style={{ color: "#334155" }} />
          <h1 className="text-xl font-bold text-white">Evento não encontrado</h1>
          <p className="text-slate-500 text-sm">Este link pode estar incorreto ou o evento foi removido.</p>
        </div>
      </div>
    );
  }

  const dateFormatted = format(new Date(event.event_date + "T12:00:00"), "EEE, dd/MM", { locale: ptBR });
  const timeStr = event.start_time ? `${event.start_time.slice(0, 5)}${event.end_time ? `–${event.end_time.slice(0, 5)}` : ""}` : null;

  const moduleDefinitions = [
    { key: "checklist", label: "Checklist", emoji: "✅", glow: "rgba(16,185,129,0.38)", border: "rgba(52,211,153,0.60)", bg: "linear-gradient(160deg, rgba(16,185,129,0.32) 0%, rgba(5,150,105,0.12) 50%, rgba(1,28,18,0.08) 100%)", enabled: modules?.checklist ?? true, statusText: status.checklist.total === 0 ? "Sem itens" : `${status.checklist.completed}/${status.checklist.total} itens`, isOk: status.checklist.total > 0 && status.checklist.completed === status.checklist.total, isWarning: status.checklist.total > 0 && status.checklist.completed < status.checklist.total, isEmpty: status.checklist.total === 0 },
    { key: "staff", label: "Equipe", emoji: "👥", glow: "rgba(59,130,246,0.38)", border: "rgba(99,155,255,0.60)", bg: "linear-gradient(160deg, rgba(59,130,246,0.32) 0%, rgba(37,99,235,0.12) 50%, rgba(8,20,60,0.08) 100%)", enabled: modules?.staff ?? true, statusText: status.staff.id ? "Registrado" : "Não criado", isOk: !!status.staff.id, isWarning: !status.staff.id, isEmpty: false, url: getModuleUrl("staff") },
    { key: "maintenance", label: "Manutenção", emoji: "🔧", glow: "rgba(139,92,246,0.38)", border: "rgba(167,139,250,0.60)", bg: "linear-gradient(160deg, rgba(139,92,246,0.32) 0%, rgba(109,40,217,0.12) 50%, rgba(30,8,70,0.08) 100%)", enabled: modules?.maintenance ?? true, statusText: status.maintenance.id ? "Registrado" : "Não criado", isOk: !!status.maintenance.id, isWarning: !status.maintenance.id, isEmpty: false, url: getModuleUrl("maintenance") },
    { key: "monitoring", label: "Acompanhamento", emoji: "📋", glow: "rgba(245,158,11,0.38)", border: "rgba(251,191,36,0.60)", bg: "linear-gradient(160deg, rgba(245,158,11,0.32) 0%, rgba(180,83,9,0.12) 50%, rgba(70,28,0,0.08) 100%)", enabled: modules?.monitoring ?? true, statusText: status.monitoring.id ? "Registrado" : "Não criado", isOk: !!status.monitoring.id, isWarning: !status.monitoring.id, isEmpty: false, url: getModuleUrl("monitoring") },
    { key: "attendance", label: "Presença", emoji: "🎟️", glow: "rgba(249,115,22,0.38)", border: "rgba(251,146,60,0.60)", bg: "linear-gradient(160deg, rgba(249,115,22,0.32) 0%, rgba(194,65,12,0.12) 50%, rgba(80,20,0,0.08) 100%)", enabled: modules?.attendance ?? true, statusText: status.attendance.id ? `${status.attendance.guestCount} convidados` : "Não criado", isOk: !!status.attendance.id, isWarning: !status.attendance.id, isEmpty: false, url: getModuleUrl("attendance") },
    { key: "info", label: "Informações", emoji: "📌", glow: "rgba(6,182,212,0.38)", border: "rgba(34,211,238,0.60)", bg: "linear-gradient(160deg, rgba(6,182,212,0.32) 0%, rgba(8,145,178,0.12) 50%, rgba(0,40,60,0.08) 100%)", enabled: modules?.info ?? true, statusText: status.info.id ? `${status.info.blockCount} blocos` : "Não criado", isOk: !!status.info.id, isWarning: !status.info.id, isEmpty: false, url: getModuleUrl("info") },
    { key: "prefesta", label: "Pré-Festa", emoji: "🎀", glow: "rgba(236,72,153,0.38)", border: "rgba(244,114,182,0.60)", bg: "linear-gradient(160deg, rgba(236,72,153,0.32) 0%, rgba(190,24,93,0.12) 50%, rgba(70,0,35,0.08) 100%)", enabled: modules?.prefesta ?? false, statusText: getModuleUrl("prefesta") ? "Disponível" : "Sem template", isOk: !!getModuleUrl("prefesta"), isWarning: !getModuleUrl("prefesta"), isEmpty: false, url: getModuleUrl("prefesta") },
    { key: "cardapio", label: "Cardápio", emoji: "🍽️", glow: "rgba(234,179,8,0.38)", border: "rgba(250,204,21,0.60)", bg: "linear-gradient(160deg, rgba(234,179,8,0.32) 0%, rgba(161,98,7,0.12) 50%, rgba(60,35,0,0.08) 100%)", enabled: modules?.cardapio ?? false, statusText: getModuleUrl("cardapio") ? "Disponível" : "Sem template", isOk: !!getModuleUrl("cardapio"), isWarning: !getModuleUrl("cardapio"), isEmpty: false, url: getModuleUrl("cardapio") },
    { key: "avaliacao", label: "Avaliação", emoji: "⭐", glow: "rgba(20,184,166,0.38)", border: "rgba(45,212,191,0.60)", bg: "linear-gradient(160deg, rgba(20,184,166,0.32) 0%, rgba(15,118,110,0.12) 50%, rgba(0,40,36,0.08) 100%)", enabled: modules?.avaliacao ?? false, statusText: getModuleUrl("avaliacao") ? "Disponível" : "Sem template", isOk: !!getModuleUrl("avaliacao"), isWarning: !getModuleUrl("avaliacao"), isEmpty: false, url: getModuleUrl("avaliacao") },
  ].filter(m => m.enabled);

  const checklistProgress = status.checklist.total > 0
    ? Math.round((status.checklist.completed / status.checklist.total) * 100)
    : 0;

  const statusColors = {
    confirmado: { bg: "linear-gradient(90deg,rgba(16,185,129,0.32),rgba(5,150,105,0.20))", color: "#34d399", border: "rgba(52,211,153,0.65)", glow: "rgba(16,185,129,0.45)" },
    cancelado:  { bg: "linear-gradient(90deg,rgba(239,68,68,0.32),rgba(185,28,28,0.20))",   color: "#f87171", border: "rgba(239,68,68,0.65)",   glow: "rgba(239,68,68,0.45)" },
    default:    { bg: "linear-gradient(90deg,rgba(251,191,36,0.32),rgba(180,83,9,0.20))",   color: "#fbbf24", border: "rgba(251,191,36,0.65)",   glow: "rgba(251,191,36,0.45)" },
  };
  const sc = event.status === "confirmado" ? statusColors.confirmado : event.status === "cancelado" ? statusColors.cancelado : statusColors.default;

  return (
    <div
      className="flex flex-col overflow-hidden relative"
      style={{
        background: "radial-gradient(ellipse 75% 50% at 50% 18%, #1a2158 0%, #070a18 48%, #010203 100%)",
        height: "100dvh",
      }}
    >
      {/* Noise */}
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`, zIndex: 0 }} />
      {/* Vignette forte */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 90% 90% at 50% 45%, transparent 20%, rgba(0,0,0,0.50) 60%, rgba(0,0,0,0.92) 100%)", zIndex: 0 }} />

      {/* ══════════════ HEADER ══════════════ */}
      <div
        className="shrink-0 px-3 pt-2 pb-2.5 relative z-10"
        style={{
          background: "linear-gradient(180deg, rgba(44,54,108,0.99) 0%, rgba(20,26,58,0.98) 60%, rgba(10,13,30,0.96) 100%)",
          borderBottom: "1px solid rgba(139,92,246,0.60)",
          borderLeft: "1px solid rgba(139,92,246,0.15)",
          borderRight: "1px solid rgba(139,92,246,0.15)",
          boxShadow: [
            "0 24px 64px rgba(0,0,0,0.95)",
            "0 10px 28px rgba(0,0,0,0.75)",
            "inset 0 2px 0 rgba(255,255,255,0.16)",
            "inset 0 -1px 0 rgba(139,92,246,0.30)",
            "0 4px 24px rgba(139,92,246,0.45)",
          ].join(", "),
        }}
      >
        {/* Top highlight — linha brilhante */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 3%, rgba(167,139,250,0.7) 25%, rgba(221,214,254,1) 50%, rgba(167,139,250,0.7) 75%, transparent 97%)", boxShadow: "0 0 12px rgba(167,139,250,0.6)" }} />
        {/* Brilho lateral esquerdo */}
        <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: "linear-gradient(180deg, rgba(167,139,250,0.7) 0%, rgba(139,92,246,0.2) 60%, transparent 100%)" }} />
        {/* Brilho lateral direito */}
        <div className="absolute top-0 bottom-0 right-0 w-px" style={{ background: "linear-gradient(180deg, rgba(167,139,250,0.7) 0%, rgba(139,92,246,0.2) 60%, transparent 100%)" }} />

        {/* Company bar */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-5 w-5 rounded-md object-cover" style={{ border: "1px solid rgba(167,139,250,0.55)", boxShadow: "0 0 10px rgba(139,92,246,0.45)" }} />
            ) : (
              <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: "rgba(139,92,246,0.40)", border: "1px solid rgba(167,139,250,0.65)", boxShadow: "0 0 10px rgba(139,92,246,0.5)" }}>
                <PartyPopper className="h-2.5 w-2.5" style={{ color: "#ddd6fe" }} />
              </div>
            )}
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#c4b5fd", letterSpacing: "0.14em" }}>{company.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {refreshing ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" style={{ color: "#a78bfa" }} />
            ) : (
              <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ background: "#22c55e", boxShadow: "0 0 10px rgba(34,197,94,1), 0 0 20px rgba(34,197,94,0.5)" }} />
            )}
            <span className="font-mono text-[8px]" style={{ color: "#6b7280" }}>
              {refreshing ? "Sincronizando..." : lastUpdated ? `${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${countdown}s` : "Ao vivo"}
            </span>
          </div>
        </div>

        {/* Event info */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-1 mb-1 px-2.5 py-0.5 rounded-full" style={{ background: "linear-gradient(90deg, rgba(109,40,217,0.45), rgba(139,92,246,0.30), rgba(109,40,217,0.45))", border: "1px solid rgba(196,181,253,0.55)", boxShadow: "0 0 24px rgba(139,92,246,0.45), inset 0 1px 0 rgba(255,255,255,0.15)" }}>
            <Zap className="h-2.5 w-2.5" style={{ color: "#f3e8ff", filter: "drop-shadow(0 0 4px rgba(167,139,250,0.8))" }} />
            <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "#f3e8ff" }}>Central de Controle</span>
          </div>
          <h1 className="font-black text-lg leading-tight text-white mb-0.5" style={{ textShadow: "0 0 30px rgba(167,139,250,0.60), 0 0 60px rgba(139,92,246,0.25), 0 2px 8px rgba(0,0,0,0.7)" }}>
            {event.title}
          </h1>
          <p className="text-[10px] font-semibold leading-tight" style={{ color: "#475569" }}>
            <span className="capitalize">{dateFormatted}</span>
            {timeStr && <span> • {timeStr}</span>}
            {event.unit && <span> • {event.unit}</span>}
            {event.guest_count && <span> • {event.guest_count} conv.</span>}
          </p>
          <div className="mt-1 flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, boxShadow: `0 0 18px ${sc.glow}, inset 0 1px 0 rgba(255,255,255,0.12)` }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: sc.color, boxShadow: `0 0 8px ${sc.color}` }} />
              {event.status === "confirmado" ? "🎉 Confirmado" : event.status === "cancelado" ? "Cancelado" : "Pendente"}
            </span>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          {/* OK */}
          <div className="rounded-xl py-3 px-1 text-center relative overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(16,185,129,0.45) 0%, rgba(5,150,105,0.18) 45%, rgba(1,25,16,0.12) 100%)", border: "1px solid rgba(52,211,153,0.70)", boxShadow: ["0 20px 48px rgba(16,185,129,0.40)", "0 8px 20px rgba(0,0,0,0.75)", "inset 0 3px 0 rgba(255,255,255,0.20)", "inset 0 -2px 0 rgba(0,0,0,0.45)", "inset 0 0 20px rgba(16,185,129,0.08)"].join(", ") }}>
            <div className="absolute top-0 left-2 right-2 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(110,231,183,1), transparent)", boxShadow: "0 0 6px rgba(110,231,183,0.8)" }} />
            <div style={{ fontSize: "28px", lineHeight: 1, marginBottom: "4px", filter: "drop-shadow(0 3px 8px rgba(16,185,129,0.7))" }}>✅</div>
            <div className="font-black leading-none" style={{ fontSize: "32px", color: "#34d399", textShadow: "0 0 24px rgba(52,211,153,1), 0 0 48px rgba(52,211,153,0.6), 0 2px 6px rgba(0,0,0,0.6)" }}>
              {status.checklist.completed}
            </div>
            <div className="text-[8px] font-black uppercase mt-1" style={{ color: "#6ee7b7", letterSpacing: "0.18em" }}>OK</div>
          </div>

          {/* Pendentes */}
          <div className="rounded-xl py-3 px-1 text-center relative overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(251,191,36,0.45) 0%, rgba(180,83,9,0.18) 45%, rgba(55,22,0,0.12) 100%)", border: "1px solid rgba(251,191,36,0.70)", boxShadow: ["0 20px 48px rgba(251,191,36,0.40)", "0 8px 20px rgba(0,0,0,0.75)", "inset 0 3px 0 rgba(255,255,255,0.20)", "inset 0 -2px 0 rgba(0,0,0,0.45)", "inset 0 0 20px rgba(251,191,36,0.08)"].join(", ") }}>
            <div className="absolute top-0 left-2 right-2 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(253,230,138,1), transparent)", boxShadow: "0 0 6px rgba(253,230,138,0.8)" }} />
            <div style={{ fontSize: "28px", lineHeight: 1, marginBottom: "4px", filter: "drop-shadow(0 3px 8px rgba(251,191,36,0.7))" }}>⏳</div>
            <div className="font-black leading-none" style={{ fontSize: "32px", color: "#fbbf24", textShadow: "0 0 24px rgba(251,191,36,1), 0 0 48px rgba(251,191,36,0.6), 0 2px 6px rgba(0,0,0,0.6)" }}>
              {pendingCount}
            </div>
            <div className="text-[8px] font-black uppercase mt-1" style={{ color: "#fde68a", letterSpacing: "0.18em" }}>Pendentes</div>
          </div>

          {/* Alertas */}
          <div className="rounded-xl py-3 px-1 text-center relative overflow-hidden"
            style={{
              background: modulesMissing > 0
                ? "linear-gradient(160deg, rgba(239,68,68,0.48) 0%, rgba(185,28,28,0.20) 45%, rgba(65,5,5,0.14) 100%)"
                : "linear-gradient(160deg, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.12) 45%, rgba(1,25,16,0.08) 100%)",
              border: modulesMissing > 0 ? "1px solid rgba(239,68,68,0.72)" : "1px solid rgba(52,211,153,0.60)",
              boxShadow: modulesMissing > 0
                ? ["0 20px 48px rgba(239,68,68,0.45)", "0 8px 20px rgba(0,0,0,0.75)", "inset 0 3px 0 rgba(255,255,255,0.20)", "inset 0 -2px 0 rgba(0,0,0,0.45)", "inset 0 0 20px rgba(239,68,68,0.10)"].join(", ")
                : ["0 20px 48px rgba(16,185,129,0.28)", "0 8px 20px rgba(0,0,0,0.75)", "inset 0 3px 0 rgba(255,255,255,0.20)", "inset 0 -2px 0 rgba(0,0,0,0.45)"].join(", "),
            }}>
            <div className="absolute top-0 left-2 right-2 h-px" style={{ background: modulesMissing > 0 ? "linear-gradient(90deg, transparent, rgba(252,165,165,1), transparent)" : "linear-gradient(90deg, transparent, rgba(110,231,183,0.9), transparent)", boxShadow: modulesMissing > 0 ? "0 0 6px rgba(252,165,165,0.7)" : "0 0 6px rgba(110,231,183,0.7)" }} />
            <div style={{ fontSize: "28px", lineHeight: 1, marginBottom: "4px", filter: modulesMissing > 0 ? "drop-shadow(0 3px 8px rgba(239,68,68,0.8))" : "drop-shadow(0 3px 8px rgba(16,185,129,0.6))" }}>{modulesMissing > 0 ? "🚨" : "🟢"}</div>
            <div className="font-black leading-none" style={{ fontSize: "32px", color: modulesMissing > 0 ? "#f87171" : "#34d399", textShadow: modulesMissing > 0 ? "0 0 24px rgba(239,68,68,1), 0 0 48px rgba(239,68,68,0.6), 0 2px 6px rgba(0,0,0,0.6)" : "0 0 24px rgba(52,211,153,1), 0 0 48px rgba(52,211,153,0.5), 0 2px 6px rgba(0,0,0,0.6)" }}>
              {modulesMissing}
            </div>
            <div className="text-[8px] font-black uppercase mt-1" style={{ color: modulesMissing > 0 ? "#fca5a5" : "#6ee7b7", letterSpacing: "0.18em" }}>Alertas</div>
          </div>
        </div>

        {/* Progress bar */}
        {status.checklist.total > 0 && (
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#334155" }}>Checklist</span>
              <span className="text-[9px] font-black font-mono" style={{ color: checklistProgress === 100 ? "#34d399" : "#64748b" }}>{checklistProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${checklistProgress}%`,
                  background: checklistProgress === 100 ? "linear-gradient(90deg, #059669, #10b981, #34d399)" : "linear-gradient(90deg, #92400e, #d97706, #fbbf24)",
                  boxShadow: checklistProgress === 100 ? "0 0 12px rgba(52,211,153,0.9), 0 0 24px rgba(52,211,153,0.4)" : "0 0 12px rgba(251,191,36,0.9), 0 0 24px rgba(251,191,36,0.4)",
                }} />
            </div>
          </div>
        )}

        {/* Alert banner */}
        {modulesMissing > 0 && (
          <div className="rounded-xl px-3 py-2 flex items-center gap-2.5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(185,28,28,0.55) 0%, rgba(239,68,68,0.25) 50%, rgba(127,29,29,0.40) 100%)",
              border: "1px solid rgba(239,68,68,0.68)",
              boxShadow: ["0 12px 32px rgba(239,68,68,0.45)", "0 4px 14px rgba(0,0,0,0.6)", "inset 0 2px 0 rgba(255,255,255,0.12)", "inset 0 0 30px rgba(239,68,68,0.12)"].join(", "),
            }}>
            <div className="absolute top-0 left-3 right-3 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(252,165,165,0.9), transparent)" }} />
            <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#fca5a5", filter: "drop-shadow(0 0 8px rgba(239,68,68,1))" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black leading-tight" style={{ color: "#fecaca" }}>Atenção necessária</p>
              <p className="text-[9px] font-semibold leading-tight mt-0.5" style={{ color: "#fca5a5" }}>
                {modulesMissing} módulo{modulesMissing > 1 ? "s" : ""} não {modulesMissing > 1 ? "criados" : "criado"}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("home")}
              className="flex items-center gap-1 text-[9px] font-black px-2 py-1.5 rounded-lg shrink-0 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.7), rgba(220,38,38,0.5))", color: "#fef2f2", border: "1px solid rgba(252,165,165,0.55)", boxShadow: "0 4px 14px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.18)" }}>
              Ver <ArrowRight className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Luminous separator */}
      <div className="shrink-0 relative z-10 h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(109,40,217,0.5) 15%, rgba(167,139,250,1) 50%, rgba(109,40,217,0.5) 85%, transparent 100%)", boxShadow: "0 0 20px rgba(139,92,246,0.7), 0 0 40px rgba(139,92,246,0.25)" }} />

      {/* ══════════════ CONTENT ══════════════ */}
      <div className="flex-1 overflow-y-auto py-3 relative z-10">

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="px-3">
            <div className="grid grid-cols-2 gap-3">
              {moduleDefinitions.map(mod => {
                const isClickable = mod.key === "checklist" || !!(mod as any).url;
                return (
                  <button
                    key={mod.key}
                    onClick={() => {
                      if (mod.key === "checklist") setActiveTab("checklist");
                      else if ((mod as any).url) openModule((mod as any).url);
                    }}
                    disabled={!isClickable}
                    className="relative rounded-2xl text-left transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] disabled:opacity-15 overflow-hidden"
                    style={{
                      padding: "16px 13px 14px",
                      background: isClickable ? mod.bg : "linear-gradient(160deg, rgba(15,18,38,0.80) 0%, rgba(8,10,22,0.60) 100%)",
                      border: isClickable ? `1px solid ${mod.border}` : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: isClickable
                        ? [
                            `0 20px 45px ${mod.glow}`,
                            "0 8px 20px rgba(0,0,0,0.80)",
                            "inset 0 2px 0 rgba(255,255,255,0.20)",
                            "inset 0 -3px 0 rgba(0,0,0,0.50)",
                            "inset 1px 0 0 rgba(255,255,255,0.06)",
                          ].join(", ")
                        : "0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                  >
                    {/* Top highlight shimmer */}
                    {isClickable && (
                      <div className="absolute top-0 left-4 right-4 h-px"
                        style={{ background: `linear-gradient(90deg, transparent, ${mod.border.replace(/[\d.]+\)$/, "1.0)")}, transparent)`, boxShadow: `0 0 6px ${mod.border}` }} />
                    )}
                    {/* Inner top glow */}
                    {isClickable && (
                      <div className="absolute top-0 left-0 right-0 h-12 pointer-events-none"
                        style={{ background: `linear-gradient(180deg, ${mod.glow.replace(/[\d.]+\)$/, "0.22)")}, transparent)` }} />
                    )}

                    {/* Status dot */}
                    <div className="absolute top-3 right-3">
                      <div
                        className={!mod.isEmpty ? "animate-pulse" : ""}
                        style={{
                          width: "10px", height: "10px", borderRadius: "50%",
                          background: mod.isOk ? "#34d399" : mod.isEmpty ? "#1a2035" : "#fbbf24",
                          boxShadow: mod.isOk
                            ? "0 0 12px rgba(52,211,153,1), 0 0 24px rgba(52,211,153,0.65)"
                            : mod.isEmpty ? "none"
                            : "0 0 14px rgba(251,191,36,1), 0 0 28px rgba(251,191,36,0.65)",
                          border: "1px solid rgba(255,255,255,0.25)",
                        }} />
                    </div>

                    {/* Emoji — 48px */}
                    <div style={{
                      fontSize: "38px",
                      lineHeight: 1,
                      marginBottom: "10px",
                      filter: isClickable
                        ? `drop-shadow(0 4px 10px ${mod.glow}) drop-shadow(0 1px 3px rgba(0,0,0,0.7))`
                        : "grayscale(1) opacity(0.25)",
                    }}>
                      {mod.emoji}
                    </div>

                    {/* Label */}
                    <div className="font-black text-sm leading-tight mb-1" style={{ color: isClickable ? "#f8fafc" : "#1e293b", textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
                      {mod.label}
                    </div>

                    {/* Status */}
                    <div className="text-[10px] font-bold" style={{ color: mod.isOk ? "#6ee7b7" : mod.isEmpty ? "#1e293b" : "#fde68a" }}>
                      {mod.statusText}
                    </div>

                    {/* Arrow */}
                    {isClickable && (
                      <div className="absolute bottom-3 right-3 h-5 w-5 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 6px rgba(0,0,0,0.4)" }}>
                        <ChevronRight className="h-3 w-3" style={{ color: "rgba(255,255,255,0.85)" }} />
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
                <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: "rgba(251,191,36,0.22)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.55)", boxShadow: "0 0 12px rgba(251,191,36,0.35)" }}>
                  {pendingCount}
                </span>
              )}
            </div>
            {pendingChecklistItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-white font-bold text-lg">Tudo em dia!</p>
                <p className="text-slate-500 text-sm mt-1">Nenhum item pendente no checklist</p>
              </div>
            ) : (
              pendingChecklistItems.map((item, idx) => (
                <div key={item.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.14) 0%, rgba(180,83,9,0.07) 100%)", border: "1px solid rgba(251,191,36,0.30)", boxShadow: "0 6px 18px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)" }}>
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 font-black text-xs"
                    style={{ background: "rgba(251,191,36,0.28)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.50)", boxShadow: "0 0 10px rgba(251,191,36,0.45)" }}>
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
              <span className="ml-auto text-sm font-bold" style={{ color: "#475569" }}>{status.checklist.completed}/{status.checklist.total}</span>
            </div>
            {status.checklist.total > 0 && (
              <div className="mb-4">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${checklistProgress}%`, background: checklistProgress === 100 ? "linear-gradient(90deg, #059669, #10b981, #34d399)" : "linear-gradient(90deg, #92400e, #d97706, #fbbf24)", boxShadow: checklistProgress === 100 ? "0 0 12px rgba(52,211,153,0.9)" : "0 0 12px rgba(251,191,36,0.9)" }} />
                </div>
              </div>
            )}
            {checklistItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-slate-500 text-sm">Nenhum item no checklist</p>
              </div>
            ) : (
              checklistItems.map(item => (
                <div key={item.id} className="rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{
                    background: item.is_completed ? "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.06) 100%)" : "rgba(255,255,255,0.03)",
                    border: item.is_completed ? "1px solid rgba(52,211,153,0.40)" : "1px solid rgba(255,255,255,0.07)",
                    boxShadow: item.is_completed ? "0 4px 16px rgba(16,185,129,0.18), inset 0 1px 0 rgba(255,255,255,0.09)" : "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}>
                  <div className="h-5 w-5 rounded-md shrink-0 flex items-center justify-center"
                    style={{ background: item.is_completed ? "linear-gradient(135deg, #059669, #10b981, #34d399)" : "transparent", border: item.is_completed ? "none" : "2px solid rgba(255,255,255,0.16)", boxShadow: item.is_completed ? "0 0 12px rgba(52,211,153,0.65)" : "none" }}>
                    {item.is_completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <span className="text-sm font-medium" style={{ color: item.is_completed ? "#6ee7b7" : "#cbd5e1", textDecoration: item.is_completed ? "line-through" : "none" }}>
                    {item.title}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ══════════════ BOTTOM NAV ══════════════ */}
      <div className="shrink-0 relative z-10"
        style={{ background: "linear-gradient(180deg, rgba(5,7,18,1) 0%, rgba(2,3,10,1) 100%)", borderTop: "1px solid rgba(139,92,246,0.40)", boxShadow: "0 -16px 48px rgba(0,0,0,0.90), 0 -2px 20px rgba(139,92,246,0.20), inset 0 1px 0 rgba(167,139,250,0.35)", backdropFilter: "blur(24px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 3%, rgba(139,92,246,0.6) 25%, rgba(196,181,253,0.95) 50%, rgba(139,92,246,0.6) 75%, transparent 97%)", boxShadow: "0 0 10px rgba(167,139,250,0.5)" }} />
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
                className="flex-1 flex flex-col items-center gap-0.5 py-2 px-2 relative transition-all duration-200"
                style={{ color: isActive ? "#ddd6fe" : "#2d3a55" }}
              >
                {isActive && (
                  <div className="absolute inset-x-1.5 top-1 bottom-1 rounded-xl"
                    style={{ background: "linear-gradient(160deg, rgba(109,40,217,0.38) 0%, rgba(139,92,246,0.18) 100%)", border: "1px solid rgba(167,139,250,0.45)", boxShadow: "0 4px 18px rgba(139,92,246,0.30), inset 0 1px 0 rgba(255,255,255,0.12)" }} />
                )}
                <div className="relative z-10">
                  <span className="text-lg" style={{ filter: isActive ? "drop-shadow(0 0 8px rgba(196,181,253,0.8))" : "none" }}>{tab.emoji}</span>
                  {tab.badge !== null && (
                    <span className="absolute -top-1 -right-2 h-4 min-w-4 px-0.5 rounded-full text-[9px] font-black flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "#fff", boxShadow: "0 0 12px rgba(239,68,68,0.9), 0 0 24px rgba(239,68,68,0.4)" }}>
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold leading-none relative z-10" style={{ letterSpacing: "0.06em" }}>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-12 rounded-full"
                    style={{ background: "linear-gradient(90deg, #6d28d9, #a78bfa, #6d28d9)", boxShadow: "0 0 12px rgba(139,92,246,1), 0 0 24px rgba(139,92,246,0.5)" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
