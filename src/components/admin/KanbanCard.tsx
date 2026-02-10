import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lead, LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  User,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
  MoreVertical,
  Phone,
  AlertCircle,
  ArrowRightLeft,
  Trash2,
  CalendarCheck,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanCardProps {
  lead: Lead;
  responsavelName: string | null;
  canEdit: boolean;
  canEditName: boolean;
  canEditDescription: boolean;
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onNameUpdate: (leadId: string, newName: string) => Promise<void>;
  onDescriptionUpdate: (leadId: string, newDescription: string) => Promise<void>;
  onTransfer?: (lead: Lead) => void;
  onDelete?: (leadId: string) => Promise<void>;
  canDelete?: boolean;
  getPreviousStatus: (status: LeadStatus) => LeadStatus | null;
  getNextStatus: (status: LeadStatus) => LeadStatus | null;
}

export function KanbanCard({
  lead,
  responsavelName,
  canEdit,
  canEditName,
  canEditDescription,
  onLeadClick,
  onStatusChange,
  onNameUpdate,
  onDescriptionUpdate,
  onTransfer,
  onDelete,
  canDelete,
  getPreviousStatus,
  getNextStatus,
}: KanbanCardProps) {
  const navigate = useNavigate();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(lead.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(lead.observacoes || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasPrev = getPreviousStatus(lead.status) !== null;
  const hasNext = getNextStatus(lead.status) !== null;
  
  // Check for incomplete lead data
  const missingFields: string[] = [];
  if (!lead.unit) missingFields.push("Unidade");
  if (!lead.month) missingFields.push("Data");
  if (!lead.guests) missingFields.push("Convidados");
  const isIncomplete = missingFields.length > 0;

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDescription && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditingDescription]);

  const handleOpenInternalChat = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;
    navigate(`/atendimento?phone=${phoneWithCountry}`);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("leadId", lead.id);
  };

  const handleMoveLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevStatus = getPreviousStatus(lead.status);
    if (prevStatus && canEdit) {
      onStatusChange(lead.id, prevStatus);
    }
  };

  const handleMoveRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = getNextStatus(lead.status);
    if (nextStatus && canEdit) {
      onStatusChange(lead.id, nextStatus);
    }
  };

  // Name editing handlers
  const handleStartEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedName(lead.name);
    setIsEditingName(true);
  };

  const handleCancelEditName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(false);
    setEditedName(lead.name);
  };

  const handleSaveName = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedName.trim() === "" || editedName === lead.name) {
      setIsEditingName(false);
      setEditedName(lead.name);
      return;
    }

    setIsSaving(true);
    try {
      await onNameUpdate(lead.id, editedName.trim());
      setIsEditingName(false);
    } catch {
      setEditedName(lead.name);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDownName = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleSaveName(e as unknown as React.MouseEvent);
    } else if (e.key === "Escape") {
      setIsEditingName(false);
      setEditedName(lead.name);
    }
  };

  // Description editing handlers
  const handleStartEditDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedDescription(lead.observacoes || "");
    setIsEditingDescription(true);
  };

  const handleCancelEditDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingDescription(false);
    setEditedDescription(lead.observacoes || "");
  };

  const handleSaveDescription = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editedDescription === (lead.observacoes || "")) {
      setIsEditingDescription(false);
      return;
    }

    setIsSaving(true);
    try {
      await onDescriptionUpdate(lead.id, editedDescription.trim());
      setIsEditingDescription(false);
    } catch {
      setEditedDescription(lead.observacoes || "");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDownDescription = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      setIsEditingDescription(false);
      setEditedDescription(lead.observacoes || "");
    }
  };

  const isEditing = isEditingName || isEditingDescription;

  return (
    <div
      draggable={canEdit && !isEditing}
      onDragStart={handleDragStart}
      onClick={() => !isEditing && onLeadClick(lead)}
      className={`
        bg-gradient-to-br from-card via-card to-muted/10 rounded-xl border border-border/40 p-3.5 
        cursor-pointer transition-all duration-300 ease-out
        hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1
        ${canEdit && !isEditing ? "cursor-grab active:cursor-grabbing active:shadow-2xl active:scale-[1.02]" : ""}
        shadow-md relative overflow-hidden backdrop-blur-sm
        before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/[0.03] before:via-transparent before:to-secondary/[0.02] before:pointer-events-none
        after:absolute after:inset-0 after:rounded-xl after:ring-1 after:ring-inset after:ring-white/5 after:pointer-events-none
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            {canEdit && !isEditing && (
              <GripVertical className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            )}
            
            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <Input
                  ref={inputRef}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleKeyDownName}
                  className="h-7 text-sm py-0 px-2 flex-1 min-w-0"
                  disabled={isSaving}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary hover:text-primary/80 flex-shrink-0"
                  onClick={handleSaveName}
                  disabled={isSaving}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive/80 flex-shrink-0"
                  onClick={handleCancelEditName}
                  disabled={isSaving}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <p className="font-semibold text-sm truncate flex-1 min-w-0" title={lead.name}>{lead.name}</p>
                {lead.has_scheduled_visit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-full animate-pulse">
                        <CalendarCheck className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Visita</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>🗓️ Visita agendada pelo bot</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {lead.has_follow_up && !lead.has_follow_up_2 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-full">
                        <RefreshCw className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">F-Up</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>✅ Follow-up #1 enviado</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {lead.has_follow_up_2 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-full">
                        <RefreshCw className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">F-Up 2</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>✅ Follow-up #2 enviado</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {lead.has_return && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 border border-violet-400/40 rounded-full shadow-sm shadow-violet-500/10 animate-pulse">
                        <RotateCcw className="w-3 h-3 text-violet-500" />
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Retornou</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs max-w-[200px]">
                      <p className="font-semibold">🔄 Lead retornou pela LP</p>
                      <p className="text-muted-foreground mt-0.5">Este lead já preencheu o formulário antes e voltou com interesse renovado!</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {isIncomplete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>Faltando: {missingFields.join(", ")}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {canEditName && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={handleStartEditName}
                    title="Editar nome"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {(lead.unit || lead.month || lead.guests) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {lead.unit && (
                <span className="text-xs text-foreground/80 inline-flex items-center gap-1.5 bg-gradient-to-r from-primary/15 to-primary/5 px-2.5 py-1 rounded-lg border border-primary/20 font-medium shadow-sm">
                  <span className="text-primary">📍</span> {lead.unit}
                </span>
              )}
              {lead.month && (
                <span className="text-xs text-foreground/80 inline-flex items-center gap-1.5 bg-gradient-to-r from-secondary/20 to-secondary/5 px-2.5 py-1 rounded-lg border border-secondary/20 font-medium shadow-sm">
                  <span className="text-secondary-foreground">📅</span> {lead.day_of_month || lead.day_preference || "-"}/
                  {lead.month}
                </span>
              )}
              {lead.guests && (
                <span className="text-xs text-foreground/80 inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-medium shadow-sm">
                  <span>👥</span> {lead.guests}
                </span>
              )}
            </div>
          )}

          {responsavelName && (
            <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 rounded-lg w-fit border border-primary/20 shadow-sm">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs text-primary font-semibold truncate">
                {responsavelName}
              </span>
            </div>
          )}

          {/* Description / Observações section - Premium style */}
          {isEditingDescription ? (
            <div className="mt-3" onClick={(e) => e.stopPropagation()}>
              <Textarea
                ref={textareaRef}
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={handleKeyDownDescription}
                className="text-xs min-h-[60px] resize-none bg-muted/30 border-muted"
                placeholder="Adicione observações sobre este lead..."
                disabled={isSaving}
              />
              <div className="flex items-center gap-1 mt-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-primary hover:text-primary/80"
                  onClick={handleSaveDescription}
                  disabled={isSaving}
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive/80"
                  onClick={handleCancelEditDescription}
                  disabled={isSaving}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              {lead.observacoes ? (
                <div className="relative bg-gradient-to-br from-amber-500/10 via-muted/30 to-muted/10 rounded-lg p-3 border border-amber-500/20 shadow-inner">
                  <div className="absolute -top-2 left-3 bg-card px-2 py-0.5 rounded-full border border-amber-500/20 shadow-sm">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-amber-600" />
                      <span className="text-[10px] font-medium text-amber-600">Nota</span>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed mt-1">
                    {lead.observacoes}
                  </p>
                  {canEditDescription && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 hover:opacity-100 bg-card/90 hover:bg-card shadow-sm"
                      onClick={handleStartEditDescription}
                      title="Editar observação"
                    >
                      <Pencil className="w-2.5 h-2.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ) : (
                canEditDescription && (
                  <button
                    onClick={handleStartEditDescription}
                    className="w-full text-left bg-muted/20 hover:bg-muted/40 border border-dashed border-muted-foreground/20 hover:border-primary/30 rounded-lg p-2.5 transition-all duration-200 group/obs"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/obs:text-primary/50 transition-colors" />
                      <span className="text-xs text-muted-foreground/50 group-hover/obs:text-muted-foreground transition-colors">
                        Adicionar observação...
                      </span>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleOpenInternalChat(lead.whatsapp);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Abrir WhatsApp
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(lead.whatsapp);
              }}
            >
              <Phone className="w-4 h-4 mr-2" />
              Copiar telefone
            </DropdownMenuItem>
            
            {canEditName && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleStartEditName}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar nome
                </DropdownMenuItem>
              </>
            )}
            
            {canEditDescription && (
              <DropdownMenuItem
                onClick={handleStartEditDescription}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Editar observações
              </DropdownMenuItem>
            )}
            
            {canEdit && onTransfer && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onTransfer(lead);
                  }}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transferir lead
                </DropdownMenuItem>
              </>
            )}
            
            {canDelete && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Tem certeza que deseja excluir o lead "${lead.name}"? Esta ação não pode ser desfeita.`)) {
                      onDelete(lead.id);
                    }
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir lead
                </DropdownMenuItem>
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onLeadClick(lead);
              }}
            >
              <User className="w-4 h-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground font-medium px-2 py-0.5 bg-muted/30 rounded-md">
          {format(new Date(lead.created_at), "dd/MM/yy 'às' HH:mm", {
            locale: ptBR,
          })}
        </p>
        
        {canEdit && (
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-primary/20 hover:text-primary rounded-md transition-colors"
              onClick={handleMoveLeft}
              disabled={!hasPrev}
              title={hasPrev ? `Mover para ${LEAD_STATUS_LABELS[getPreviousStatus(lead.status)!]}` : undefined}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-primary/20 hover:text-primary rounded-md transition-colors"
              onClick={handleMoveRight}
              disabled={!hasNext}
              title={hasNext ? `Mover para ${LEAD_STATUS_LABELS[getNextStatus(lead.status)!]}` : undefined}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
