import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLeadSummary } from "@/hooks/useLeadSummary";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { insertWithCompany } from "@/lib/supabase-helpers";
import {
  Lead,
  LeadHistory,
  LEAD_STATUS_LABELS,
  LeadStatus,
} from "@/types/crm";
import { UserWithRole } from "@/types/crm";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  User,
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  History,
  RotateCcw,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { maskPhone } from "@/lib/mask-utils";
import { LeadVisitHistory } from "./LeadVisitHistory";
import { LeadDuplicateHubBanner } from "./LeadDuplicateHubBanner";
import { EventFormDialog, EventFormData } from "@/components/agenda/EventFormDialog";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { PartyPopper } from "lucide-react";

interface LeadDetailSheetProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  responsaveis: UserWithRole[];
  currentUserId: string;
  currentUserName: string;
  canEdit: boolean;
  canDelete?: boolean;
  onDelete?: (leadId: string) => Promise<void>;
  canViewContact?: boolean;
  onLeadClosed?: (lead: Lead) => void;
}

export function LeadDetailSheet({
  lead,
  isOpen,
  onClose,
  onUpdate,
  responsaveis,
  currentUserId,
  currentUserName,
  canEdit,
  canDelete,
  onDelete,
  canViewContact = true,
  onLeadClosed,
}: LeadDetailSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<LeadStatus>("novo");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLinkedEvent, setHasLinkedEvent] = useState<boolean | null>(null);
  const [linkedEvents, setLinkedEvents] = useState<EventFormData[]>([]);
  const [linkedEventData, setLinkedEventData] = useState<EventFormData | null>(null);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const { data: aiSummary, isLoading: isLoadingSummary, isFetchingSaved, error: summaryError, fetchSummary } = useLeadSummary(lead?.id || null);
  const { currentCompany } = useCompany();
  const { units } = useCompanyUnits(currentCompany?.id);

  // Navigate to WhatsApp chat with this lead's phone
  const openWhatsAppChat = () => {
    const cleanPhone = lead?.whatsapp.replace(/\D/g, '') || '';
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // If we're already on the Central de Atendimento page, just use URL params
    if (location.pathname === '/atendimento') {
      // Close the sheet first and let the parent handle the navigation
      onClose();
      navigate(`/atendimento?phone=${phoneWithCountry}`, { replace: true });
    } else {
      // Navigate to Central de Atendimento with phone parameter
      navigate(`/atendimento?phone=${phoneWithCountry}`);
    }
  };

  useEffect(() => {
    if (lead) {
      setStatus(lead.status);
      setResponsavelId(lead.responsavel_id || "");
      setObservacoes(lead.observacoes || "");
      fetchHistory(lead.id);
      // Fetch all events linked to this lead (works for any status — handles recurring clients)
      supabase
        .from("company_events")
        .select("*")
        .eq("lead_id", lead.id)
        .order("event_date", { ascending: false })
        .then(({ data }) => {
          const events = (data || []).map((ev: any) => ({
            id: ev.id,
            title: ev.title,
            event_date: ev.event_date,
            start_time: ev.start_time || "",
            end_time: ev.end_time || "",
            event_type: ev.event_type || "aniversario",
            guest_count: ev.guest_count,
            unit: ev.unit || "",
            status: ev.status,
            package_name: ev.package_name || "",
            total_value: ev.total_value,
            notes: ev.notes || "",
            lead_id: ev.lead_id || null,
            data_fechamento_venda: ev.data_fechamento_venda || null,
            vendedor_responsavel_id: ev.vendedor_responsavel_id || null,
          }));
          setLinkedEvents(events);
          setHasLinkedEvent(events.length > 0);
          setLinkedEventData(events[0] || null);
        });
    }
  }, [lead]);

  const fetchHistory = async (leadId: string) => {
    setIsLoadingHistory(true);
    const { data, error } = await supabase
      .from("lead_history")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setHistory(data as LeadHistory[]);
    }
    setIsLoadingHistory(false);
  };

  const addHistoryEntry = async (
    leadId: string,
    action: string,
    oldValue: string | null,
    newValue: string | null
  ) => {
    await insertWithCompany("lead_history", {
      lead_id: leadId,
      user_id: currentUserId,
      user_name: currentUserName,
      action,
      old_value: oldValue,
      new_value: newValue,
    });
  };

  const handleSave = async () => {
    if (!lead || !canEdit) return;

    setIsSaving(true);

    try {
      // Track changes for history
      if (status !== lead.status) {
        await addHistoryEntry(
          lead.id,
          "Alteração de status",
          LEAD_STATUS_LABELS[lead.status],
          LEAD_STATUS_LABELS[status]
        );
      }

      if (responsavelId !== (lead.responsavel_id || "")) {
        const oldResponsavel = responsaveis.find(
          (r) => r.user_id === lead.responsavel_id
        );
        const newResponsavel = responsaveis.find(
          (r) => r.user_id === responsavelId
        );
        await addHistoryEntry(
          lead.id,
          "Alteração de responsável",
          oldResponsavel?.full_name || "Não atribuído",
          newResponsavel?.full_name || "Não atribuído"
        );
      }

      if (observacoes !== (lead.observacoes || "")) {
        await addHistoryEntry(lead.id, "Atualização de observações", null, null);
      }

      // Update lead
      const { error } = await supabase
        .from("campaign_leads")
        .update({
          status,
          responsavel_id: responsavelId || null,
          observacoes: observacoes || null,
        })
        .eq("id", lead.id);

      if (error) throw error;

      // Deactivate bot when lead is moved to perdido
      if (status === "perdido" && lead.status !== "perdido") {
        await supabase
          .from("wapi_conversations")
          .update({ bot_enabled: false, bot_step: 'human_takeover' })
          .eq("lead_id", lead.id);
      }

      toast({
        title: "Lead atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onUpdate();
      fetchHistory(lead.id);

      // Trigger festa modal if status changed to fechado
      if (status === "fechado" && lead.status !== "fechado" && onLeadClosed) {
        console.log('[Lead:Fechado->NovaFesta]', { leadId: lead.id, leadName: lead.name });
        onLeadClosed(lead);
      }
    } catch (error: any) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!lead) return null;

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-xl bg-primary/10"><User className="w-5 h-5 text-primary" /></div>
            {lead.name}
          </SheetTitle>
          <SheetDescription>
            Lead capturado em{" "}
            {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Duplicate-in-hub warning */}
          <LeadDuplicateHubBanner phone={lead.whatsapp} companyId={currentCompany?.id} />

          {/* Return Banner */}
          {lead.has_return && (
            <div className="relative bg-gradient-to-r from-violet-500/15 via-fuchsia-500/10 to-violet-500/15 border border-violet-400/30 rounded-xl p-4 shadow-sm overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 flex items-center justify-center border border-violet-400/30">
                  <RotateCcw className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-violet-700 dark:text-violet-400">🔄 Lead retornou pela Landing Page!</h4>
                  <p className="text-xs text-violet-600/80 dark:text-violet-400/70 mt-0.5 leading-relaxed">
                    Este lead já preencheu o formulário anteriormente e voltou com interesse renovado. Priorize o atendimento!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Linked events list (supports recurring clients with N parties) */}
          {(linkedEvents.length > 0 || lead.status === "fechado") && (
            <div className={`p-3 rounded-xl border ${
              linkedEvents.length === 0
                ? 'bg-amber-500/10 border-amber-300/30'
                : 'bg-emerald-500/10 border-emerald-300/30'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-sm">
                  {linkedEvents.length === 0 ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-amber-700 dark:text-amber-400 font-medium">⚠ Nenhuma festa vinculada</span>
                    </>
                  ) : (
                    <>
                      <PartyPopper className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        🎉 {linkedEvents.length === 1 ? '1 festa vinculada' : `${linkedEvents.length} festas vinculadas`}
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0 gap-1.5"
                  disabled={isLoadingEvent}
                  onClick={() => {
                    setLinkedEventData({
                      title: lead.name,
                      event_date: "",
                      start_time: "",
                      end_time: "",
                      event_type: "aniversario",
                      guest_count: lead.guests ? parseInt(lead.guests) || null : null,
                      unit: lead.unit || "",
                      status: "pendente",
                      package_name: "",
                      total_value: null,
                      notes: "",
                      lead_id: lead.id,
                      lead_name: lead.name,
                    } as EventFormData);
                    setEventFormOpen(true);
                  }}
                >
                  <PartyPopper className="w-3 h-3" />
                  {linkedEvents.length === 0 ? 'Criar Festa' : '+ Nova Festa'}
                </Button>
              </div>

              {linkedEvents.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {linkedEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        setLinkedEventData(ev);
                        setEventFormOpen(true);
                      }}
                      className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg bg-background/60 hover:bg-background border border-emerald-300/20 hover:border-emerald-400/40 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">
                            {ev.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {ev.event_date ? format(new Date(ev.event_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR }) : "Sem data"}
                            {ev.guest_count ? ` • ${ev.guest_count} conv.` : ""}
                            {ev.total_value ? ` • R$ ${Number(ev.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ""}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] h-5 shrink-0 ${
                          ev.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                          ev.status === 'pendente' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                          ev.status === 'realizado' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                          'bg-muted text-muted-foreground'
                        }`}
                      >
                        {ev.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* Lead Info */}
          <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-xl p-4">
            <div className="flex items-center gap-2.5 text-sm">
              <div className="p-1.5 rounded-lg bg-primary/10"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
              <span>{lead.unit || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <div className="p-1.5 rounded-lg bg-primary/10"><Calendar className="w-3.5 h-3.5 text-primary" /></div>
              <span>
                {lead.day_of_month || lead.day_preference || "-"}/{lead.month || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <div className="p-1.5 rounded-lg bg-accent/10"><Users className="w-3.5 h-3.5 text-accent" /></div>
              <span>{lead.guests || "Não informado"} convidados</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Badge className="bg-primary/10 text-primary border-0">
                {lead.campaign_id}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* AI Summary Card */}
          <div className="relative bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border border-primary/20 rounded-xl p-4 shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Resumo IA</h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchSummary}
                  disabled={isLoadingSummary}
                  className="h-7 px-2 text-xs"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingSummary ? 'animate-spin' : ''}`} />
                  {aiSummary ? 'Atualizar' : 'Gerar'}
                </Button>
              </div>

              {isLoadingSummary && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-3" />
                </div>
              )}

              {summaryError && !isLoadingSummary && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{summaryError}</span>
                </div>
              )}

              {aiSummary && !isLoadingSummary && !summaryError && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/80 leading-relaxed">{aiSummary.summary}</p>
                  <div className="bg-primary/10 rounded-lg p-2.5 border border-primary/15">
                    <p className="text-xs font-semibold text-primary mb-0.5">💡 Próxima ação sugerida:</p>
                    <p className="text-sm text-foreground/90">{aiSummary.nextAction}</p>
                  </div>
                  {aiSummary.generatedAt && (
                    <p className="text-[10px] text-muted-foreground text-right">
                      Gerado em {format(new Date(aiSummary.generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}

              {!aiSummary && !isLoadingSummary && !isFetchingSaved && !summaryError && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Clique em "Gerar" para criar um resumo com IA
                </p>
              )}

              {isFetchingSaved && !isLoadingSummary && (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* WhatsApp Actions */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Contato via WhatsApp
            </Label>
            <Button
              size="lg"
              className="w-full justify-center gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold shadow-md hover:shadow-lg transition-all rounded-xl h-12"
              onClick={canViewContact ? openWhatsAppChat : undefined}
              disabled={!canViewContact}
            >
              <MessageSquare className="w-5 h-5" />
              {canViewContact ? `Abrir Conversa (${lead.whatsapp})` : `Contato oculto (${maskPhone(lead.whatsapp)})`}
            </Button>
          </div>

          <Separator />

          {/* Visit History */}
          <LeadVisitHistory leadId={lead.id} currentUserId={currentUserId} />

          <Separator />

          {/* History */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </Label>

            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum histórico registrado.
              </p>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-3 pr-4">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="border-l-2 border-muted pl-3 py-1"
                    >
                      <p className="text-sm font-medium">{h.action}</p>
                      {h.old_value && h.new_value && (
                        <p className="text-xs text-muted-foreground">
                          {h.old_value} → {h.new_value}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(h.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                        {h.user_name && ` • ${h.user_name}`}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>

    {/* Event Form Dialog */}
    <EventFormDialog
      open={eventFormOpen}
      onOpenChange={setEventFormOpen}
      initialData={linkedEventData}
      units={units.filter(u => u.slug !== "trabalhe-conosco")}
      onSubmit={async (data) => {
        if (!currentCompany?.id) return;
        const payload: any = {
          company_id: currentCompany.id,
          title: data.title,
          event_date: data.event_date,
          start_time: data.start_time || null,
          end_time: data.end_time || null,
          event_type: data.event_type || null,
          guest_count: data.guest_count,
          unit: data.unit || null,
          status: data.status,
          package_name: data.package_name || null,
          total_value: data.total_value,
          notes: data.notes || null,
          created_by: currentUserId,
          lead_id: data.lead_id || lead?.id || null,
          data_fechamento_venda: data.data_fechamento_venda || null,
          vendedor_responsavel_id: data.vendedor_responsavel_id || null,
          payment_method: data.payment_method || null,
        };

        if (data.id) {
          const { error } = await supabase.from("company_events").update(payload).eq("id", data.id);
          if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
          toast({ title: "Festa atualizada!" });
        } else {
          const { error } = await supabase.from("company_events").insert(payload);
          if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }
          toast({ title: "Festa criada!" });
          setHasLinkedEvent(true);
        }
        setEventFormOpen(false);
        // Refresh linked events list
        if (lead) {
          const { data: refreshed } = await supabase
            .from("company_events")
            .select("*")
            .eq("lead_id", lead.id)
            .order("event_date", { ascending: false });
          const events = (refreshed || []).map((ev: any) => ({
            id: ev.id, title: ev.title, event_date: ev.event_date,
            start_time: ev.start_time || "", end_time: ev.end_time || "",
            event_type: ev.event_type || "aniversario", guest_count: ev.guest_count,
            unit: ev.unit || "", status: ev.status, package_name: ev.package_name || "",
            total_value: ev.total_value, notes: ev.notes || "", lead_id: ev.lead_id || null,
            data_fechamento_venda: ev.data_fechamento_venda || null,
            vendedor_responsavel_id: ev.vendedor_responsavel_id || null,
          })) as EventFormData[];
          setLinkedEvents(events);
          setHasLinkedEvent(events.length > 0);
        }
        onUpdate();
      }}
    />
    </>
  );
}
