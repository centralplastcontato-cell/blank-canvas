import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { 
  Info, MessageSquare, Clock, MapPin, Calendar, Users, 
  ArrowRightLeft, Bot, Loader2, Pencil, Check, X, Trash2, UsersRound, Star, RotateCcw
} from "lucide-react";
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
  mobile?: boolean;
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
function PopoverSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</h5>
      )}
      {children}
    </div>
  );
}

/* ── Info row helper ── */
function InfoRow({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-muted/50 shrink-0">
        <Icon className="w-3.5 h-3.5" />
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
  mobile = false,
}: LeadInfoPopoverProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [editedObs, setEditedObs] = useState("");
  const [isSavingObs, setIsSavingObs] = useState(false);

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

  return (
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
          "p-0 rounded-2xl shadow-lg border-border/50 overflow-hidden",
          mobile ? "w-[300px]" : "w-[340px]"
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
          /* ── QUALIFIED LEAD VIEW ── */
          <div className="divide-y divide-border/50">
            {/* Header */}
            <div className="p-4 pb-3">
              <div className="flex items-center justify-between gap-2">
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
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <h4 className="font-semibold text-sm truncate">{linkedLead.name}</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-md" onClick={startEditingName} title="Editar nome">
                      <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  </div>
                )}
                <Badge className={cn("text-[10px] h-5 shrink-0 rounded-md", getStatusBadgeClass(linkedLead.status))}>
                  {getStatusLabel(linkedLead.status)}
                </Badge>
              </div>
            </div>
            
            {/* Dados do Cliente */}
            <div className="p-4 py-3">
              <PopoverSection title="Dados do Cliente">
                <div className="space-y-1.5">
                  <InfoRow icon={MessageSquare}>{linkedLead.whatsapp}</InfoRow>
                  {linkedLead.created_at && !isNaN(new Date(linkedLead.created_at).getTime()) && (
                    <InfoRow icon={Clock}>
                      Chegou em {format(new Date(linkedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </InfoRow>
                  )}
                  {linkedLead.unit && (
                    <InfoRow icon={MapPin}>{linkedLead.unit}</InfoRow>
                  )}
                </div>
              </PopoverSection>
            </div>

            {/* Dados da Festa */}
            {(linkedLead.month || linkedLead.day_preference || linkedLead.guests) && (
              <div className="p-4 py-3">
                <PopoverSection title="Dados da Festa">
                  <div className="space-y-1.5">
                    {(linkedLead.month || linkedLead.day_preference) && (
                      <InfoRow icon={Calendar}>
                        {[
                          linkedLead.month,
                          linkedLead.day_of_month && `dia ${linkedLead.day_of_month}`,
                          linkedLead.day_preference
                        ].filter(Boolean).join(' • ')}
                      </InfoRow>
                    )}
                    {linkedLead.guests && (
                      <InfoRow icon={Users}>{linkedLead.guests} convidados</InfoRow>
                    )}
                  </div>
                </PopoverSection>
              </div>
            )}

            {/* Observações */}
            <div className="p-4 py-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Observações</h5>
                  {!isEditingObs && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md"
                      onClick={() => {
                        setEditedObs(linkedLead.observacoes || "");
                        setIsEditingObs(true);
                      }}
                      title="Editar observações"
                    >
                      <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>
                {isEditingObs ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedObs}
                      onChange={(e) => setEditedObs(e.target.value)}
                      placeholder="Adicione observações sobre este lead..."
                      className="min-h-[80px] text-xs rounded-lg resize-none"
                      autoFocus
                      disabled={isSavingObs}
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => setIsEditingObs(false)}
                        disabled={isSavingObs}
                      >
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        disabled={isSavingObs}
                        onClick={async () => {
                          const trimmed = editedObs.trim();
                          if (trimmed === (linkedLead.observacoes || "")) {
                            setIsEditingObs(false);
                            return;
                          }
                          setIsSavingObs(true);
                          try {
                            const { error } = await supabase
                              .from("campaign_leads")
                              .update({ observacoes: trimmed || null })
                              .eq("id", linkedLead.id);
                            if (error) throw error;

                            await supabase.from("lead_history").insert({
                              lead_id: linkedLead.id,
                              user_id: userId,
                              user_name: currentUserName,
                              action: "Alteração de observações",
                              old_value: linkedLead.observacoes || null,
                              new_value: trimmed || null,
                            });

                            onLeadObsChange?.(trimmed);
                            setIsEditingObs(false);
                            toast({ title: "Observações salvas" });
                          } catch (err: unknown) {
                            console.error("Error saving obs:", err);
                            toast({
                              title: "Erro ao salvar",
                              description: err instanceof Error ? err.message : "Tente novamente.",
                              variant: "destructive",
                            });
                          } finally {
                            setIsSavingObs(false);
                          }
                        }}
                      >
                        {isSavingObs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "text-xs leading-relaxed line-clamp-4 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors",
                      linkedLead.observacoes ? "text-muted-foreground italic" : "text-muted-foreground/50"
                    )}
                    onClick={() => {
                      setEditedObs(linkedLead.observacoes || "");
                      setIsEditingObs(true);
                    }}
                  >
                    {linkedLead.observacoes || "Adicione observações sobre este lead..."}
                  </p>
                )}
              </div>
            </div>

            {/* Ações */}
            <div className="p-4 pt-3 space-y-2">
              {/* Bot Toggle */}
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

              <div className="space-y-1.5 pt-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-8 gap-2 rounded-xl"
                  onClick={onShowShareToGroupDialog}
                >
                  <UsersRound className="w-3.5 h-3.5" />
                  Compartilhar em Grupo
                </Button>

                {canTransferLeads && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs h-8 gap-2 rounded-xl"
                    onClick={onShowTransferDialog}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Transferir Lead
                  </Button>
                )}
              
                {canDeleteFromChat && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs h-8 gap-2 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
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
                  <InfoRow icon={MessageSquare}>{selectedConversation.contact_phone}</InfoRow>
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
  );
}
