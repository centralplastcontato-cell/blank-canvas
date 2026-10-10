import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { 
  Info, MessageSquare, Clock, MapPin, Calendar, Users, 
  ArrowRightLeft, Bot, Loader2, Pencil, Check, X, Trash2, UsersRound, Star, RotateCcw, PartyPopper, Package, AlertTriangle,
  Sparkles, UserCheck,
} from "lucide-react";
import { eventRowToFormData, saveEvent } from "@/lib/eventSave";
import { formatPhoneBR, maskPhone, pickPersonName } from "@/lib/mask-utils";
import { EventFormDialog, EventFormData } from "@/components/agenda/EventFormDialog";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { LeadOriginBadge } from "@/components/admin/LeadOriginBadge";
import { LeadReturnBadge } from "@/components/admin/LeadReturnBadge";

interface Lead {
  id: string;
  name: string;
  whatsapp: string;
  unit: string | null;
  status: string;
  month: string | null;
  day_of_month: number | null;
  day_preference: string | null;
  guests: string | null;
  observacoes: string | null;
  created_at: string;
  responsavel_id: string | null;
  origem?: string | null;
  return_count?: number | null;
  last_return_at?: string | null;
}

interface Conversation {
  id: string;
  contact_name: string | null;
  contact_phone: string;
  remote_jid: string;
  bot_enabled: boolean | null;
  bot_step?: string | null;
  bot_data?: Record<string, unknown> | null;
  is_favorite: boolean | null;
}

interface WapiInstance {
  unit: string | null;
}

interface LeadInfoPopoverProps {
  linkedLead: Lead | null;
  selectedConversation: Conversation;
  selectedInstance: WapiInstance | null;
  canTransferLeads: boolean;
  canDeleteFromChat: boolean;
  /** pode editar nome, telefone e observações (permissão de editar lead) */
  canEditLead?: boolean;
  /** pode ver o telefone inteiro */
  canViewContact?: boolean;
  isCreatingLead: boolean;
  userId: string;
  currentUserName: string;
  onShowTransferDialog: () => void;
  onShowDeleteDialog: () => void;
  onShowShareToGroupDialog: () => void;
  onCreateAndClassifyLead: (status: string) => void;
  onToggleConversationBot: (conv: Conversation) => void;
  onReactivateBot: (conv: Conversation) => void;
  onTakeOverFromBia?: (conv: Conversation) => void;
  onReturnToBia?: (conv: Conversation) => void;
  onToggleFavorite: (conv: Conversation) => void;
  onLeadNameChange: (newName: string) => void;
  onLeadObsChange?: (newObs: string) => void;
  onShowVisitDialog?: (type?: "visita" | "atendimento") => void;
  mobile?: boolean;
  visitRefreshKey?: number;
}

const statusOptions = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-500' },
  { value: 'trabalhe_conosco', label: 'Trabalhe Conosco', color: 'bg-teal-500' },
  { value: 'em_contato', label: 'Visita', color: 'bg-yellow-500' },
  { value: 'orcamento_enviado', label: 'Orçamento', color: 'bg-purple-500' },
  { value: 'aguardando_resposta', label: 'Negociando', color: 'bg-orange-500' },
  { value: 'fechado', label: 'Fechado', color: 'bg-green-500' },
  { value: 'perdido', label: 'Perdido', color: 'bg-red-500' },
  { value: 'transferido', label: 'Transferência', color: 'bg-cyan-500' },
  { value: 'fornecedor', label: 'Fornecedor', color: 'bg-indigo-500' },
  { value: 'cliente_retorno', label: 'Cliente Retorno', color: 'bg-pink-500' },
  { value: 'outros', label: 'Outros', color: 'bg-gray-500' },
];

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'novo': return 'bg-blue-500';
    case 'trabalhe_conosco': return 'bg-teal-500';
    case 'em_contato': return 'bg-yellow-500 text-yellow-950';
    case 'orcamento_enviado': return 'bg-purple-500';
    case 'aguardando_resposta': return 'bg-orange-500';
    case 'fechado': return 'bg-green-500';
    case 'perdido': return 'bg-red-500';
    case 'transferido': return 'bg-cyan-500';
    case 'fornecedor': return 'bg-indigo-500';
    case 'cliente_retorno': return 'bg-pink-500';
    default: return '';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'novo': return 'Novo';
    case 'trabalhe_conosco': return 'Trabalhe Conosco';
    case 'em_contato': return 'Visita';
    case 'orcamento_enviado': return 'Orçamento Enviado';
    case 'aguardando_resposta': return 'Negociando';
    case 'fechado': return 'Fechado';
    case 'perdido': return 'Perdido';
    case 'transferido': return 'Transferência';
    case 'fornecedor': return 'Fornecedor';
    case 'cliente_retorno': return 'Cliente Retorno';
    default: return status;
  }
};

