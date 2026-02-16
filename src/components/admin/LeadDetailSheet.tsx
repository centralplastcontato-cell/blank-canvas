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
}: LeadDetailSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<LeadStatus>("novo");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<LeadHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { data: aiSummary, isLoading: isLoadingSummary, isFetchingSaved, error: summaryError, fetchSummary } = useLeadSummary(lead?.id || null);

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

      toast({
        title: "Lead atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onUpdate();
      fetchHistory(lead.id);
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
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

          {/* Lead Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{lead.unit || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>
                {lead.day_of_month || lead.day_preference || "-"}/{lead.month || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{lead.guests || "Não informado"} convidados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-primary/10 text-primary">
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
              variant="outline"
              className="w-full justify-start"
              onClick={canViewContact ? openWhatsAppChat : undefined}
              disabled={!canViewContact}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {canViewContact ? `Abrir Conversa (${lead.whatsapp})` : `Contato oculto (${maskPhone(lead.whatsapp)})`}
            </Button>
          </div>

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
  );
}
