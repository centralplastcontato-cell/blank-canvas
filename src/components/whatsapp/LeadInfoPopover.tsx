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
  ArrowRightLeft, Bot, Loader2, Pencil, Check, X, Trash2, UsersRound, Star, RotateCcw, PartyPopper, Package
} from "lucide-react";
import { EventFormDialog, EventFormData } from "@/components/agenda/EventFormDialog";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
}

interface Conversation {
  id: string;
  contact_name: string | null;
  contact_phone: string;
  remote_jid: string;
  bot_enabled: boolean | null;
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
  isCreatingLead: boolean;
  userId: string;
  currentUserName: string;
  onShowTransferDialog: () => void;
  onShowDeleteDialog: () => void;
  onShowShareToGroupDialog: () => void;
  onCreateAndClassifyLead: (status: string) => void;
  onToggleConversationBot: (conv: Conversation) => void;
  onReactivateBot: (conv: Conversation) => void;
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
  isCreatingLead,
  userId,
  currentUserName,
  onShowTransferDialog,
  onShowDeleteDialog,
  onShowShareToGroupDialog,
  onCreateAndClassifyLead,
  onToggleConversationBot,
  onReactivateBot,
  onToggleFavorite,
  onLeadNameChange,
  onLeadObsChange,
  onShowVisitDialog,
  mobile = false,
  visitRefreshKey = 0,
}: LeadInfoPopoverProps) {
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
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [latestVisit, setLatestVisit] = useState<{ data_visita: string; horario_visita: string | null; status_visita: string } | null>(null);
  const { currentCompany } = useCompany();
  const { units } = useCompanyUnits(currentCompany?.id);
  const eventDraftStorageKey = linkedLead && currentCompany?.id ? `whatsapp-event-form-draft:${currentCompany.id}:${linkedLead.id}` : null;
  const eventOpenStorageKey = linkedLead && currentCompany?.id ? `whatsapp-event-form-open:${currentCompany.id}:${linkedLead.id}` : null;

  const handleEventFormOpenChange = (nextOpen: boolean) => {
    setEventFormOpen(nextOpen);
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

  // Check if closed lead has linked event
  useEffect(() => {
    if (linkedLead && linkedLead.status === "fechado") {
      supabase
        .from("company_events")
        .select("*")
        .eq("lead_id", linkedLead.id)
        .limit(1)
        .then(({ data }) => {
          setHasLinkedEvent((data || []).length > 0);
          if (data && data.length > 0) {
            const ev = data[0];
            setLinkedEventData({
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
              child_name: ev.child_name || null,
              child_age: ev.child_age || null,
              child_birthdate: ev.child_birthdate || null,
              birthday_children: (ev.birthday_children as any) || null,
              parent_names: ev.parent_names || null,
              gifts: ev.gifts || null,
              extra_guest_value: ev.extra_guest_value || null,
              payment_method: ev.payment_method || null,
              payment_details: ev.payment_details as any || null,
              event_optionals: (ev.event_optionals as any) || null,
              is_permuta: ev.is_permuta ?? false,
              internal_notes: ev.internal_notes || null,
            });
          } else {
            setLinkedEventData(null);
          }
        });
    } else {
      setHasLinkedEvent(null);
      setLinkedEventData(null);
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
      return;
    }
    (supabase as any)
      .from("lead_visits")
      .select("data_visita, horario_visita, status_visita")
      .eq("lead_id", linkedLead.id)
      .order("data_visita", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        setLatestVisit(data || null);
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
      const newJid = `${newDigits}@s.whatsapp.net`;

      // 1) Update conversation phone + remote_jid
      const { error: convErr } = await supabase
        .from("wapi_conversations")
        .update({ contact_phone: newDigits, remote_jid: newJid })
        .eq("id", selectedConversation.id);
      if (convErr) throw convErr;

      // 2) Update linked lead, if any
      if (linkedLead) {
        // Check duplicate lead with same phone in same company
        const { data: dup } = await supabase
          .from("campaign_leads")
          .select("id, name")
          .eq("company_id", linkedLead.company_id)
          .eq("whatsapp", newDigits)
          .neq("id", linkedLead.id)
          .maybeSingle();

        if (dup) {
          toast({
            title: "Número já cadastrado",
            description: `Já existe um lead (${dup.name || "sem nome"}) com esse número nessa empresa. Exclua ou edite o lead existente antes de reaproveitar o número.`,
            variant: "destructive",
          });
          setIsSavingPhone(false);
          return;
        }

        const { error: leadErr } = await supabase
          .from("campaign_leads")
          .update({ whatsapp: newDigits })
          .eq("id", linkedLead.id);
        if (leadErr) throw leadErr;

        await supabase.from("lead_history").insert({
          lead_id: linkedLead.id,
          company_id: linkedLead.company_id,
          user_id: userId,
          user_name: currentUserName,
          action: "Alteração de telefone",
          old_value: oldPhone,
          new_value: newDigits,
        });
      }

      toast({ title: "Telefone atualizado", description: "O número foi alterado com sucesso." });
      setEditPhoneOpen(false);
    } catch (error: unknown) {
      console.error("Error updating phone:", error);
      const msg = error instanceof Error ? error.message : String(error);
      const friendly = msg.includes("duplicate key") || msg.includes("unique")
        ? "Já existe outro registro com esse número nessa empresa."
        : msg;
      toast({
        title: "Erro ao atualizar telefone",
        description: friendly,
        variant: "destructive",
      });
    } finally {
      setIsSavingPhone(false);
    }
  };



  return (
    <>
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className={cn(
          "p-0 rounded-2xl shadow-2xl shadow-black/10 border-border/30 overflow-hidden backdrop-blur-sm",
          mobile ? "w-[310px] max-h-[70vh] overflow-y-auto" : "w-[360px] max-h-[80vh] overflow-y-auto"
        )}
      >
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
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md" onClick={startEditingName} title="Renomear grupo">
                        <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </Button>
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
                        <h4 className="font-bold text-[15px] truncate tracking-tight">{linkedLead.name}</h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md opacity-60 hover:opacity-100" onClick={startEditingName} title="Editar nome">
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="text-[11px] text-muted-foreground/70 font-medium">{linkedLead.whatsapp}</p>
                        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-md opacity-60 hover:opacity-100" onClick={openEditPhone} title="Editar telefone">
                          <Pencil className="w-2.5 h-2.5" />
                        </Button>
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
                    {!isEditingObs && (
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
                      onClick={() => { setEditedObs(linkedLead.observacoes || ""); setIsEditingObs(true); }}
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

            {/* Bot + Actions */}
            <div className="px-5 pb-4 space-y-2.5">
              {/* Bot Toggle */}
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

                {linkedLead.status === "fechado" && hasLinkedEvent !== null && (
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
                      <InfoRow icon={MessageSquare}>{selectedConversation.contact_phone}</InfoRow>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-md" onClick={openEditPhone} title="Editar telefone">
                      <Pencil className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                    </Button>
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
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 rounded-md" onClick={startEditingName} title="Editar nome">
                            <Pencil className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
                          </Button>
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
      </PopoverContent>
    </Popover>

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
          // Normalize birthday_children like Agenda.tsx does
          const filteredChildren = (data.birthday_children || []).filter((c: any) => c.name || c.age || c.birthdate);
          const normalizedChildName = filteredChildren[0]?.name || data.child_name || null;
          const normalizedChildAge = filteredChildren[0]?.age || data.child_age || null;
          const normalizedChildBirthdate = filteredChildren[0]?.birthdate || data.child_birthdate || null;
          const normalizedOptionals = (data.event_optionals || []).filter((o: any) => o.name || (o.value != null && o.value > 0));

          if (linkedEventData?.id) {
            const updatePayload: Record<string, any> = {
                title: data.title,
                event_date: data.event_date,
                start_time: data.start_time || null,
                end_time: data.end_time || null,
                event_type: data.event_type,
                guest_count: data.guest_count,
                unit: data.unit || null,
                status: data.status,
                package_name: data.package_name || null,
                total_value: data.total_value,
                notes: data.notes || null,
                child_name: normalizedChildName,
                child_age: normalizedChildAge,
                child_birthdate: normalizedChildBirthdate,
                birthday_children: filteredChildren.length > 0 ? filteredChildren : null,
                parent_names: data.parent_names || null,
                gifts: data.gifts || null,
                extra_guest_value: data.extra_guest_value || null,
                payment_method: data.payment_method || null,
                payment_details: data.payment_details || null,
                data_fechamento_venda: data.data_fechamento_venda || null,
                vendedor_responsavel_id: data.vendedor_responsavel_id || null,
                event_optionals: normalizedOptionals,
                is_permuta: data.is_permuta ?? false,
                internal_notes: data.internal_notes || null,
              };
            const { error } = await (supabase as any)
              .from("company_events")
              .update(updatePayload)
              .eq("id", linkedEventData.id);
            if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Festa atualizada!" });
            // Refresh linkedEventData with saved values
            setLinkedEventData(prev => prev ? { ...prev, ...data, id: prev.id } : prev);
          } else {
            const insertPayload: Record<string, any> = {
                company_id: currentCompany.id,
                created_by: user.id,
                title: data.title,
                event_date: data.event_date,
                start_time: data.start_time || null,
                end_time: data.end_time || null,
                event_type: data.event_type,
                guest_count: data.guest_count,
                unit: data.unit || null,
                status: data.status,
                package_name: data.package_name || null,
                total_value: data.total_value,
                notes: data.notes || null,
                lead_id: linkedLead.id,
                child_name: normalizedChildName,
                child_age: normalizedChildAge,
                child_birthdate: normalizedChildBirthdate,
                birthday_children: filteredChildren.length > 0 ? filteredChildren : null,
                parent_names: data.parent_names || null,
                gifts: data.gifts || null,
                extra_guest_value: data.extra_guest_value || null,
                payment_method: data.payment_method || null,
                payment_details: data.payment_details || null,
                data_fechamento_venda: data.data_fechamento_venda || null,
                vendedor_responsavel_id: data.vendedor_responsavel_id || null,
                event_optionals: normalizedOptionals,
                is_permuta: data.is_permuta ?? false,
                internal_notes: data.internal_notes || null,
              };
            const { data: newEvent, error } = await (supabase as any)
              .from("company_events")
              .insert(insertPayload)
              .select("id")
              .single();
            if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }
            toast({ title: "Festa criada!" });
            setHasLinkedEvent(true);
            // Update linkedEventData with the new ID so EventFormDialog can link contractor data
            if (newEvent) {
              setLinkedEventData(prev => prev ? { ...prev, ...data, id: newEvent.id } : prev);
              return newEvent.id;
            }
          }
          handleEventFormOpenChange(false);
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