/* ── Section wrapper for visual grouping ── */
function PopoverSection({ title, children, className, icon: Icon }: { title?: string; children: React.ReactNode; className?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {title && (
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1 rounded-md bg-primary/8">
              <Icon className="w-3 h-3 text-primary/70" />
            </div>
          )}
          <h5 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">{title}</h5>
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Info row helper ── */
// Conversa atendida pela Bia (IA)
const isBiaConversation = (conv: Conversation) => (conv.bot_data as Record<string, unknown> | null | undefined)?.ai_agent === "on";

// Quem está atendendo esta conversa da Bia, com assumir / devolver para a Bia
function BiaControl({ conversation, onTakeOver, onReturn }: {
  conversation: Conversation;
  onTakeOver: (conv: Conversation) => void;
  onReturn: (conv: Conversation) => void;
}) {
  const biaActive = conversation.bot_step === "ai_agent" && conversation.bot_enabled !== false;
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded-md bg-violet-500/10">
          <Sparkles className="w-3 h-3 text-violet-600" />
        </div>
        <span className={cn(
          "text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap",
          biaActive ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : "bg-muted text-muted-foreground",
        )}>
          {biaActive ? "🤖 IA atendendo" : "👤 Equipe atendendo"}
        </span>
      </div>
      {biaActive ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] gap-1 rounded-lg font-medium"
          onClick={() => onTakeOver(conversation)}
          title="A IA para de responder e de mandar follow-ups; a conversa fica com você"
        >
          <UserCheck className="w-3 h-3" />
          Assumir
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-7 text-[11px] gap-1 rounded-lg font-medium bg-violet-600 hover:bg-violet-700 text-white"
          onClick={() => onReturn(conversation)}
          title="A IA responde a próxima mensagem do cliente, já sabendo o que a equipe conversou (não manda nada sozinha)"
        >
          <Sparkles className="w-3 h-3" />
          Devolver para a IA
        </Button>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, children, accent }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-muted-foreground group/row">
      <div className={cn(
        "flex items-center justify-center w-6 h-6 rounded-lg shrink-0 transition-colors",
        accent ? "bg-primary/10" : "bg-muted/40 group-hover/row:bg-muted/70"
      )}>
        <Icon className={cn("w-3.5 h-3.5", accent && "text-primary")} />
      </div>
      <span className="truncate">{children}</span>
    </div>
  );
}

