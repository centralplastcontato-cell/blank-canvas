import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  Bot,
  AlertTriangle,
  Eye,
  Send,
  RefreshCw,
  PhoneCall,
  DollarSign,
  CalendarX,
  Users,
  XCircle,
  PhoneOff,
  Save,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { TemperatureBadge } from "./TemperatureBadge";
import { ScoreBadge } from "./ScoreBadge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const InlineAISummary = lazy(() =>
  import("./InlineAISummary").then((m) => ({ default: m.InlineAISummary }))
);

interface FollowUpLeadDetailSheetProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  score?: number;
  temperature?: string;
  leadWhatsapp?: string;
  onUpdate?: () => void;
}

interface LeadData {
  id: string;
  name: string;
  whatsapp: string;
  status: string;
  unit: string | null;
  created_at: string;
  observacoes: string | null;
  month: string | null;
  guests: string | null;
  day_preference: string | null;
  company_id: string;
}

interface HistoryEvent {
  id: string;
  action: string;
  created_at: string;
}

function getActionIcon(action: string) {
  if (action.includes("Motivo perda"))
    return <AlertTriangle className="h-3.5 w-3.5" />;
  if (action.includes("Reativar") || action.includes("reativado"))
    return <RefreshCw className="h-3.5 w-3.5" />;
  if (action.includes("Tentei contato"))
    return <PhoneCall className="h-3.5 w-3.5" />;
  if (action.includes("Follow-up") || action.includes("follow-up"))
    return <Send className="h-3.5 w-3.5" />;
  if (action.includes("perdido"))
    return <AlertTriangle className="h-3.5 w-3.5" />;
  if (action.includes("Status") || action.includes("movido") || action.includes("Movido"))
    return <ArrowRight className="h-3.5 w-3.5" />;
  if (action.includes("visita") || action.includes("Visita"))
    return <Eye className="h-3.5 w-3.5" />;
  if (action.includes("bot") || action.includes("Bot") || action.includes("automát"))
    return <Bot className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
}

function getActionColor(action: string) {
  if (action.includes("Reativar") || action.includes("reativado")) return "text-emerald-500 bg-emerald-500/10";
  if (action.includes("Tentei contato")) return "text-sky-500 bg-sky-500/10";
  if (action.includes("Motivo perda")) return "text-rose-500 bg-rose-500/10";
  if (action.includes("perdido")) return "text-rose-500 bg-rose-500/10";
  if (action.includes("Follow-up #4")) return "text-red-500 bg-red-500/10";
  if (action.includes("Follow-up #3")) return "text-orange-500 bg-orange-500/10";
  if (action.includes("Follow-up #2")) return "text-sky-500 bg-sky-500/10";
  if (action.includes("Follow-up")) return "text-green-500 bg-green-500/10";
  if (action.includes("visita") || action.includes("Visita")) return "text-violet-500 bg-violet-500/10";
  return "text-muted-foreground bg-muted";
}

const QUICK_ACTIONS = [
  { label: "Reativar lead", icon: RefreshCw, color: "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:bg-emerald-900/40", changeStatus: "em_contato" as const },
  { label: "Tentei contato", icon: PhoneCall, color: "text-sky-600 border-sky-200 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:border-sky-800 dark:hover:bg-sky-900/40" },
];

const LOSS_REASONS = [
  { label: "Achou caro", icon: DollarSign },
  { label: "Não tinha a data", icon: CalendarX },
  { label: "Fechou no concorrente", icon: Users },
  { label: "Sem interesse", icon: XCircle },
  { label: "Número errado", icon: PhoneOff },
  { label: "Vai retornar depois", icon: Clock },
];

