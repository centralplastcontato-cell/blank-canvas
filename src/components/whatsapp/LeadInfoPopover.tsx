 import { useState } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { insertWithCompany } from "@/lib/supabase-helpers";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
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
  mobile?: boolean;
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
  mobile = false,
}: LeadInfoPopoverProps) {
   const [isEditingName, setIsEditingName] = useState(false);
   const [editedName, setEditedName] = useState("");
   const [isSavingName, setIsSavingName] = useState(false);
 
   const isGroup = selectedConversation.remote_jid.includes('@g.us');
 
   const startEditingName = () => {
     if (linkedLead) {
       setEditedName(linkedLead.name);
       setIsEditingName(true);
     }
   };
 
   const cancelEditingName = () => {
     setIsEditingName(false);
     setEditedName("");
   };
 
   const saveLeadName = async () => {
     if (!linkedLead || !editedName.trim()) return;
     
     const trimmedName = editedName.trim();
     if (trimmedName === linkedLead.name) {
       cancelEditingName();
       return;
     }
 
     setIsSavingName(true);
 
     try {
       // Update lead name
       const { error: leadError } = await supabase
         .from("campaign_leads")
         .update({ name: trimmedName })
         .eq("id", linkedLead.id);
 
       if (leadError) throw leadError;
 
       // Update conversation contact_name to keep sync
       const { error: convError } = await supabase
         .from("wapi_conversations")
         .update({ contact_name: trimmedName })
         .eq("id", selectedConversation.id);
 
       if (convError) throw convError;
 
       // Add history entry
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
   };
 
   const handleKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === "Enter") {
       e.preventDefault();
       saveLeadName();
     } else if (e.key === "Escape") {
       cancelEditingName();
     }
   };
 
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
      default: return status;
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
       <PopoverContent align="end" className={cn("p-3", mobile ? "w-72" : "w-80")}>
          {isGroup ? (
            // Group chat - show favorite and delete options
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UsersRound className="w-4 h-4 text-muted-foreground shrink-0" />
                  <h4 className="font-semibold text-sm truncate">
                    {selectedConversation.contact_name || "Grupo"}
                  </h4>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
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
              <div className="text-xs text-muted-foreground">
                <span className="truncate block">{selectedConversation.contact_phone}</span>
              </div>
              
              {canDeleteFromChat && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={onShowDeleteDialog}
                >
                  <Trash2 className="w-3 h-3" />
                  Excluir Grupo
                </Button>
              )}
            </div>
          ) : linkedLead ? (
           <div className="space-y-3">
             {/* Header with name and status */}
             <div className="flex items-center justify-between gap-2">
               {isEditingName ? (
                 <div className="flex items-center gap-1 flex-1">
                   <Input
                     value={editedName}
                     onChange={(e) => setEditedName(e.target.value)}
                     onKeyDown={handleKeyDown}
                     className="h-7 text-sm"
                     autoFocus
                     disabled={isSavingName}
                   />
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-7 w-7 shrink-0"
                     onClick={saveLeadName}
                     disabled={isSavingName}
                   >
                     {isSavingName ? (
                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
                     ) : (
                       <Check className="w-3.5 h-3.5 text-green-600" />
                     )}
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-7 w-7 shrink-0"
                     onClick={cancelEditingName}
                     disabled={isSavingName}
                   >
                     <X className="w-3.5 h-3.5 text-destructive" />
                   </Button>
                 </div>
               ) : (
                 <div className="flex items-center gap-1 min-w-0 flex-1">
                   <h4 className="font-semibold text-sm truncate">{linkedLead.name}</h4>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="h-6 w-6 shrink-0"
                     onClick={startEditingName}
                     title="Editar nome"
                   >
                     <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                   </Button>
                 </div>
               )}
               <Badge 
                 className={cn(
                   "text-[10px] h-5 shrink-0",
                   getStatusBadgeClass(linkedLead.status)
                 )}
               >
                 {getStatusLabel(linkedLead.status)}
               </Badge>
             </div>
             
             {/* Lead details */}
             <div className="grid gap-2 text-xs">
               <div className="flex items-center gap-2 text-muted-foreground">
                 <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                 <span className="truncate">{linkedLead.whatsapp}</span>
               </div>
               
                {linkedLead.created_at && !isNaN(new Date(linkedLead.created_at).getTime()) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Chegou em {format(new Date(linkedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
               
               {linkedLead.unit && (
                 <div className="flex items-center gap-2 text-muted-foreground">
                   <MapPin className="w-3.5 h-3.5 shrink-0" />
                   <span>{linkedLead.unit}</span>
                 </div>
               )}
               
               {(linkedLead.month || linkedLead.day_preference) && (
                 <div className="flex items-center gap-2 text-muted-foreground">
                   <Calendar className="w-3.5 h-3.5 shrink-0" />
                   <span>
                     {[
                       linkedLead.month,
                       linkedLead.day_of_month && `dia ${linkedLead.day_of_month}`,
                       linkedLead.day_preference
                     ].filter(Boolean).join(' • ')}
                   </span>
                 </div>
               )}
               
               {linkedLead.guests && (
                 <div className="flex items-center gap-2 text-muted-foreground">
                   <Users className="w-3.5 h-3.5 shrink-0" />
                   <span>{linkedLead.guests} convidados</span>
                 </div>
               )}
               
               {linkedLead.observacoes && (
                 <div className="pt-2 border-t">
                   <p className="text-muted-foreground italic line-clamp-3">{linkedLead.observacoes}</p>
                 </div>
               )}
             </div>
             
              {/* Share to Group button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-7 gap-2"
                onClick={onShowShareToGroupDialog}
              >
                <UsersRound className="w-3 h-3" />
                Compartilhar em Grupo
              </Button>

              {/* Transfer button */}
              {canTransferLeads && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7 gap-2"
                  onClick={onShowTransferDialog}
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  Transferir Lead
                </Button>
              )}
             
             {canDeleteFromChat && (
               <Button 
                 variant="outline" 
                 size="sm" 
                 className="w-full text-xs h-7 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                 onClick={onShowDeleteDialog}
               >
                 <Trash2 className="w-3 h-3" />
                 Excluir Lead
               </Button>
             )}
           </div>
         ) : (
           <div className="space-y-3">
             <div className="flex items-center gap-2 text-destructive">
               <Info className="w-4 h-4" />
               <h4 className="font-semibold text-sm">Contato não qualificado</h4>
             </div>
             <p className="text-xs text-muted-foreground">
               Este contato ainda não foi classificado como lead. Clique em um status para criar e classificar.
             </p>
             <div className="grid gap-2 text-xs">
               <div className="flex items-center gap-2 text-muted-foreground">
                 <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                 <span className="truncate">{selectedConversation.contact_phone}</span>
               </div>
               {selectedConversation.contact_name && (
                 <div className="flex items-center gap-2 text-muted-foreground">
                   <Users className="w-3.5 h-3.5 shrink-0" />
                   <span>{selectedConversation.contact_name}</span>
                 </div>
               )}
               {selectedInstance?.unit && (
                 <div className="flex items-center gap-2 text-muted-foreground">
                   <MapPin className="w-3.5 h-3.5 shrink-0" />
                   <span>{selectedInstance.unit}</span>
                 </div>
               )}
             </div>
             
             {/* Qualification Status Buttons */}
             <div className="pt-2 border-t">
               <span className="text-xs font-medium text-muted-foreground block mb-2">Qualificar como:</span>
               <div className="flex flex-wrap gap-1.5">
                 {statusOptions.map((statusOption) => (
                   <Button
                     key={statusOption.value}
                     variant="outline"
                     size="sm"
                     className="h-6 text-[10px] gap-1 px-2"
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
             </div>

             {/* Bot Toggle */}
             <div className="pt-2 border-t flex items-center justify-between gap-2">
               <span className="text-xs text-muted-foreground">Bot:</span>
               <div className="flex items-center gap-1">
                 <Button
                   variant="outline"
                   size="sm"
                   className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                   onClick={() => onReactivateBot(selectedConversation)}
                   title="Reativar bot e enviar mensagem de retomada"
                 >
                   <RotateCcw className="w-3 h-3" />
                   Reativar
                 </Button>
                 <Button
                   variant={selectedConversation.bot_enabled !== false ? "secondary" : "ghost"}
                   size="sm"
                   className="h-7 text-xs gap-1"
                   onClick={() => onToggleConversationBot(selectedConversation)}
                 >
                   <Bot className="w-3 h-3" />
                   {selectedConversation.bot_enabled !== false ? "Ativo" : "Inativo"}
                 </Button>
               </div>
             </div>
            
            {/* Delete button for unqualified contacts */}
            {canDeleteFromChat && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-7 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={onShowDeleteDialog}
              >
                <Trash2 className="w-3 h-3" />
                Excluir Conversa
              </Button>
            )}
           </div>
         )}
       </PopoverContent>
     </Popover>
   );
 }