export function LeadInfoPopover({
  linkedLead,
  selectedConversation,
  selectedInstance,
  canTransferLeads,
  canDeleteFromChat,
  canEditLead = true,
  canViewContact = true,
  isCreatingLead,
  userId,
  currentUserName,
  onShowTransferDialog: onShowTransferDialogProp,
  onShowDeleteDialog: onShowDeleteDialogProp,
  onShowShareToGroupDialog: onShowShareToGroupDialogProp,
  onCreateAndClassifyLead,
  onToggleConversationBot,
  onReactivateBot,
  onTakeOverFromBia,
  onReturnToBia,
  onToggleFavorite,
  onLeadNameChange,
  onLeadObsChange,
  onShowVisitDialog: onShowVisitDialogProp,
  mobile = false,
  visitRefreshKey = 0,
}: LeadInfoPopoverProps) {
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  // Celular: ao abrir outra janela (visita, transferir, excluir, grupo, festa) a ficha fecha,
  // como a caixinha do computador
  const onShowTransferDialog = () => { setMobileSheetOpen(false); onShowTransferDialogProp(); };
  const onShowDeleteDialog = () => { setMobileSheetOpen(false); onShowDeleteDialogProp(); };
  const onShowShareToGroupDialog = () => { setMobileSheetOpen(false); onShowShareToGroupDialogProp(); };
  const onShowVisitDialog = onShowVisitDialogProp
    ? (type?: "visita" | "atendimento") => { setMobileSheetOpen(false); onShowVisitDialogProp(type); }
    : undefined;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [editedObs, setEditedObs] = useState("");
  const [isSavingObs, setIsSavingObs] = useState(false);
  const [editPhoneOpen, setEditPhoneOpen] = useState(false);
  const [editedPhone, setEditedPhone] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [hasLinkedEvent, setHasLinkedEvent] = useState<boolean | null>(null);
  const [linkedEventData, setLinkedEventData] = useState<EventFormData | null>(null);
  // Todas as festas vinculadas ao lead (cliente recorrente pode ter N festas)
  const [linkedEvents, setLinkedEvents] = useState<EventFormData[]>([]);
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [latestVisit, setLatestVisit] = useState<{ data_visita: string; horario_visita: string | null; status_visita: string } | null>(null);
  // Evita mostrar o alerta de "visita sem data" antes da busca terminar
  const [visitLoaded, setVisitLoaded] = useState(false);
  const { currentCompany } = useCompany();
  const { units } = useCompanyUnits(currentCompany?.id);
  // Inclui a festa na chave do rascunho: sem isso, o rascunho de uma festa
  // sobrescrevia os dados da outra em clientes com varias festas vinculadas.
  const eventDraftStorageKey = linkedLead && currentCompany?.id
    ? `whatsapp-event-form-draft:${currentCompany.id}:${linkedLead.id}:${linkedEventData?.id || "new"}`
    : null;
  const eventOpenStorageKey = linkedLead && currentCompany?.id ? `whatsapp-event-form-open:${currentCompany.id}:${linkedLead.id}` : null;

  const handleEventFormOpenChange = (nextOpen: boolean) => {
    setEventFormOpen(nextOpen);
    if (nextOpen) setMobileSheetOpen(false);
    if (!eventOpenStorageKey) return;

    try {
      if (nextOpen) {
        sessionStorage.setItem(eventOpenStorageKey, "1");
      } else {
        sessionStorage.removeItem(eventOpenStorageKey);
      }
    } catch {
      // Ignore storage failures.
    }
  };

  // Check if closed lead has linked event(s) — busca TODAS as festas do lead
  // (cliente recorrente pode ter mais de uma; antes o .limit(1) escondia as demais)
  useEffect(() => {
    if (linkedLead && linkedLead.status === "fechado") {
      supabase
        .from("company_events")
        .select("*")
        .eq("lead_id", linkedLead.id)
        .order("event_date", { ascending: false })
        .then(({ data }) => {
          // Todos os dados da festa (pagamento, criança, opcionais) e o valor do pacote
          // como a Agenda calcula: editar daqui não apaga nem soma opcionais em dobro
          const mapped: EventFormData[] = (data || []).map((ev) => eventRowToFormData(ev));
          setLinkedEvents(mapped);
          setHasLinkedEvent(mapped.length > 0);
          setLinkedEventData(mapped[0] || null);
        });
    } else {
      setHasLinkedEvent(null);
      setLinkedEventData(null);
      setLinkedEvents([]);
    }
  }, [linkedLead?.id, linkedLead?.status]);

  useEffect(() => {
    if (!eventOpenStorageKey || linkedLead?.status !== "fechado") {
      setEventFormOpen(false);
      return;
    }

    try {
      setEventFormOpen(sessionStorage.getItem(eventOpenStorageKey) === "1");
    } catch {
      setEventFormOpen(false);
    }
  }, [eventOpenStorageKey, linkedLead?.status]);

  // Fetch latest visit for this lead
  useEffect(() => {
    if (!linkedLead) {
      setLatestVisit(null);
      setVisitLoaded(false);
      return;
    }
    setVisitLoaded(false);
    (supabase as any)
      .from("lead_visits")
      .select("data_visita, horario_visita, status_visita")
      .eq("lead_id", linkedLead.id)
      .order("data_visita", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        setLatestVisit(data || null);
        setVisitLoaded(true);
      });
  }, [linkedLead?.id, visitRefreshKey]);

  const isGroup = selectedConversation.remote_jid.includes('@g.us');

  const startEditingName = () => {
    if (isGroup) {
      setEditedName(selectedConversation.contact_name || "");
    } else if (linkedLead) {
      setEditedName(linkedLead.name);
    } else {
      setEditedName(selectedConversation.contact_name || "");
    }
    if (!canEditLead) return;
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const saveLeadName = async () => {
    if (!editedName.trim()) return;
    
    const trimmedName = editedName.trim();
    
    if (linkedLead) {
      // Qualified lead: update campaign_leads + wapi_conversations
      if (trimmedName === linkedLead.name) {
        cancelEditingName();
        return;
      }

      setIsSavingName(true);

      try {
        const { error: leadError } = await supabase
          .from("campaign_leads")
          .update({ name: trimmedName })
          .eq("id", linkedLead.id);

        if (leadError) throw leadError;

        const { error: convError } = await supabase
          .from("wapi_conversations")
          .update({ contact_name: trimmedName })
          .eq("id", selectedConversation.id);

        if (convError) throw convError;

        await supabase.from("lead_history").insert({
          lead_id: linkedLead.id,
          user_id: userId,
          user_name: currentUserName,
          action: "Alteração de nome",
          old_value: linkedLead.name,
          new_value: trimmedName,
        });

        onLeadNameChange(trimmedName);
        setIsEditingName(false);
        setEditedName("");

        toast({
          title: "Nome atualizado",
          description: "O nome do lead foi alterado com sucesso.",
        });
      } catch (error: unknown) {
        console.error("Error updating lead name:", error);
        toast({
          title: "Erro ao atualizar nome",
          description: error instanceof Error ? error.message : "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsSavingName(false);
      }
    } else {
      // Unqualified contact: update only wapi_conversations.contact_name
      if (trimmedName === (selectedConversation.contact_name || "")) {
        cancelEditingName();
        return;
      }

      setIsSavingName(true);

      try {
        const { error } = await supabase
          .from("wapi_conversations")
          .update({ contact_name: trimmedName })
          .eq("id", selectedConversation.id);

        if (error) throw error;

        // Fallback: if linkedLead hasn't loaded yet but the conversation
        // is actually linked to a lead, sync the name to campaign_leads too.
        const { data: convRow } = await supabase
          .from("wapi_conversations")
          .select("lead_id")
          .eq("id", selectedConversation.id)
          .maybeSingle();

        if (convRow?.lead_id) {
          const { data: leadRow } = await supabase
            .from("campaign_leads")
            .select("id, name")
            .eq("id", convRow.lead_id)
            .maybeSingle();

          if (leadRow && leadRow.name !== trimmedName) {
            await supabase
              .from("campaign_leads")
              .update({ name: trimmedName })
              .eq("id", leadRow.id);

            await supabase.from("lead_history").insert({
              lead_id: leadRow.id,
              user_id: userId,
              user_name: currentUserName,
              action: "Alteração de nome",
              old_value: leadRow.name,
              new_value: trimmedName,
            });
          }
        }

        onLeadNameChange(trimmedName);
        setIsEditingName(false);
        setEditedName("");

        toast({
          title: "Nome atualizado",
          description: "O nome do contato foi alterado com sucesso.",
        });
      } catch (error: unknown) {
        console.error("Error updating contact name:", error);
        toast({
          title: "Erro ao atualizar nome",
          description: error instanceof Error ? error.message : "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsSavingName(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveLeadName();
    } else if (e.key === "Escape") {
      cancelEditingName();
    }
  };

  const openEditPhone = () => {
    if (!canEditLead) return;
    const current = linkedLead?.whatsapp || selectedConversation.contact_phone || "";
    setEditedPhone(current);
    setEditPhoneOpen(true);
  };

  const saveLeadPhone = async () => {
    const newDigits = editedPhone.replace(/\D/g, "");
    if (newDigits.length < 10) {
      toast({ title: "Telefone inválido", description: "Informe um número válido com DDD.", variant: "destructive" });
      return;
    }
    const oldPhone = (linkedLead?.whatsapp || selectedConversation.contact_phone || "").replace(/\D/g, "");
    if (newDigits === oldPhone) {
      setEditPhoneOpen(false);
      return;
    }

    setIsSavingPhone(true);
    try {
      const { data, error } = await (supabase as any).rpc("update_lead_contact_phone", {
        _conversation_id: selectedConversation.id,
        _new_phone: newDigits,
        _lead_id: linkedLead?.id ?? null,
        _user_name: currentUserName || null,
      });

      if (error) throw error;

      const result = data as {
        ok?: boolean;
        error?: string;
        merged?: boolean;
        lead_name?: string;
      } | null;

      if (!result?.ok) {
        const code = result?.error;
        const friendly =
          code === "lead_phone_exists"
            ? `Já existe um lead (${result?.lead_name || "sem nome"}) com esse número nessa empresa.`
            : code === "conversation_has_other_lead"
            ? "Já existe uma conversa com esse número vinculada a outro lead. Edite/exclua a outra antes."
            : code === "invalid_phone"
            ? "Informe um número válido com DDI e DDD."
            : code === "forbidden"
            ? "Você não tem permissão para alterar essa conversa."
            : code === "conversation_not_found"
            ? "Conversa não encontrada."
            : "Não foi possível atualizar o telefone.";
        toast({ title: "Erro ao atualizar telefone", description: friendly, variant: "destructive" });
        return;
      }

      toast({
        title: "Telefone atualizado",
        description: result?.merged
          ? "O número foi alterado e a conversa existente foi unificada."
          : "O número foi alterado com sucesso.",
      });
      setEditPhoneOpen(false);
    } catch (error: unknown) {
      console.error("Error updating phone:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast({
        title: "Erro ao atualizar telefone",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSavingPhone(false);
    }
  };



  // Conteúdo da ficha: no celular abre de baixo para cima, ocupando a tela
  // (antes era uma caixa estreita por cima do chat, cortada embaixo)
  const triggerButton = (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={isGroup ? "Opções do grupo" : (linkedLead ? "Ver informações do lead" : "Contato não qualificado")}
        >
          <Info className={cn(
            "w-4 h-4",
            isGroup ? "text-muted-foreground" : (linkedLead ? "text-primary" : "text-destructive")
          )} />
        </Button>
  );
  const panel = (
    <>
        {isGroup ? (
          /* ── GROUP VIEW ── */
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted/60 shrink-0">
                  <UsersRound className="w-4 h-4 text-muted-foreground" />
                </div>
                {isEditingName ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-8 text-sm rounded-lg"
                      autoFocus
                      disabled={isSavingName}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={saveLeadName} disabled={isSavingName}>
                      {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={cancelEditingName} disabled={isSavingName}>
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm truncate">
                        {selectedConversation.contact_name || "Grupo"}
                      </h4>
                      {canEditLead && (<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md" onClick={startEditingName} title="Renomear grupo">
                        <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </Button>)}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate block">
                      {selectedConversation.contact_phone}
                    </span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl shrink-0"
                onClick={() => onToggleFavorite(selectedConversation)}
                title={selectedConversation.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Star className={cn(
                  "w-4 h-4",
                  selectedConversation.is_favorite 
                    ? "fill-yellow-400 text-yellow-400" 
                    : "text-muted-foreground"
                )} />
              </Button>
            </div>
            
            {canDeleteFromChat && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-8 gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={onShowDeleteDialog}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Grupo
              </Button>
            )}
          </div>
        ) : linkedLead ? (
          /* ── QUALIFIED LEAD VIEW — PREMIUM ── */
          <div className="flex flex-col">
            {/* Premium gradient header */}
            <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.06),transparent_70%)]" />
              <div className="relative flex items-center justify-between gap-3">
                {isEditingName ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="h-8 text-sm rounded-lg"
                      autoFocus
                      disabled={isSavingName}
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={saveLeadName} disabled={isSavingName}>
                      {isSavingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 rounded-lg" onClick={cancelEditingName} disabled={isSavingName}>
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-primary/10 ring-1 ring-primary/15 shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {/* Lead salvo com o telefone no nome: mostra o nome do WhatsApp */}
                        <h4 className="font-bold text-[15px] truncate tracking-tight">
                          {pickPersonName(linkedLead.name, selectedConversation.contact_name)
                            || (canViewContact ? formatPhoneBR(linkedLead.name) : maskPhone(linkedLead.name))}
                        </h4>
                        {canEditLead && (<Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md opacity-60 hover:opacity-100" onClick={startEditingName} title="Editar nome">
                          <Pencil className="w-3 h-3" />
                        </Button>)}
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] text-muted-foreground/70 font-medium">{canViewContact ? formatPhoneBR(linkedLead.whatsapp) : maskPhone(linkedLead.whatsapp)}</p>
                        {canEditLead && (<Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-md opacity-60 hover:opacity-100" onClick={openEditPhone} title="Editar telefone">
                          <Pencil className="w-2.5 h-2.5" />
                        </Button>)}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 empty:hidden mt-1">
                        <LeadOriginBadge origem={linkedLead.origem} />
                        <LeadReturnBadge
                          returnCount={linkedLead.return_count}
                          lastReturnAt={linkedLead.last_return_at}
                          createdAt={linkedLead.created_at}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-xl"
                    onClick={() => onToggleFavorite(selectedConversation)}
                    title={selectedConversation.is_favorite ? "Remover dos favoritos" : "Favoritar"}
                  >
                    <Star className={cn(
                      "w-4 h-4 transition-all",
                      selectedConversation.is_favorite 
                        ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" 
                        : "text-muted-foreground/50"
                    )} />
                  </Button>
                  <Badge className={cn(
                    "text-[10px] h-5.5 px-2.5 shrink-0 rounded-full font-bold shadow-sm ring-1 ring-white/20",
                    getStatusBadgeClass(linkedLead.status)
                  )}>
                    {getStatusLabel(linkedLead.status)}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Content sections */}
            <div className="px-5 py-3.5 space-y-0.5">
              {/* Client data */}
              <div className="rounded-xl bg-muted/20 border border-border/30 p-3.5 space-y-2">
                <PopoverSection title="Dados do Cliente" icon={MessageSquare}>
                  <div className="space-y-1.5 pl-0.5">
                    {linkedLead.created_at && !isNaN(new Date(linkedLead.created_at).getTime()) && (
                      <InfoRow icon={Clock}>
                        Chegou em {format(new Date(linkedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </InfoRow>
                    )}
                    {linkedLead.unit && (
                      <InfoRow icon={MapPin} accent>{linkedLead.unit}</InfoRow>
                    )}
                  </div>
                </PopoverSection>
              </div>
            </div>

            {/* Party data */}
            {(linkedLead.month || linkedLead.day_preference || linkedLead.guests) && (
              <div className="px-5 pb-3.5 -mt-1">
                <div className="rounded-xl bg-muted/20 border border-border/30 p-3.5">
                  <PopoverSection title="Dados da Festa" icon={Calendar}>
                    <div className="space-y-1.5 pl-0.5">
                      {(linkedLead.month || linkedLead.day_preference) && (
                        <InfoRow icon={Calendar}>
                          {[
                            linkedLead.month,
                            linkedLead.day_of_month && `dia ${linkedLead.day_of_month}`,
                            linkedLead.day_preference
                          ].filter(Boolean).join(' · ')}
                        </InfoRow>
                      )}
                      {linkedLead.guests && (
                        <InfoRow icon={Users}>{linkedLead.guests} convidados</InfoRow>
                      )}
                    </div>
                  </PopoverSection>
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="px-5 pb-3.5 -mt-1">
              <div className="rounded-xl bg-muted/20 border border-border/30 p-3.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-primary/8">
                        <Pencil className="w-3 h-3 text-primary/70" />
                      </div>
                      <h5 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">Observações</h5>
                    </div>
                    {!isEditingObs && canEditLead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md opacity-50 hover:opacity-100"
                        onClick={() => {
                          setEditedObs(linkedLead.observacoes || "");
                          setIsEditingObs(true);
                        }}
                        title="Editar observações"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingObs ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedObs}
                        onChange={(e) => setEditedObs(e.target.value)}
                        placeholder="Adicione observações sobre este lead..."
                        className="min-h-[80px] text-xs rounded-lg resize-none bg-background/60"
                        autoFocus
                        disabled={isSavingObs}
                      />
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setIsEditingObs(false)} disabled={isSavingObs}>
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          disabled={isSavingObs}
                          onClick={async () => {
                            const trimmed = editedObs.trim();
                            if (trimmed === (linkedLead.observacoes || "")) { setIsEditingObs(false); return; }
                            setIsSavingObs(true);
                            try {
                              const { error } = await supabase.from("campaign_leads").update({ observacoes: trimmed || null }).eq("id", linkedLead.id);
                              if (error) throw error;
                              await supabase.from("lead_history").insert({ lead_id: linkedLead.id, user_id: userId, user_name: currentUserName, action: "Alteração de observações", old_value: linkedLead.observacoes || null, new_value: trimmed || null });
                              onLeadObsChange?.(trimmed);
                              setIsEditingObs(false);
                              toast({ title: "Observações salvas" });
                            } catch (err: unknown) {
                              toast({ title: "Erro ao salvar", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
                            } finally { setIsSavingObs(false); }
                          }}
                        >
                          {isSavingObs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={cn(
                        "text-xs leading-relaxed line-clamp-3 cursor-pointer rounded-lg px-2.5 py-2 hover:bg-background/60 transition-colors",
                        linkedLead.observacoes ? "text-muted-foreground" : "text-muted-foreground/40 italic"
                      )}
                      onClick={() => { if (!canEditLead) return; setEditedObs(linkedLead.observacoes || ""); setIsEditingObs(true); }}
                    >
                      {linkedLead.observacoes || "Adicione observações sobre este lead..."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Latest Visit */}
            {latestVisit && (
              <div className="px-5 pb-3.5 -mt-1">
                <div className="rounded-xl bg-muted/20 border border-border/30 p-3.5">
                  <PopoverSection title="Última Visita" icon={MapPin}>
                    <div className="space-y-1.5 pl-0.5">
                      <InfoRow icon={Calendar} accent>
                        {latestVisit.data_visita.split("-").reverse().join("/")}
                        {latestVisit.horario_visita && ` às ${latestVisit.horario_visita}`}
                      </InfoRow>
                      <InfoRow icon={MapPin}>
                        {latestVisit.status_visita === "agendada" ? "Agendada" :
                         latestVisit.status_visita === "confirmada" ? "Confirmada" :
                         latestVisit.status_visita === "realizada" ? "Realizada" :
                         latestVisit.status_visita === "nao_compareceu" ? "Não compareceu" :
                         latestVisit.status_visita === "remarcada" ? "Remarcada" :
                         latestVisit.status_visita === "cancelada" ? "Cancelada" :
                         latestVisit.status_visita}
                      </InfoRow>
                    </div>
                  </PopoverSection>
                </div>
              </div>
            )}

            {/* Lead marcado como "Visita" mas sem nenhuma visita registrada */}
            {!latestVisit && visitLoaded && linkedLead.status === "em_contato" && (
              <div className="px-5 pb-3.5 -mt-1">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <p className="font-semibold text-amber-700 dark:text-amber-400">Visita sem data registrada</p>
                      <p className="text-amber-700/80 dark:text-amber-400/80">
                        Este lead está como "Visita", mas nenhuma data foi registrada.
                      </p>
                    </div>
                  </div>
                  {onShowVisitDialog && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5 rounded-lg border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                      onClick={() => onShowVisitDialog("visita")}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Registrar data da visita
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Bot + Actions */}
            <div className="px-5 pb-4 space-y-2.5">
              {/* Bot Toggle (conversa da IA: quem está atendendo + assumir/devolver) */}
              {isBiaConversation(selectedConversation) && onTakeOverFromBia && onReturnToBia ? (
                <BiaControl conversation={selectedConversation} onTakeOver={onTakeOverFromBia} onReturn={onReturnToBia} />
              ) : (
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-primary/8">
                      <Bot className="w-3 h-3 text-primary/70" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">Bot</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] gap-1 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-200/60 font-medium"
                      onClick={() => onReactivateBot(selectedConversation)}
                      title="Reativar bot"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reativar
                    </Button>
                    <Button
                      variant={selectedConversation.bot_enabled !== false ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-[11px] gap-1 rounded-lg font-medium"
                      onClick={() => onToggleConversationBot(selectedConversation)}
                    >
                      <Bot className="w-3 h-3" />
                      {selectedConversation.bot_enabled !== false ? "Ativo" : "Inativo"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-1.5">
                {onShowVisitDialog && (
                  <div className="flex gap-1.5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-9 gap-1.5 rounded-xl font-medium border-border/40 hover:bg-primary/5 hover:border-primary/30 transition-all"
                      onClick={() => onShowVisitDialog("visita")}
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary/70" />
                      {latestVisit ? "Nova Visita" : "Visita"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-9 gap-1.5 rounded-xl font-medium border-violet-200/60 text-violet-600 hover:bg-violet-50 hover:border-violet-300 transition-all"
                      onClick={() => onShowVisitDialog("atendimento")}
                    >
                      <Package className="w-3.5 h-3.5" />
                      Atendimento
                    </Button>
                  </div>
                )}

                {linkedLead.status === "fechado" && hasLinkedEvent !== null && linkedEvents.length > 1 && (
                  <div className="space-y-1.5">
                    {linkedEvents.map((ev) => (
                      <Button
                        key={ev.id}
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-9 gap-2 rounded-xl font-medium transition-all text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200/60 justify-start"
                        onClick={() => {
                          setLinkedEventData(ev);
                          handleEventFormOpenChange(true);
                        }}
                      >
                        <PartyPopper className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate flex-1 text-left">{ev.title}</span>
                        {ev.event_date && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {ev.event_date.split("-").reverse().join("/")}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}

                {linkedLead.status === "fechado" && hasLinkedEvent !== null && linkedEvents.length <= 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full text-xs h-9 gap-2 rounded-xl font-medium transition-all",
                      hasLinkedEvent
                        ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200/60"
                        : "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200/60"
                    )}
                    onClick={() => {
                      if (hasLinkedEvent && linkedEventData) {
                        handleEventFormOpenChange(true);
                      } else {
                        setLinkedEventData({
                          title: linkedLead.name,
                          event_date: "",
                          start_time: "",
                          end_time: "",
                          event_type: "aniversario",
                          guest_count: linkedLead.guests ? parseInt(linkedLead.guests) || null : null,
                          unit: linkedLead.unit || "",
                          status: "pendente",
                          package_name: "",
                          total_value: null,
                          notes: "",
                          lead_id: linkedLead.id,
                          lead_name: linkedLead.name,
                        });
                        handleEventFormOpenChange(true);
                      }
                    }}
                  >
                    <PartyPopper className="w-3.5 h-3.5" />
                    {hasLinkedEvent ? 'Ver Festa' : 'Criar Festa'}
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-9 gap-2 rounded-xl font-medium border-border/40 hover:bg-muted/50 transition-all"
                  onClick={onShowShareToGroupDialog}
                >
                  <UsersRound className="w-3.5 h-3.5 text-muted-foreground" />
                  Compartilhar em Grupo
                </Button>

                {canTransferLeads && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs h-9 gap-2 rounded-xl font-medium border-border/40 hover:bg-muted/50 transition-all"
                    onClick={onShowTransferDialog}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    Transferir Lead
                  </Button>
                )}
              
                {canDeleteFromChat && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs h-9 gap-2 rounded-xl font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/8 transition-all"
                    onClick={onShowDeleteDialog}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Lead
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── UNQUALIFIED CONTACT VIEW ── */
          <div className="divide-y divide-border/50">
            {/* Header */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2.5 text-destructive">
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-destructive/10 shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Contato não qualificado</h4>
                  <p className="text-[11px] text-muted-foreground font-normal">
                    Clique em um status para classificar
                  </p>
                </div>
              </div>
            </div>

            {/* Dados do Contato */}
            <div className="p-4 py-3">
              <PopoverSection title="Dados do Contato">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <InfoRow icon={MessageSquare}>{canViewContact ? selectedConversation.contact_phone : maskPhone(selectedConversation.contact_phone)}</InfoRow>
                    </div>
                    {canEditLead && (<Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-md" onClick={openEditPhone} title="Editar telefone">
                      <Pencil className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                    </Button>)}
                  </div>
                  {selectedConversation.contact_name && (
                    <div className="flex items-center gap-1">
                      {isEditingName ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="h-7 text-xs rounded-lg"
                            autoFocus
                            disabled={isSavingName}
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md" onClick={saveLeadName} disabled={isSavingName}>
                            {isSavingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md" onClick={cancelEditingName} disabled={isSavingName}>
                            <X className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-muted/50 shrink-0">
                              <Users className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate">{selectedConversation.contact_name}</span>
                          </div>
                          {canEditLead && (<Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-md" onClick={startEditingName} title="Editar nome">
                            <Pencil className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                          </Button>)}
                        </div>
                      )}
                    </div>
                  )}
                  {selectedInstance?.unit && (
                    <InfoRow icon={MapPin}>{selectedInstance.unit}</InfoRow>
                  )}
                </div>
              </PopoverSection>
            </div>
            
            {/* Qualificação */}
            <div className="p-4 py-3">
              <PopoverSection title="Qualificar como">
                <div className="flex flex-wrap gap-1.5">
                  {statusOptions.map((statusOption) => (
                    <Button
                      key={statusOption.value}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] gap-1 px-2 rounded-lg"
                      disabled={isCreatingLead}
                      onClick={() => onCreateAndClassifyLead(statusOption.value)}
                    >
                      {isCreatingLead ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <div className={cn("w-2 h-2 rounded-full", statusOption.color)} />
                      )}
                      {statusOption.label}
                    </Button>
                  ))}
                </div>
              </PopoverSection>
            </div>

            {/* Ações */}
            <div className="p-4 pt-3 space-y-2">
              {isBiaConversation(selectedConversation) && onTakeOverFromBia && onReturnToBia ? (
                <BiaControl conversation={selectedConversation} onTakeOver={onTakeOverFromBia} onReturn={onReturnToBia} />
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Bot</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                      onClick={() => onReactivateBot(selectedConversation)}
                      title="Reativar bot e enviar mensagem de retomada"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reativar
                    </Button>
                    <Button
                      variant={selectedConversation.bot_enabled !== false ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs gap-1 rounded-lg"
                      onClick={() => onToggleConversationBot(selectedConversation)}
                    >
                      <Bot className="w-3 h-3" />
                      {selectedConversation.bot_enabled !== false ? "Ativo" : "Inativo"}
                    </Button>
                  </div>
                </div>
              )}

              {canDeleteFromChat && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-8 gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={onShowDeleteDialog}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Conversa
                </Button>
              )}
            </div>
          </div>
        )}
    </>
  );

  return (
    <>
    {mobile ? (
      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        {/* Fundo branco como a caixinha do computador (o cinza do app deixava tudo apagado) */}
        <SheetContent side="bottom" className="p-0 bg-popover rounded-t-2xl max-h-[92dvh] overflow-y-auto">
          <div className="flex items-center h-12 px-5 pr-12 border-b border-border/40">
            <SheetTitle className="text-sm font-semibold">Ficha do lead</SheetTitle>
          </div>
          {panel}
        </SheetContent>
      </Sheet>
    ) : (
    <Popover>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className={cn(
          "p-0 rounded-2xl shadow-2xl shadow-black/10 border-border/30 overflow-hidden backdrop-blur-sm",
          // max-h usa o espaço real disponível na tela a partir de onde o card
          // abre (var do Radix); só vh deixava o card estourar o rodapé no iPad
          "w-[360px] max-h-[min(80vh,var(--radix-popover-content-available-height))] overflow-y-auto"
        )}
      >
        {panel}
      </PopoverContent>
    </Popover>
    )}

    {/* Event Form Dialog */}
    {linkedLead && (
      <EventFormDialog
        open={eventFormOpen}
        onOpenChange={handleEventFormOpenChange}
        initialData={linkedEventData}
        draftStorageKey={eventDraftStorageKey || undefined}
        units={units.filter(u => u.slug !== "trabalhe-conosco")}
        onSubmit={async (data) => {
          const user = (await supabase.auth.getUser()).data.user;
          if (!user || !currentCompany) return;
          // Mesma regra da Agenda: todos os campos e as parcelas (src/lib/eventSave.ts)
          const savedId = await saveEvent(
            { ...data, id: data.id || linkedEventData?.id },
            { companyId: currentCompany.id, userId: user.id, leadId: linkedLead.id },
          );
          if (!savedId) return;
          setHasLinkedEvent(true);
          setLinkedEventData(prev => prev ? { ...prev, ...data, id: savedId } : prev);
          if (data.id || linkedEventData?.id) handleEventFormOpenChange(false);
          return savedId;
        }}
      />
    )}
    <AlertDialog open={editPhoneOpen} onOpenChange={setEditPhoneOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar telefone do contato</AlertDialogTitle>
          <AlertDialogDescription>
            O telefone é o identificador do WhatsApp. Use apenas se o número foi cadastrado errado.
            Mensagens novas chegando do número antigo poderão criar uma nova conversa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Input
            value={editedPhone}
            onChange={(e) => setEditedPhone(e.target.value)}
            placeholder="Ex: 5511999998888 (com DDI + DDD)"
            disabled={isSavingPhone}
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Digite apenas números, incluindo DDI (55) e DDD.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSavingPhone}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); saveLeadPhone(); }} disabled={isSavingPhone}>
            {isSavingPhone ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