export function FollowUpLeadDetailSheet({
  leadId,
  isOpen,
  onClose,
  score,
  temperature,
  leadWhatsapp: propWhatsapp,
  onUpdate,
}: FollowUpLeadDetailSheetProps) {
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId || !isOpen) return;
    setLoading(true);

    const fetchData = async () => {
      const [leadRes, histRes] = await Promise.all([
        supabase
          .from("campaign_leads")
          .select("id, name, whatsapp, status, unit, created_at, observacoes, month, guests, day_preference, company_id")
          .eq("id", leadId)
          .single(),
        supabase
          .from("lead_history")
          .select("id, action, created_at")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (leadRes.data) {
        setLead(leadRes.data as LeadData);
        setObservacoes(leadRes.data.observacoes || "");
      }
      if (histRes.data) setHistory(histRes.data as unknown as HistoryEvent[]);
      setLoading(false);
    };

    fetchData();
  }, [leadId, isOpen]);

  const handleQuickAction = async (label: string, changeStatus?: string) => {
    if (!lead || !leadId) return;
    setActionLoading(label);

    try {
      const actionText = label === "Reativar lead" ? "Lead reativado manualmente" : label;

      const { error: histError } = await supabase.from("lead_history").insert({
        lead_id: leadId,
        company_id: lead.company_id,
        action: actionText,
      });

      if (histError) throw histError;

      if (changeStatus) {
        const { error: statusError } = await supabase
          .from("campaign_leads")
          .update({ status: changeStatus as any })
          .eq("id", leadId);
        if (statusError) throw statusError;
        setLead(prev => prev ? { ...prev, status: changeStatus } : null);
      }

      setHistory(prev => [{
        id: crypto.randomUUID(),
        action: actionText,
        created_at: new Date().toISOString(),
      }, ...prev]);

      toast.success(`Ação registrada: ${label}`);
      onUpdate?.();
    } catch {
      toast.error("Erro ao registrar ação");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLossReason = async (reason: string) => {
    if (!lead || !leadId) return;
    setActionLoading(reason);

    try {
      const actionText = `Motivo perda: ${reason}`;

      const { error } = await supabase.from("lead_history").insert({
        lead_id: leadId,
        company_id: lead.company_id,
        action: actionText,
      });

      if (error) throw error;

      setHistory(prev => [{
        id: crypto.randomUUID(),
        action: actionText,
        created_at: new Date().toISOString(),
      }, ...prev]);

      toast.success(`Motivo registrado: ${reason}`);
      onUpdate?.();
    } catch {
      toast.error("Erro ao registrar motivo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveObservacoes = async () => {
    if (!leadId) return;
    setSavingObs(true);

    try {
      const { error } = await supabase
        .from("campaign_leads")
        .update({ observacoes })
        .eq("id", leadId);

      if (error) throw error;
      setLead(prev => prev ? { ...prev, observacoes } : null);
      toast.success("Observações salvas");
    } catch {
      toast.error("Erro ao salvar observações");
    } finally {
      setSavingObs(false);
    }
  };

  const whatsapp = lead?.whatsapp || propWhatsapp;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[95vw] sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base truncate">
                {loading ? <Skeleton className="h-5 w-32" /> : lead?.name || "Lead"}
              </SheetTitle>
              {!loading && lead && (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {LEAD_STATUS_LABELS[lead.status as LeadStatus] || lead.status}
                  </Badge>
                  {lead.unit && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" />
                      {lead.unit}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : lead ? (
            <div className="p-4 space-y-4">
              {/* Info Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {score !== undefined && <ScoreBadge score={score} classificacao={score >= 70 ? 'alta' : score >= 40 ? 'media' : 'baixa'} compact />}
                  {temperature && <TemperatureBadge temperature={temperature} />}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{lead.whatsapp}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(lead.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  {lead.month && (
                    <div className="text-muted-foreground col-span-2">
                      📅 Mês interesse: <span className="text-foreground font-medium">{lead.month}</span>
                    </div>
                  )}
                  {lead.guests && (
                    <div className="text-muted-foreground col-span-2">
                      👥 Convidados: <span className="text-foreground font-medium">{lead.guests}</span>
                    </div>
                  )}
                  {lead.day_preference && (
                    <div className="text-muted-foreground col-span-2">
                      🗓️ Preferência: <span className="text-foreground font-medium">{lead.day_preference}</span>
                    </div>
                  )}
                </div>

                {/* WhatsApp Button */}
                {whatsapp && (
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      onClose();
                      navigate(`/atendimento?phone=${whatsapp}`);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Abrir conversa no WhatsApp
                  </Button>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Ações Rápidas
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const isLoading = actionLoading === action.label;
                    return (
                      <Button
                        key={action.label}
                        variant="outline"
                        size="sm"
                        className={`justify-start gap-2 text-xs h-9 ${action.color}`}
                        disabled={!!actionLoading}
                        onClick={() => handleQuickAction(action.label, action.changeStatus)}
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Loss Reasons */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Motivo da Perda
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {LOSS_REASONS.map((reason) => {
                    const Icon = reason.icon;
                    const isLoading = actionLoading === reason.label;
                    return (
                      <Button
                        key={reason.label}
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2 text-xs h-9 text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-800 dark:hover:bg-rose-900/40"
                        disabled={!!actionLoading}
                        onClick={() => handleLossReason(reason.label)}
                      >
                        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
                        {reason.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Observações */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Observações
                </h3>
                <div className="rounded-lg border border-border bg-white dark:bg-card p-3 space-y-2">
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Escreva suas observações aqui..."
                    className="text-xs min-h-[80px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
                    rows={4}
                  />
                  <div className="flex justify-end pt-1 border-t border-border/40">
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs h-7 px-3"
                      disabled={savingObs || observacoes === (lead.observacoes || "")}
                      onClick={handleSaveObservacoes}
                    >
                      {savingObs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {leadId && whatsapp && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Resumo IA
                  </h3>
                  <Suspense fallback={<Skeleton className="h-20 rounded-xl" />}>
                    <InlineAISummary leadId={leadId} leadWhatsapp={whatsapp} />
                  </Suspense>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Histórico ({history.length})
                </h3>

                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum registro de histórico
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[0.9rem] top-2 bottom-2 w-px bg-border/60" />
                    <div className="space-y-3">
                      {history.map((ev) => {
                        const colorClass = getActionColor(ev.action);
                        return (
                          <div key={ev.id} className="relative flex gap-3 pl-1">
                            <div className={`relative z-10 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                              {getActionIcon(ev.action)}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <p className="text-xs font-medium text-foreground leading-snug">
                                {ev.action}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {format(new Date(ev.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                {" · "}
                                {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Lead não encontrado</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
